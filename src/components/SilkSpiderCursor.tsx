import * as React from "react"
import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js"
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js"

export interface SilkSpiderCursorProps {
  anchorSelector?: string

  modelSrc?: string

  topTextureSrc?: string

  faceTextureSrc?: string

  size?: number

  silkColor?: string

  bounceColor?: string

  shadowColor?: string

  maxThreads?: number

  fly?: boolean

  sleepAfter?: number

  seedWebs?: number

  enter?: boolean

  clearKeys?: string[]

  position?: "fixed" | "absolute"
  zIndex?: number

  maxDpr?: number
  className?: string
}

const MAXP = 9000
const MAXC = 9000

type AnchorRef = { el: Element | null; u: number; v: number; sx: number; sy: number }

type Thread = {
  id: number
  parts: number[]
  cons: number[]
  owned: number[]
  state: number
  alpha: number
  born: number
  dieT: number
  dews: number[]
  anchorEl: Element | null
  hostIds: number[]
}

function createSilk() {
  const X = new Float32Array(MAXP)
  const Y = new Float32Array(MAXP)
  const PX = new Float32Array(MAXP)
  const PY = new Float32Array(MAXP)
  const INV = new Float32Array(MAXP)
  const PIN = new Int32Array(MAXP).fill(-1)
  const CA = new Int32Array(MAXC)
  const CB = new Int32Array(MAXC)
  const CR = new Float32Array(MAXC)
  const CON = new Uint8Array(MAXC)
  const freeP = [] as number[]
  const freeC = [] as number[]
  for (let i = MAXP - 1; i >= 0; i--) freeP.push(i)
  for (let i = MAXC - 1; i >= 0; i--) freeC.push(i)
  const anchors = [] as (AnchorRef | null)[]
  const freeA = [] as number[]
  const threads = [] as Thread[]
  let nextId = 1

  const addAnchor = (a: AnchorRef) => {
    const id = freeA.length ? (freeA.pop() as number) : anchors.length
    anchors[id] = a
    return id
  }

  const hw = { p: 0, c: 0 }
  const particle = (x: number, y: number, anchor: number) => {
    const i = freeP.pop()
    if (i === undefined) return -1
    hw.p = Math.max(hw.p, i + 1)
    X[i] = PX[i] = x
    Y[i] = PY[i] = y
    PIN[i] = anchor
    INV[i] = anchor >= 0 ? 0 : 1
    return i
  }
  const constraint = (a: number, b: number, rest: number) => {
    const c = freeC.pop()
    if (c === undefined) return -1
    hw.c = Math.max(hw.c, c + 1)
    CA[c] = a
    CB[c] = b
    CR[c] = rest
    CON[c] = 1
    return c
  }
  const freeThread = (t: Thread) => {
    for (const c of t.cons) {
      CON[c] = 0
      freeC.push(c)
    }
    for (const p of t.owned) {
      const a = PIN[p]
      if (a >= 0) {
        anchors[a] = null
        freeA.push(a)
      }
      PIN[p] = -1
      INV[p] = 0
      freeP.push(p)
    }
    t.cons.length = 0
    t.owned.length = 0
    t.parts.length = 0
  }
  const newThread = (anchorEl: Element | null) => {
    const t: Thread = {
      id: nextId++,
      parts: [],
      cons: [],
      owned: [],
      state: 0,
      alpha: 1,
      born: 0,
      dieT: 0,
      dews: [],
      anchorEl,
      hostIds: [],
    }
    threads.push(t)
    return t
  }
  const length = (t: Thread) => {
    let L = 0
    for (let k = 1; k < t.parts.length; k++) {
      const a = t.parts[k - 1],
        b = t.parts[k]
      L += Math.hypot(X[b] - X[a], Y[b] - Y[a])
    }
    return L
  }
  const unpin = (p: number) => {
    const a = PIN[p]
    if (a >= 0) {
      anchors[a] = null
      freeA.push(a)
    }
    PIN[p] = -1
    INV[p] = 1
  }

  const span = (t: Thread, a: number, b: number, seg: number, slack: number) => {
    const d = Math.hypot(X[b] - X[a], Y[b] - Y[a])
    const n = Math.max(2, Math.min(36, Math.round(d / seg)))
    const rest = (d * (1 + slack)) / n
    let prev = a
    t.parts.push(a)
    for (let k = 1; k < n; k++) {
      const f = k / n
      const sag = Math.sin(Math.PI * f) * d * slack * 0.9
      const p = particle(X[a] + (X[b] - X[a]) * f, Y[a] + (Y[b] - Y[a]) * f + sag, -1)
      if (p < 0) break
      t.owned.push(p)
      t.parts.push(p)
      t.cons.push(constraint(prev, p, rest))
      prev = p
    }
    t.parts.push(b)
    t.cons.push(constraint(prev, b, rest))
  }
  const sprinkleDew = (t: Thread, rand: () => number, scale: number) => {
    t.dews.length = 0
    const L = length(t)
    const n = Math.floor(L / (24 + rand() * 30))
    for (let k = 0; k < n; k++) {
      const big = rand() < 0.18
      t.dews.push(1 + rand() * (t.parts.length - 3), (big ? 1.5 + rand() * 1.1 : 0.55 + rand() * 0.75) * scale)
    }
  }

  return {
    X,
    Y,
    PX,
    PY,
    INV,
    PIN,
    CA,
    CB,
    CR,
    CON,
    anchors,
    threads,
    hw,
    addAnchor,
    particle,
    constraint,
    freeThread,
    newThread,
    length,
    unpin,
    span,
    sprinkleDew,
  }
}
type Silk = ReturnType<typeof createSilk>

function stepSilk(s: Silk, dt: number, time: number, rects: Map<Element, DOMRect>, iters: number) {
  const { X, Y, PX, PY, INV, PIN, CA, CB, CR, CON, anchors, hw } = s
  const g = 620 * dt * dt
  for (let i = 0; i < hw.p; i++) {
    const a = PIN[i]
    if (a >= 0) {
      const an = anchors[a]
      if (!an) continue
      if (an.el) {
        const r = rects.get(an.el)
        if (r) {
          X[i] = r.left + an.u * r.width
          Y[i] = r.top + an.v * r.height
        }
      } else {
        X[i] = an.sx
        Y[i] = an.sy
      }
      PX[i] = X[i]
      PY[i] = Y[i]
      continue
    }
    if (INV[i] === 0) continue
    const vx = (X[i] - PX[i]) * 0.986
    const vy = (Y[i] - PY[i]) * 0.986
    PX[i] = X[i]
    PY[i] = Y[i]
    const wind = Math.sin(time * 0.9 + X[i] * 0.006 + Y[i] * 0.004) * 9 * dt * dt
    X[i] += vx + wind
    Y[i] += vy + g * INV[i]
  }
  for (let it = 0; it < iters; it++) {
    for (let c = 0; c < hw.c; c++) {
      if (!CON[c]) continue
      const a = CA[c],
        b = CB[c]
      const wa = INV[a],
        wb = INV[b]
      const w = wa + wb
      if (w === 0) continue
      const dx = X[b] - X[a],
        dy = Y[b] - Y[a]
      const d = Math.sqrt(dx * dx + dy * dy) || 1e-6

      if (d <= CR[c]) continue
      const k = ((d - CR[c]) / d / w) * 0.92
      X[a] += dx * k * wa
      Y[a] += dy * k * wa
      X[b] -= dx * k * wb
      Y[b] -= dy * k * wb
    }
  }
}

function solveKnee(
  hx: number,
  hy: number,
  hz: number,
  fx: number,
  fy: number,
  fz: number,
  l1: number,
  l2: number,
  px0: number,
  py0: number,
  pz0: number,
  out: number[],
) {
  let dx = fx - hx,
    dy = fy - hy,
    dz = fz - hz
  let d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6
  const maxD = (l1 + l2) * 0.999
  const minD = Math.abs(l1 - l2) * 1.001 + 1e-6
  const dc = Math.min(maxD, Math.max(minD, d))
  dx /= d
  dy /= d
  dz /= d
  d = dc
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d)
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a))

  let px = px0,
    py = py0,
    pz = pz0
  const dot = px * dx + py * dy + pz * dz
  px -= dx * dot
  py -= dy * dot
  pz -= dz * dot
  const pl = Math.sqrt(px * px + py * py + pz * pz) || 1
  out[0] = hx + dx * a + (px / pl) * h
  out[1] = hy + dy * a + (py / pl) * h
  out[2] = hz + dz * a + (pz / pl) * h
  out[3] = hx + dx * d
  out[4] = hy + dy * d
  out[5] = hz + dz * d
  return out
}

const GROUP = [0, 1, 0, 1, 1, 0, 1, 0]

type Leg = {
  hip: THREE.Vector3
  knee: THREE.Vector3
  foot: THREE.Vector3
  l1: number
  l2: number
  b1: THREE.Bone
  b2: THREE.Bone
  restN: THREE.Vector3
  rd: THREE.Vector3
  rp: THREE.Vector3

  fx: number
  fy: number
  fz: number
  sx: number
  sy: number
  t: number
  stepping: boolean
  dur: number
}

type Rig = {
  root: THREE.Group
  legs: Leg[]
  abdomen: THREE.Bone
  uniforms: { uBlink: { value: number } }
  spinneret: THREE.Vector3
  headFront: THREE.Vector3
  bodyLen: number
}

const MODEL_FORWARD = new THREE.Vector3(0, 0, 1)
const MODEL_UP = new THREE.Vector3(0, 1, 0)

const SKIN_VERT = `
attribute vec3 mpos;
attribute vec2 _w;
varying vec3 vMpos;
varying vec2 vW;
`
const SKIN_FRAG = `
uniform sampler2D uTop;
uniform sampler2D uFront;
uniform float uBlink;
uniform vec4 uEye;
uniform float uProj;
varying vec3 vMpos;
varying vec2 vW;
`
const SKIN_COLOR = `
vec4 diffuseColor = vec4( diffuse, opacity );
vec3 base = vColor.rgb;
float rough = vColor.a;
if (uProj > 0.5) {
  vec2 ut = vec2(vMpos.x / 0.98 * 0.5 + 0.5, 0.5 - vMpos.z / 0.98 * 0.5);
  vec2 uf = vec2(vMpos.x / 0.48 * 0.5 + 0.5, vMpos.y / 0.4 * 0.5 + 0.5);
  vec3 ct = texture2D(uTop, ut).rgb;
  vec3 cf = texture2D(uFront, uf).rgb;
  base = base * max(0.0, 1.0 - vW.x - vW.y) + ct * vW.x + cf * vW.y;
  float inEye = step(uEye.x, vMpos.y) * step(vMpos.y, uEye.y) * step(abs(vMpos.x), uEye.z) * step(uEye.w, vMpos.z);
  float lidLine = mix(uEye.y + 0.01, uEye.x - 0.01, uBlink);
  if (inEye > 0.5 && vMpos.y > lidLine) {
    vec3 lid = texture2D(uFront, vec2(uf.x, (uEye.y + 0.035) / 0.4 * 0.5 + 0.5)).rgb;
    float shade = 0.75 + 0.25 * smoothstep(lidLine, lidLine + 0.04, vMpos.y);
    base = lid * shade;
    rough = 0.9;
  }
}
diffuseColor.rgb = base;
`

const toFloat = (a: THREE.BufferAttribute | THREE.InterleavedBufferAttribute) => {
  const out = new Float32Array(a.count * a.itemSize)
  for (let i = 0; i < a.count; i++) for (let k = 0; k < a.itemSize; k++) out[i * a.itemSize + k] = a.getComponent(i, k)
  return new THREE.BufferAttribute(out, a.itemSize)
}

const segQ = new THREE.Vector3()
const segDist = (p: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3) => {
  const ab = segQ.copy(b).sub(a)
  const t = Math.min(1, Math.max(0, (ab.x * (p.x - a.x) + ab.y * (p.y - a.y) + ab.z * (p.z - a.z)) / (ab.lengthSq() || 1)))
  const dx = a.x + ab.x * t - p.x,
    dy = a.y + ab.y * t - p.y,
    dz = a.z + ab.z * t - p.z
  return { d: Math.sqrt(dx * dx + dy * dy + dz * dz), t }
}

function buildRig(scene: THREE.Object3D, top: THREE.Texture | null, front: THREE.Texture | null, knownTips: number[] | null): Rig {
  scene.updateMatrixWorld(true)

  const fwd = MODEL_FORWARD.clone().normalize()
  const up = MODEL_UP.clone().normalize()
  const left = new THREE.Vector3().crossVectors(up, fwd).normalize()
  const basis = new THREE.Matrix4().makeBasis(fwd, left, up).invert()

  const meshes = [] as THREE.Mesh[]
  scene.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh)
  })
  const geos = meshes.map((m) => {
    const src = m.geometry
    const g = new THREE.BufferGeometry()
    for (const name of Object.keys(src.attributes)) g.setAttribute(name, toFloat(src.attributes[name]))
    if (src.index) g.setIndex(src.index.clone())
    g.applyMatrix4(m.matrixWorld)
    g.setAttribute("mpos", (g.attributes.position as THREE.BufferAttribute).clone())
    g.applyMatrix4(basis)
    return g
  })
  const box = new THREE.Box3()
  for (const g of geos) {
    g.computeBoundingBox()
    box.union(g.boundingBox as THREE.Box3)
  }
  const span = Math.max(box.max.x - box.min.x, box.max.y - box.min.y)
  const center = new THREE.Vector3((box.min.x + box.max.x) / 2, (box.min.y + box.max.y) / 2, box.min.z)
  const norm = new THREE.Matrix4()
    .makeScale(1 / span, 1 / span, 1 / span)
    .multiply(new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z))
  for (const g of geos) g.applyMatrix4(norm)

  const all = [] as number[]
  const rough = [] as number[]
  for (const g of geos) {
    const p = g.attributes.position
    const c = g.attributes.color
    for (let i = 0; i < p.count; i++) {
      all.push(p.getX(i), p.getY(i), p.getZ(i))
      rough.push(c && c.itemSize === 4 ? c.getW(i) : 1)
    }
  }

  let bx0 = Infinity,
    bx1 = -Infinity,
    topZ = 0
  for (let i = 0; i < all.length; i += 3) {
    if (Math.abs(all[i + 1]) < 0.03) {
      bx0 = Math.min(bx0, all[i])
      bx1 = Math.max(bx1, all[i])
      topZ = Math.max(topZ, all[i + 2])
    }
  }
  const bodyLen = bx1 - bx0

  let waistX = bx0 + bodyLen * 0.5,
    narrow = Infinity
  for (let f = 0.3; f <= 0.7; f += 0.02) {
    const x = bx0 + bodyLen * f
    let w = 0
    for (let i = 0; i < all.length; i += 3)
      if (Math.abs(all[i] - x) < 0.008 && all[i + 2] > topZ * 0.35) w = Math.max(w, Math.abs(all[i + 1]))
    if (w > 0 && w < narrow) {
      narrow = w
      waistX = x
    }
  }

  const cx = (waistX + bx1) / 2
  let bodyR = 0
  for (let i = 0; i < all.length; i += 3) {
    if (Math.abs(all[i] - cx) < 0.03 && all[i + 2] > topZ * 0.8) bodyR = Math.max(bodyR, Math.abs(all[i + 1]))
  }
  bodyR = Math.max(bodyR, 0.05)

  const ax = (bx0 + waistX) / 2,
    ahl = (waistX - bx0) / 2,
    ahw = ahl * 0.92
  const inAbdomen = (x: number, y: number) => ((x - ax) / (ahl * 1.08)) ** 2 + (y / (ahw * 1.08)) ** 2 < 1

  const onAbdomen = (x: number, y: number) => ((x - ax) / (ahl * 1.05)) ** 2 + (y / (ahl * 0.6)) ** 2 < 1

  const sectors = [] as { a: number; best: number; p: THREE.Vector3 }[]
  for (let i = 0; i < all.length; i += 3) {
    const dx = all[i] - cx,
      dy = all[i + 1]
    const r = Math.hypot(dx, dy)
    if (r < bodyR * 1.5) continue
    if (inAbdomen(all[i], dy)) continue

    if (all[i + 2] > topZ * 0.38) continue
    const ang = Math.atan2(dy, dx)
    let s = sectors.find((q) => Math.abs(Math.atan2(Math.sin(q.a - ang), Math.cos(q.a - ang))) < 0.22)
    if (!s) {
      s = { a: ang, best: 0, p: new THREE.Vector3() }
      sectors.push(s)
    }
    if (r > s.best) {
      s.best = r
      s.a = ang
      s.p.set(all[i], all[i + 1], all[i + 2])
    }
  }
  sectors.sort((a, b) => b.best - a.best)
  const legSectors = sectors.slice(0, 8)
  const L = legSectors.filter((s) => s.a > 0).sort((a, b) => a.a - b.a)
  const R = legSectors.filter((s) => s.a <= 0).sort((a, b) => b.a - a.a)
  const tips = knownTips
    ? Array.from({ length: 8 }, (_, k) => new THREE.Vector3(knownTips[k * 3], knownTips[k * 3 + 1], knownTips[k * 3 + 2]))
    : [...L, ...R].map((s) => s.p.clone())

  const legs = [] as Leg[]
  const bones = [] as THREE.Bone[]
  const rootBone = new THREE.Bone()
  bones.push(rootBone)
  const abdomen = new THREE.Bone()
  abdomen.position.set(waistX, 0, topZ * 0.5)
  rootBone.add(abdomen)
  bones.push(abdomen)

  const legAng = tips.map((t) => Math.atan2(t.y, t.x - cx))
  const tmp = new THREE.Vector3()
  for (let k = 0; k < tips.length; k++) {
    const tip = tips[k]
    const ang = legAng[k]
    const findKnee = (hip: THREE.Vector3) => {
      const nx = -(tip.y - hip.y),
        ny = tip.x - hip.x
      const nl = Math.hypot(nx, ny) || 1
      const L0 = Math.hypot(tip.x - hip.x, tip.y - hip.y)
      let knee = hip
        .clone()
        .lerp(tip, 0.45)
        .setZ(topZ * 0.8)
      let best = -Infinity
      for (let i = 0; i < all.length; i += 3) {
        const px = all[i] - hip.x,
          py = all[i + 1] - hip.y
        if (Math.abs((px * nx + py * ny) / nl) > 0.025) continue
        const along = (px * (tip.x - hip.x) + py * (tip.y - hip.y)) / L0
        if (along < L0 * 0.18 || along > L0 * 0.75) continue
        if (all[i + 2] > best) {
          best = all[i + 2]
          knee = new THREE.Vector3(all[i], all[i + 1], all[i + 2])
        }
      }
      return knee
    }

    const hipAt = (a: number) => new THREE.Vector3(cx + Math.cos(a) * bodyR * 0.92, Math.sin(a) * bodyR * 0.92, topZ * 0.42)
    let hip = hipAt(ang)
    let knee = findKnee(hip)
    hip = hipAt(Math.atan2(knee.y, knee.x - cx))
    knee = findKnee(hip)
    const foot = tip.clone()
    const b1 = new THREE.Bone()
    b1.position.copy(hip)
    const b2 = new THREE.Bone()
    b2.position.copy(knee).sub(hip)
    b1.add(b2)
    rootBone.add(b1)
    bones.push(b1, b2)
    const d1 = knee.clone().sub(hip),
      d2 = foot.clone().sub(knee)
    const restN = new THREE.Vector3().crossVectors(d1, d2)
    if (restN.lengthSq() < 1e-10) restN.set(-Math.sin(ang), Math.cos(ang), 0).cross(new THREE.Vector3(0, 0, 1))
    legs.push({
      hip,
      knee,
      foot,
      l1: d1.length(),
      l2: d2.length(),
      b1,
      b2,
      restN: restN.normalize(),
      rd: foot.clone().sub(hip).normalize(),
      rp: (() => {
        const rd = foot.clone().sub(hip).normalize()
        const v = knee.clone().sub(hip)
        return v.sub(rd.multiplyScalar(v.dot(rd))).normalize()
      })(),
      fx: 0,
      fy: 0,
      fz: 0,
      sx: 0,
      sy: 0,
      t: 0,
      stepping: false,
      dur: 0.14,
    })
  }

  const root = new THREE.Group()
  const uniforms = { uBlink: { value: 0 } }

  const eye = new THREE.Vector4(1, -1, 0, 1)
  geos.forEach((g, gi) => {
    const pos = g.attributes.position
    const mp = g.attributes.mpos
    const n = pos.count
    const si = new Uint16Array(n * 4)
    const sw = new Float32Array(n * 4)
    const p = new THREE.Vector3()
    const c = g.attributes.color
    for (let i = 0; i < n; i++) {
      p.set(pos.getX(i), pos.getY(i), pos.getZ(i))
      if (c && c.itemSize === 4 && c.getW(i) < 0.3 && p.x > waistX && Math.hypot(p.x - cx, p.y) < bodyR * 1.2 && p.z > topZ * 0.45) {
        eye.x = Math.min(eye.x, mp.getY(i))
        eye.y = Math.max(eye.y, mp.getY(i))
        eye.z = Math.max(eye.z, Math.abs(mp.getX(i)))
        eye.w = Math.min(eye.w, mp.getZ(i))
      }
      const r = Math.hypot(p.x - cx, p.y)
      let done = false

      const face = p.x > cx && Math.abs(p.y) < bodyR * 0.62
      if (r > bodyR * 0.7 && !face && !onAbdomen(p.x, p.y)) {
        let best = -1,
          bd = 0.07,
          bt = 0
        for (let k = 0; k < legs.length; k++) {
          const lg = legs[k]
          const d1 = segDist(p, lg.hip, lg.knee)
          const d2 = segDist(p, lg.knee, lg.foot)
          if (d1.d < bd) {
            bd = d1.d
            best = k
            bt = d1.t * 0.5
          }
          if (d2.d < bd) {
            bd = d2.d
            best = k
            bt = 0.5 + d2.t * 0.5
          }
        }
        if (best >= 0) {
          const bi = 2 + best * 2

          const w2 = Math.min(1, Math.max(0, (bt - 0.44) / 0.12))
          const w0 = Math.min(1, Math.max(0, (0.08 - bt) / 0.08)) * (1 - w2)
          si[i * 4] = bi
          si[i * 4 + 1] = bi + 1
          si[i * 4 + 2] = 0
          sw[i * 4] = (1 - w2) * (1 - w0)
          sw[i * 4 + 1] = w2
          sw[i * 4 + 2] = w0
          done = true
        }
      }
      if (!done) {
        si[i * 4] = onAbdomen(p.x, p.y) ? 1 : 0
        sw[i * 4] = 1
      }
    }
    g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(si, 4))
    g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(sw, 4))
    if (!g.attributes._w) g.setAttribute("_w", new THREE.BufferAttribute(new Float32Array(n * 2), 2))
    const srcMat = meshes[gi].material as THREE.MeshStandardMaterial
    const hasColor = !!c && c.itemSize === 4
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: hasColor,
      map: hasColor ? null : (srcMat.map ?? null),
      roughness: 1,
      metalness: 0,
      envMapIntensity: 1,
    })
    const proj = hasColor && top && front ? 1 : 0
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTop = { value: top }
      sh.uniforms.uFront = { value: front }
      sh.uniforms.uBlink = uniforms.uBlink
      sh.uniforms.uEye = { value: eye }
      sh.uniforms.uProj = { value: proj }
      sh.vertexShader = SKIN_VERT + sh.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\nvMpos = mpos;\nvW = _w;")
      sh.fragmentShader =
        SKIN_FRAG +
        sh.fragmentShader
          .replace("vec4 diffuseColor = vec4( diffuse, opacity );", hasColor ? SKIN_COLOR : "vec4 diffuseColor = vec4( diffuse, opacity );")
          .replace("#include <color_fragment>", "")
          .replace(
            "#include <roughnessmap_fragment>",
            hasColor ? "float roughnessFactor = clamp(mix(0.08, 0.92, rough), 0.06, 1.0);" : "#include <roughnessmap_fragment>",
          )
    }
    const sm = new THREE.SkinnedMesh(g, mat)
    sm.castShadow = true
    sm.frustumCulled = false
    root.add(sm)
  })

  const first = root.children[0] as THREE.SkinnedMesh
  first.add(rootBone)
  root.updateMatrixWorld(true)
  const skeleton = new THREE.Skeleton(bones)
  for (const sm of root.children) (sm as THREE.SkinnedMesh).bind(skeleton, new THREE.Matrix4())
  eye.x += (eye.y - eye.x) * 0.02

  return {
    root,
    legs,
    abdomen,
    uniforms,
    spinneret: new THREE.Vector3(bx0 + 0.01, 0, topZ * 0.4),
    headFront: new THREE.Vector3(bx1, 0, topZ * 0.7),
    bodyLen,
  }
}

const isTyping = (el: Element | null) =>
  !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || (el as HTMLElement).isContentEditable)

function mulberry(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const angDiff = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a))
const damp = (k: number, dt: number) => 1 - Math.exp(-k * dt)
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

export default function SilkSpiderCursor({
  anchorSelector = "[data-silk-anchor]",
  modelSrc = DEFAULT_MODEL,
  topTextureSrc,
  faceTextureSrc,
  size,
  silkColor = "#ffffff",
  bounceColor = "#1530e6",
  shadowColor = "#000a3a",
  maxThreads = 120,
  fly = true,
  sleepAfter = 4500,
  enter = true,
  seedWebs = 0,
  clearKeys = ["Delete", "Backspace"],
  position = "fixed",
  zIndex = 50,
  maxDpr = 2,
  className,
}: SilkSpiderCursorProps) {
  const wrapRef = React.useRef(null as HTMLDivElement | null)
  const silkRef = React.useRef(null as HTMLCanvasElement | null)
  const glRef = React.useRef(null as HTMLCanvasElement | null)
  const opts = React.useRef({ anchorSelector, size, silkColor, maxThreads, fly, sleepAfter, enter, clearKeys })
  opts.current = { anchorSelector, size, silkColor, maxThreads, fly, sleepAfter, enter, clearKeys }

  React.useEffect(() => {
    const wrap = wrapRef.current
    const silkCanvas = silkRef.current
    const glCanvas = glRef.current
    if (!wrap || !silkCanvas || !glCanvas) return
    const ctx = silkCanvas.getContext("2d")
    if (!ctx) return
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches
    const rand = mulberry(0x5eed)

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ canvas: glCanvas, alpha: true, antialias: true, powerPreference: "high-performance" })
    } catch {
      return
    }
    renderer.setClearColor(0x000000, 0)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.92
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    const scene = new THREE.Scene()
    const pmrem = new THREE.PMREMGenerator(renderer)
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = envTex
    scene.environmentIntensity = 0.35
    const hemi = new THREE.HemisphereLight(0xfff6ec, new THREE.Color(bounceColor), 0.45)
    hemi.position.set(0, 0, 1)
    scene.add(hemi)
    const key = new THREE.DirectionalLight(0xfff1de, 1.9)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    key.shadow.radius = 5
    key.shadow.bias = -0.0008
    key.shadow.normalBias = 0.6
    scene.add(key, key.target)
    const rim = new THREE.DirectionalLight(0xbcd0ff, 0.7)
    scene.add(rim, rim.target)
    const camera = new THREE.PerspectiveCamera(20, 1, 1, 20000)

    const catcher = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.ShadowMaterial({ color: new THREE.Color(shadowColor), opacity: 0.42 }),
    )
    catcher.receiveShadow = true
    scene.add(catcher)

    const blobCanvas = document.createElement("canvas")
    blobCanvas.width = blobCanvas.height = 64
    const bctx = blobCanvas.getContext("2d") as CanvasRenderingContext2D
    const bg = bctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    bg.addColorStop(0, "rgba(0,0,0,0.55)")
    bg.addColorStop(0.55, "rgba(0,0,0,0.18)")
    bg.addColorStop(1, "rgba(0,0,0,0)")
    bctx.fillStyle = bg
    bctx.fillRect(0, 0, 64, 64)
    const blob = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(blobCanvas),
        transparent: true,
        depthWrite: false,
        color: new THREE.Color(shadowColor),
      }),
    )
    blob.position.z = 0.2
    scene.add(blob)

    const body = new THREE.Group()
    scene.add(body)
    let rig: Rig | null = null

    let W = 0,
      H = 0,
      dpr = 1,
      S = 220
    const resize = () => {
      const r = wrap.getBoundingClientRect()
      W = Math.max(1, r.width)
      H = Math.max(1, r.height)
      dpr = Math.min(maxDpr, window.devicePixelRatio || 1)
      silkCanvas.width = Math.round(W * dpr)
      silkCanvas.height = Math.round(H * dpr)
      renderer.setPixelRatio(dpr)
      renderer.setSize(W, H, false)
      const fov = camera.fov * (Math.PI / 180)
      const dist = H / 2 / Math.tan(fov / 2)
      camera.aspect = W / H
      camera.position.set(W / 2, -H / 2, dist)
      camera.near = dist * 0.5
      camera.far = dist * 1.6
      camera.lookAt(W / 2, -H / 2, 0)
      camera.updateProjectionMatrix()
      S = opts.current.size ?? clamp(Math.min(W, H * 1.4) * 0.22, 150, 300)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    const sp = {
      x: W * 0.5,
      y: -S,
      vx: 0,
      vy: 0,
      th: Math.PI / 2,
      pitch: 0,
      roll: 0,
      z: 0,
      vz: 0,
      mode: reduced ? "idle" : opts.current.enter ? "enter" : "idle",
      t: 0,
      idleT: 0,
      blink: 0,
      sleep: 0,
      eyesClosed: 0,
      wake: 0,
      preferGroup: 0,
      ik: 0,
      enterX: W * 0.5,
      enterY: H * 0.34,
      landed: false,
    }
    if (sp.mode !== "enter") {
      sp.x = reduced ? W * 0.6 : W * 0.5
      sp.y = reduced ? H * 0.2 : H * 0.4
      sp.landed = true
    }
    const ptr = { x: sp.x, y: sp.y, has: false, lastMove: -1e9, ix: 0, iy: 0 }

    const silk = createSilk()
    let drag: Thread | null = null
    let dragEl: Element | null = null
    let tackX = 0,
      tackY = 0
    let dropLine: Thread | null = null
    let anchorEls = [] as Element[]
    let anchorScan = 0
    const rects = new Map() as Map<Element, DOMRect>

    const scanAnchors = () => {
      const root = position === "fixed" ? document : (wrap.parentElement ?? document)
      anchorEls = Array.from(root.querySelectorAll(opts.current.anchorSelector))
    }
    scanAnchors()

    const v3 = new THREE.Vector3()
    const m4 = new THREE.Matrix4()
    const toPage = (local: THREE.Vector3, out: THREE.Vector3) => {
      out.copy(local).applyMatrix4(rig ? rig.root.matrixWorld : body.matrixWorld)
      out.y = -out.y
      return out
    }
    const spinPage = new THREE.Vector3()
    const headPage = new THREE.Vector3()

    const anchorAt = (x: number, y: number, el: Element | null) => {
      if (!el) return silk.addAnchor({ el: null, u: 0, v: 0, sx: x, sy: y })
      const r = rects.get(el) as DOMRect
      return silk.addAnchor({ el, u: (x - r.left) / Math.max(1, r.width), v: (y - r.top) / Math.max(1, r.height), sx: x, sy: y })
    }

    const startDrag = (x: number, y: number, el: Element) => {
      const t = silk.newThread(el)
      const a = silk.particle(x, y, anchorAt(x, y, el))
      const s = silk.particle(x, y, silk.addAnchor({ el: null, u: 0, v: 0, sx: x, sy: y }))
      if (a < 0 || s < 0) return null
      t.owned.push(a, s)
      t.parts.push(a, s)
      t.cons.push(silk.constraint(a, s, 0.5))
      t.born = sp.t
      drag = t
      dragEl = el
      tackX = x
      tackY = y
      return t
    }

    const dragSpinner = (t: Thread) => t.parts[t.parts.length - 1]

    const feedDrag = (x: number, y: number) => {
      if (!drag) return
      const s = dragSpinner(drag)
      const an = silk.anchors[silk.PIN[s]]
      if (an) {
        an.sx = x
        an.sy = y
      }
      const prev = drag.parts[drag.parts.length - 2]
      const seg = Math.max(10, S * 0.07)
      const d = Math.hypot(x - silk.X[prev], y - silk.Y[prev])
      if (d > seg && drag.parts.length < 60) {
        silk.unpin(s)
        silk.X[s] = silk.PX[s] = x
        silk.Y[s] = silk.PY[s] = y
        const c = drag.cons[drag.cons.length - 1]
        silk.CR[c] = d
        const ns = silk.particle(x, y, silk.addAnchor({ el: null, u: 0, v: 0, sx: x, sy: y }))
        if (ns < 0) return
        drag.owned.push(ns)
        drag.parts.push(ns)
        drag.cons.push(silk.constraint(s, ns, 0.5))
      } else {
        silk.CR[drag.cons[drag.cons.length - 1]] = Math.max(0.5, d)
      }
    }

    const setThreads = () => silk.threads.filter((t) => t.state === 1)

    const lay = (a: number, b: number, el: Element | null) => {
      const t = silk.newThread(el)
      silk.span(t, a, b, Math.max(12, S * 0.08), 0.02 + rand() * 0.05)
      t.state = 1
      t.born = -10
      silk.sprinkleDew(t, rand, Math.sqrt(S / 220))
      return t
    }
    const bridgeFrom = (t: Thread) => {
      const mid = t.parts[Math.floor(t.parts.length / 2)]
      let best = -1,
        bd = S * 1.1,
        host: Thread | null = null
      for (const o of setThreads()) {
        if (o === t || o.parts.length < 4) continue
        for (let k = 1; k < o.parts.length - 1; k++) {
          const p = o.parts[k]
          const d = Math.hypot(silk.X[p] - silk.X[mid], silk.Y[p] - silk.Y[mid])
          if (d < bd && d > S * 0.18) {
            bd = d
            best = p
            host = o
          }
        }
      }
      if (best < 0 || !host) return
      const b = lay(mid, best, null)
      b.born = sp.t
      b.hostIds.push(t.id, host.id)
    }

    const seed = (n: number) => {
      const els = anchorEls.filter((e) => {
        const r = rects.get(e)
        return !!r && r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < H
      })
      if (els.length < 2) return
      const pt = (el: Element) => {
        const r = rects.get(el) as DOMRect
        return [r.left + r.width * (0.15 + rand() * 0.7), r.top + r.height * (0.08 + rand() * 0.45)]
      }
      const made = [] as Thread[]
      for (let k = 0, tries = 0; k < n && tries < n * 12; tries++) {
        const A = els[Math.floor(rand() * els.length)]
        const ra = rects.get(A) as DOMRect
        const near = els.filter((e) => {
          if (e === A) return false
          const r = rects.get(e) as DOMRect
          const d = Math.hypot(r.left + r.width / 2 - ra.left - ra.width / 2, r.top + r.height / 2 - ra.top - ra.height / 2)
          return d > S * 0.4 && d < Math.min(W, H) * 0.6
        })
        if (!near.length) continue
        const B = near[Math.floor(rand() * near.length)]
        const [ax, ay] = pt(A),
          [bx, by] = pt(B)
        const pa = silk.particle(ax, ay, anchorAt(ax, ay, A))
        const pb = silk.particle(bx, by, anchorAt(bx, by, B))
        if (pa < 0 || pb < 0) break
        const t = lay(pa, pb, A)
        t.owned.push(pa, pb)
        made.push(t)
        k++
      }
      for (const t of made) if (rand() < 0.6) bridgeFrom(t)
    }
    let seeded = reduced || seedWebs <= 0

    const attach = (x: number, y: number, el: Element) => {
      if (!drag) return
      const t = drag
      const s = dragSpinner(t)
      const a0 = t.parts[0]
      const straight = Math.hypot(silk.X[a0] - x, silk.Y[a0] - y)
      if (straight < S * 0.1) {
        silk.freeThread(t)
        silk.threads.splice(silk.threads.indexOf(t), 1)
        drag = null
        startDrag(x, y, el)
        return
      }
      const an = silk.anchors[silk.PIN[s]]
      if (an) {
        const r = rects.get(el) as DOMRect
        an.el = el
        an.u = (x - r.left) / Math.max(1, r.width)
        an.v = (y - r.top) / Math.max(1, r.height)
      }

      const parts = t.parts
      const n = parts.length
      for (let k = 1; k < n - 1; k++) {
        const p = parts[k]
        const f = k / (n - 1)
        silk.X[p] = silk.X[a0] + (x - silk.X[a0]) * f + (rand() - 0.5) * 3
        silk.Y[p] = silk.Y[a0] + (y - silk.Y[a0]) * f
        silk.PX[p] = silk.X[p] + (rand() - 0.5) * 2
        silk.PY[p] = silk.Y[p] - 4 * Math.sin(Math.PI * f)
      }
      const slack = 0.015 + rand() * 0.05
      const rest = (straight * (1 + slack)) / (n - 1)
      for (const c of t.cons) silk.CR[c] = rest
      t.state = 1
      t.born = sp.t
      silk.sprinkleDew(t, rand, Math.sqrt(S / 220))
      drag = null

      if (rand() < 0.75) bridgeFrom(t)

      const live = setThreads()
      const over = live.length - opts.current.maxThreads
      for (let k = 0; k < over; k++) kill(live[k], false)
      startDrag(x, y, el)
    }

    const kill = (t: Thread, burst: boolean) => {
      if (t.state === 2) return
      t.state = 2
      t.dieT = 0

      for (const o of silk.threads) if (o.hostIds.includes(t.id)) kill(o, burst)
      for (const p of t.parts) {
        silk.unpin(p)
        if (burst) {
          silk.PX[p] = silk.X[p] - (rand() - 0.5) * 6
          silk.PY[p] = silk.Y[p] + 1 + rand() * 3
        }
      }
    }

    const clearAll = () => {
      for (const t of silk.threads) kill(t, true)
      drag = null
      dragEl = null
      if (sp.mode === "sleep") wake()
      sp.vz += S * 0.9
    }

    const flyS = {
      on: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      t: 0,
      caught: -1,
      wrapped: 0,
      next: 9 + rand() * 6,
      seed: 0,
      done: false,
      cx: 0,
      cy: 0,
    }
    const cocoons = [] as { p: number; t: number; th: number }[]

    const onMove = (x: number, y: number) => {
      const r = wrap.getBoundingClientRect()
      const nx = x - r.left,
        ny = y - r.top
      if (!ptr.has || Math.hypot(nx - ptr.x, ny - ptr.y) > 0.5) ptr.lastMove = sp.t
      ptr.x = nx
      ptr.y = ny
      ptr.has = true
    }
    const pm = (e: PointerEvent) => onMove(e.clientX, e.clientY)
    const tm = (e: TouchEvent) => {
      const t = e.touches[0]
      if (t) onMove(t.clientX, t.clientY)
    }
    const kd = (e: KeyboardEvent) => {
      if (!opts.current.clearKeys.includes(e.key)) return
      if (isTyping(document.activeElement)) return
      if (!silk.threads.length) return
      clearAll()
    }
    window.addEventListener("pointermove", pm, { passive: true })
    window.addEventListener("pointerdown", pm, { passive: true })
    window.addEventListener("touchstart", tm, { passive: true })
    window.addEventListener("touchmove", tm, { passive: true })
    window.addEventListener("keydown", kd)

    const wake = () => {
      sp.mode = "walk"
      sp.idleT = 0
      sp.wake = 1
      sp.vz += S * 0.7
    }

    let disposed = false
    const loader = new GLTFLoader()
    loader.setMeshoptDecoder(MeshoptDecoder)
    const placeFeet = () => {
      if (!rig) return
      const c = Math.cos(sp.th),
        s = Math.sin(sp.th)
      for (const lg of rig.legs) {
        const lx = lg.foot.x * S,
          ly = -lg.foot.y * S
        lg.fx = sp.x + lx * c - ly * s
        lg.fy = sp.y + lx * s + ly * c
        lg.fz = 0
      }
    }

    const texLoader = new THREE.TextureLoader()
    const loadTex = (src: string) =>
      new Promise((done: (t: THREE.Texture | null) => void) => {
        if (!src) return done(null)
        texLoader.load(
          src,
          (t) => {
            t.colorSpace = THREE.SRGBColorSpace
            t.anisotropy = 4
            done(t)
          },
          undefined,
          () => done(null),
        )
      })
    const own = modelSrc === DEFAULT_MODEL
    Promise.all([
      loadTex(own ? (topTextureSrc ?? DEFAULT_TOP) : (topTextureSrc ?? "")),
      loadTex(own ? (faceTextureSrc ?? DEFAULT_FACE) : (faceTextureSrc ?? "")),
    ]).then(([top, front]) => {
      if (disposed || !modelSrc) return
      loader.load(
        modelSrc,
        (gltf) => {
          if (disposed) return
          rig = buildRig(gltf.scene, top, front, own ? DEFAULT_TIPS : null)
          body.add(rig.root)
          placeFeet()
        },
        undefined,
        () => {},
      )
    })

    const knee = [0, 0, 0, 0, 0, 0]
    const qA = new THREE.Quaternion()
    const qB = new THREE.Quaternion()
    const mA = new THREE.Matrix4()
    const mB = new THREE.Matrix4()
    const inv = new THREE.Matrix4()
    const vA = new THREE.Vector3(),
      vB = new THREE.Vector3(),
      vN = new THREE.Vector3(),
      vC = new THREE.Vector3()
    const nd1 = new THREE.Vector3(),
      nd2 = new THREE.Vector3(),
      fb2 = new THREE.Vector3()
    const qS = new THREE.Quaternion(),
      qT = new THREE.Quaternion()

    const frameRot = (d: THREE.Vector3, n: THREE.Vector3, d2: THREE.Vector3, n2: THREE.Vector3, out: THREE.Quaternion) => {
      const b1 = vC.crossVectors(n, d).normalize()
      mA.makeBasis(d, n, b1)
      const b2 = fb2.crossVectors(n2, d2).normalize()
      mB.makeBasis(d2, n2, b2)
      mA.transpose()
      mB.multiply(mA)
      return out.setFromRotationMatrix(mB)
    }

    const updateLegs = (dt: number) => {
      if (!rig) return
      const c = Math.cos(sp.th),
        s = Math.sin(sp.th)
      const speed = Math.hypot(sp.vx, sp.vy)
      const walking = sp.mode === "walk" || sp.mode === "hunt"
      const tuck = sp.sleep
      const dur = clamp(0.19 - (speed / S) * 0.03, 0.085, 0.19)
      const lead = dur * 0.95
      const thresh = (walking ? 0.1 : 0.045) * S
      const hang = sp.mode === "enter" && !sp.landed
      const errs = [] as number[]
      const homes = [] as number[]
      for (let i = 0; i < rig.legs.length; i++) {
        const lg = rig.legs[i]
        const k = 1 - tuck * 0.22
        let lx = lg.foot.x * S * k,
          ly = -lg.foot.y * S * k
        const hx = sp.x + lx * c - ly * s + sp.vx * lead
        const hy = sp.y + lx * s + ly * c + sp.vy * lead
        homes.push(hx, hy)
        errs.push(Math.hypot(lg.fx - hx, lg.fy - hy))

        if (errs[i] > S * 0.6) {
          lg.fx = hx
          lg.fy = hy
          lg.stepping = false
          errs[i] = 0
        }
      }
      if (!hang) {
        const stepping = [false, false]
        for (let i = 0; i < 8; i++) if (rig.legs[i].stepping) stepping[GROUP[i]] = true
        for (const g of [sp.preferGroup, 1 - sp.preferGroup]) {
          if (stepping[0] || stepping[1]) break
          let worst = 0
          for (let i = 0; i < 8; i++) if (GROUP[i] === g) worst = Math.max(worst, errs[i])
          if (worst > thresh) {
            for (let i = 0; i < 8; i++) {
              if (GROUP[i] !== g || errs[i] < thresh * 0.3) continue
              const lg = rig.legs[i]
              lg.stepping = true
              lg.t = 0
              lg.dur = dur * (0.9 + rand() * 0.2)
              lg.sx = lg.fx
              lg.sy = lg.fy
            }
            sp.preferGroup = 1 - g
            stepping[g] = true
          }
        }
      }
      for (let i = 0; i < rig.legs.length; i++) {
        const lg = rig.legs[i]
        if (hang) {
          const k = 0.62
          const lx = lg.foot.x * S * k,
            ly = -lg.foot.y * S * k
          lg.fx = sp.x + lx * c - ly * s
          lg.fy = sp.y + lx * s + ly * c
          lg.fz = S * (0.05 + 0.025 * Math.sin(sp.t * 5 + i * 1.7))
          continue
        }
        if (lg.stepping) {
          lg.t += dt / lg.dur
          const f = Math.min(1, lg.t)
          const e = f * f * (3 - 2 * f)
          lg.fx = lg.sx + (homes[i * 2] - lg.sx) * e
          lg.fy = lg.sy + (homes[i * 2 + 1] - lg.sy) * e
          lg.fz = Math.sin(Math.PI * f) * S * (0.05 + Math.min(0.04, (speed / S) * 0.01))
          if (f >= 1) {
            lg.stepping = false
            lg.fz = 0
            pluck(lg.fx, lg.fy)
          }
        } else {
          lg.fz += (0 - lg.fz) * damp(20, dt)
        }
      }

      const facing = sp.mode === "idle" && Math.abs(angDiff(sp.th, Math.PI / 2)) < 0.3
      const ikTo = hang || sp.mode === "sleep" || facing ? 0 : 1
      sp.ik += (ikTo - sp.ik) * damp(ikTo ? 10 : 5, dt)
      if (sp.ik < 0.5) {
        for (let i = 0; i < rig.legs.length; i++) {
          const lg = rig.legs[i]
          lg.fx = homes[i * 2] - sp.vx * lead
          lg.fy = homes[i * 2 + 1] - sp.vy * lead
          lg.fz = 0
          lg.stepping = false
        }
      }

      rig.root.updateMatrixWorld(true)
      inv.copy(rig.root.matrixWorld).invert()
      const w = sp.ik
      for (let i = 0; i < rig.legs.length; i++) {
        const lg = rig.legs[i]
        if (w < 0.001) {
          lg.b1.quaternion.identity()
          lg.b2.quaternion.identity()
        } else {
          vA.set(lg.fx, -lg.fy, lg.fz).applyMatrix4(inv)
          vC.copy(vA).sub(lg.hip).normalize()
          qS.setFromUnitVectors(lg.rd, vC)
          vB.copy(lg.rp).applyQuaternion(qS)
          solveKnee(lg.hip.x, lg.hip.y, lg.hip.z, vA.x, vA.y, vA.z, lg.l1, lg.l2, vB.x, vB.y, vB.z, knee)
          const d1 = vA.set(lg.knee.x - lg.hip.x, lg.knee.y - lg.hip.y, lg.knee.z - lg.hip.z).normalize()
          const d2 = vB.set(lg.foot.x - lg.knee.x, lg.foot.y - lg.knee.y, lg.foot.z - lg.knee.z).normalize()
          nd1.set(knee[0] - lg.hip.x, knee[1] - lg.hip.y, knee[2] - lg.hip.z).normalize()
          nd2.set(knee[3] - knee[0], knee[4] - knee[1], knee[5] - knee[2]).normalize()
          const nn = vN.crossVectors(nd1, nd2)
          if (nn.lengthSq() < 1e-8) nn.copy(lg.restN)
          nn.normalize()
          frameRot(d1, lg.restN, nd1, nn, qA)
          frameRot(d2, lg.restN, nd2, nn, qB)
          qB.premultiply(qT.copy(qA).invert())
          lg.b1.quaternion.identity().slerp(qA, w)
          lg.b2.quaternion.identity().slerp(qB, w)
        }
        if (hang) {
          qT.setFromAxisAngle(lg.restN, Math.sin(sp.t * 5 + i * 1.7) * 0.14)
          lg.b1.quaternion.multiply(qT)
          qT.setFromAxisAngle(lg.restN, Math.sin(sp.t * 5 + i * 1.7 + 0.8) * 0.2)
          lg.b2.quaternion.multiply(qT)
        }
      }
    }

    const pluck = (x: number, y: number) => {
      const r = S * 0.08
      for (const t of silk.threads) {
        if (t.state !== 1) continue
        for (const p of t.parts) {
          if (silk.INV[p] === 0) continue
          const d = Math.hypot(silk.X[p] - x, silk.Y[p] - y)
          if (d < r) silk.PY[p] -= 2.2 * (1 - d / r)
        }
      }
    }

    const updateSpider = (dt: number) => {
      sp.t += dt
      const o = opts.current
      if (sp.mode === "enter") {
        const t = sp.t
        const dropT = 1.9
        const p = Math.min(1, t / dropT)
        const ease = 1 - Math.pow(1 - p, 3)
        sp.x = sp.enterX + Math.sin(t * 2.1) * S * 0.04 * Math.exp(-t * 0.5)
        sp.y = -S * 0.7 + (sp.enterY + S * 0.7) * ease
        if (t > dropT) sp.y += Math.sin((t - dropT) * 9) * S * 0.07 * Math.exp(-(t - dropT) * 3)
        sp.th = Math.PI / 2 + Math.sin(t * 1.3) * 0.22 * Math.exp(-t * 0.4)
        sp.pitch += (0.55 - sp.pitch) * damp(3, dt)
        if (!dropLine) {
          const tl = silk.newThread(null)
          const a = silk.particle(sp.enterX, -2, silk.addAnchor({ el: null, u: 0, v: 0, sx: sp.enterX, sy: -2 }))
          const b = silk.particle(sp.enterX, -1, silk.addAnchor({ el: null, u: 0, v: 0, sx: sp.enterX, sy: -1 }))
          tl.owned.push(a, b)
          tl.parts.push(a, b)
          tl.cons.push(silk.constraint(a, b, 1))
          tl.state = 1
          dropLine = tl
        }
        if (t > 2.7 && !sp.landed) {
          sp.landed = true

          if (dropLine) {
            const end = dropLine.parts[dropLine.parts.length - 1]
            silk.unpin(end)
            silk.PY[end] = silk.Y[end] + 14
            const tl = dropLine
            setTimeout(() => kill(tl, false), 650)
          }
          sp.mode = "idle"
          sp.idleT = 0.4
          sp.vx = sp.vy = 0
          placeFeet()
          ptr.x = sp.x
          ptr.y = sp.y
        }
        return
      }

      const moved = ptr.has && sp.t - ptr.lastMove < 0.25

      const huntFly = !reduced && flyS.on && flyS.caught >= 0 && !moved && sp.t - ptr.lastMove > 1.2
      let tx = ptr.x,
        ty = ptr.y
      if (huntFly) {
        tx = silk.X[flyS.caught]
      #¸ë{h‘éì¶»§q«^t¹Õ±°¥mt¤(€½¹ÍÐÍÑÉ…ÁÌ€ôI•…Ð¹ÕÍ•I•˜¡mt…Ì€¡!Q51MÁ…¹±•µ•¹Ðð¹Õ±°¥mt¤(€½¹ÍÐ½É‘Ì€ôI•…Ð¹ÕÍ•I•˜¡mt…Ì€¡!Q51MÁ…¹±•µ•¹Ðð¹Õ±°¥mt¤(€½¹ÍÐ¡…¹Ì€ôI•…Ð¹ÕÍ•I•˜¡mt…Ì€¡!Q51MÁ…¹±•µ•¹Ðð¹Õ±°¥mt¤(€½¹ÍÐ‰ÕÑÑ½¹Ì€ôI•…Ð¹ÕÍ•I•˜¡mt…Ì€¡!Q51	ÕÑÑ½¹±•µ•¹Ðð¹Õ±°¥mt¤(€½¹ÍÐ™±¥ÁÌ€ôI•…Ð¹ÕÍ•I•˜¡mt…Ì€¡!Q51MÁ…¹±•µ•¹Ðð¹Õ±°¥mt¤(€½¹ÍÐÍ¡…‘½ÝÌ€ôI•…Ð¹ÕÍ•I•˜¡mt…Ì€¡!Q51MÁ…¹±•µ•¹Ðð¹Õ±°¥mt¤(€½¹ÍÐ±¥¹­1…å•ÉÌ€ôI•…Ð¹ÕÍ•I•˜¡mt…Ì€¡!Q51¥Ù±•µ•¹Ðð¹Õ±°¥mt¤(€½¹ÍÐÍ¥´€ôI•…Ð¹ÕÍ•I•˜¡•µÁÑåM¥´ ¤¤(€½¹ÍÐmÍ¥é”°Í•ÑM¥é•t€ôI•…Ð¹ÕÍ•MÑ…Ñ”¡ìÝ¥‘Ñ è€À°\è5a}\°…É½ÕÍ•°è™…±Í”ô¤(€½¹ÍÐm¥¹¹•ÉÑ¥Ù”°Í•Ñ%¹¹•ÉÑ¥Ù•t€ôI•…Ð¹ÕÍ•MÑ…Ñ”¡¹Õ±°…Ì¹Õµ‰•Èð¹Õ±°¤(€½¹ÍÐm¥¹¹•É±¥ÁÁ•°Í•Ñ%¹¹•É±¥ÁÁ•‘t€ôI•…Ð¹ÕÍ•MÑ…Ñ”¡¹Õ±°…Ì¹Õµ‰•Èð¹Õ±°¤(€½¹ÍÐm™½ÕÍ%¹‘•à°Í•Ñ½ÕÍ%¹‘•át€ôI•…Ð¹ÕÍ•MÑ…Ñ” À¤(€½¹ÍÐmÉ•‘Õ•°Í•ÑI•‘Õ•‘t€ôI•…Ð¹ÕÍ•MÑ…Ñ”¡™…±Í”¤(€½¹ÍÐmÁ±…å¥¹œ°Í•ÑA±…å¥¹t€ôI•…Ð¹ÕÍ•MÑ…Ñ”¡…ÕÑ½Á±…ä¤(€½¹ÍÐÁ•¹‘¥¹=Á•¸€ôI•…Ð¹ÕÍ•I•˜ ´Ä¤(€½¹ÍÐÁ½¥¹Ñ•È€ôI•…Ð¹ÕÍ•I•˜¡ì(€€€¥è€´Ä°(€€€¥¹‘•àè€´Ä°(€€€àè€À°(€€€äè€À°(€€€µ½‘”è€ˆˆ°(€€€­¥¹è€ˆˆ°(€€€±…ÍÑ`è€À°(€€€±…ÍÑdè€À°(€€€±…ÍÑPè€À°(€€€Øè€À°(€€€ÍÝ¥Á”è€À°(€€€…¹±”è€À°(€€€¡½Ù•É`è€À°(€€€¡½Ù•ÉPè€À°(€€€¡½Ù•É!¥Ðè€´Ä°(€ô¤(€½¹ÍÐÙ…±¥€ô€¡Ù…±Õ”è¹Õµ‰•Èð¹Õ±°ðÕ¹‘•™¥¹•¤€ôø€¡Ù…±Õ”€ôôô¹Õ±°ñðÙ…±Õ”€ôôôÕ¹‘•™¥¹•ñðÙ…±Õ”€ð€ÀñðÙ…±Õ”€øô½Õ¹Ð€ü¹Õ±°€èÙ…±Õ”¤(€½¹ÍÐ…Ñ¥Ù”€ôÙ…±¥¡…Ñ¥Ù•AÉ½À€„ôôÕ¹‘•™¥¹•€ü…Ñ¥Ù•AÉ½À€è¥¹¹•ÉÑ¥Ù”¤(€½¹ÍÐ™±¥ÁÁ•€ôÙ…±¥¡™±¥ÁÁ•‘AÉ½À€„ôôÕ¹‘•™¥¹•€ü™±¥ÁÁ•‘AÉ½À€è¥¹¹•É±¥ÁÁ•¤(€½¹ÍÐ•¼€ôI•…Ð¹ÕÍ•5•µ¼  ¤€ôø•½µ•ÑÉä¡Í¥é”¹\°¥Ñ•µÌ¤°mÍ¥é”¹\°¥Ñ•µÍt¤(€½¹ÍÐ±¥Ù”€ôI•…Ð¹ÕÍ•I•˜¡ì(€€€…Ñ¥Ù”°(€€€™±¥ÁÁ•°(€€€Í¥é”°(€€€•¼°(€€€É•‘Õ•°(€€€½Õ¹Ð°(€€€…É½ÕÍ•±%¹‘•àè€À°(€€€å±¥Œè™…±Í”°(€€€…Ñ¥Ù•½¹ÑÉ½±±•è™…±Í”°(€€€™±¥ÁÁ•‘½¹ÑÉ½±±•è™…±Í”°(€ô¤(€±¥Ù”¹ÕÉÉ•¹Ð€ôì(€€€€¸¸¹±¥Ù”¹ÕÉÉ•¹Ð°(€€€…Ñ¥Ù”°(€€€™±¥ÁÁ•°(€€€Í¥é”°(€€€•¼°(€€€É•‘Õ•°(€€€½Õ¹Ð°(€€€…Ñ¥Ù•½¹ÑÉ½±±•è…Ñ¥Ù•AÉ½À€„ôôÕ¹‘•™¥¹•°(€€€™±¥ÁÁ•‘½¹ÑÉ½±±•è™±¥ÁÁ•‘AÉ½À€„ôôÕ¹‘•™¥¹•°(€ô(€½¹ÍÐ…±±‰…­Ì€ôI•…Ð¹ÕÍ•I•˜¡ì½¹Ñ¥Ù•¡…¹”°½¹±¥ÁÁ•‘¡…¹”ô¤(€…±±‰…­Ì¹ÕÉÉ•¹Ð€ôì½¹Ñ¥Ù•¡…¹”°½¹±¥ÁÁ•‘¡…¹”ô((€½¹ÍÐÍ•ÑÑ¥Ù”€ôI•…Ð¹ÕÍ•…±±‰…¬ ¡¥¹‘•àè¹Õµ‰•Èð¹Õ±°¤€ôøì(€€€½¹ÍÐ0€ô±¥Ù”¹ÕÉÉ•¹Ð(€€€¥˜€¡0¹…Ñ¥Ù”€ôôô¥¹‘•à¤É•ÑÕÉ¸(€€€0¹…Ñ¥Ù”€ô¥¹‘•à(€€€¥˜€¡¥¹‘•à€„ôô¹Õ±°¤0¹…É½ÕÍ•±%¹‘•à€ô¥¹‘•à(€€€¥˜€ …0¹…Ñ¥Ù•½¹ÑÉ½±±•¤Í•Ñ%¹¹•ÉÑ¥Ù”¡¥¹‘•à¤(€€€…±±‰…­Ì¹ÕÉÉ•¹Ð¹½¹Ñ¥Ù•¡…¹”ü¸¡¥¹‘•à¤(€ô°mt¤((€½¹ÍÐÍ•Ñ±¥ÁÁ•€ôI•…Ð¹ÕÍ•…±±‰…¬ ¡¥¹‘•àè¹Õµ‰•Èð¹Õ±°¤€ôøì(€€€½¹ÍÐ0€ô±¥Ù”¹ÕÉÉ•¹Ð(€€€¥˜€¡0¹™±¥ÁÁ•€ôôô¥¹‘•à¤É•ÑÕÉ¸(€€€½¹ÍÐ½±€ô0¹™±¥ÁÁ•((€€€¥˜€¡½±€„ôô¹Õ±°€˜˜±¥¹­1…å•ÉÌ¹ÕÉÉ•¹Ñm½±‘tü¹½¹Ñ…¥¹Ì¡‘½Õµ•¹Ð¹…Ñ¥Ù•±•µ•¹Ð¤¤‰ÕÑÑ½¹Ì¹ÕÉÉ•¹Ñm½±‘tü¹™½ÕÌ¡ìÁÉ•Ù•¹ÑMÉ½±°èÑÉÕ”ô¤(€€€0¹™±¥ÁÁ•€ô¥¹‘•à(€€€¥˜€ …0¹™±¥ÁÁ•‘½¹ÑÉ½±±•¤Í•Ñ%¹¹•É±¥ÁÁ•¡¥¹‘•à¤(€€€…±±‰…­Ì¹ÕÉÉ•¹Ð¹½¹±¥ÁÁ•‘¡…¹”ü¸¡¥¹‘•à¤(€ô°mt¤((€I•…Ð¹ÕÍ•™™•Ð  ¤€ôøì(€€€½¹ÍÐµ•‘¥„€ôÝ¥¹‘½Ü¹µ…Ñ¡5•‘¥„ ˆ¡ÁÉ•™•ÉÌµÉ•‘Õ•µµ½Ñ¥½¸èÉ•‘Õ”¤ˆ¤(€€€½¹ÍÐÕÁ‘…Ñ”€ô€ ¤€ôøÍ•ÑI•‘Õ•¡µ•‘¥„¹µ…Ñ¡•Ì¤(€€€ÕÁ‘…Ñ” ¤(€€€µ•‘¥„¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰¡…¹”ˆ°ÕÁ‘…Ñ”¤(€€€É•ÑÕÉ¸€ ¤€ôøµ•‘¥„¹É•µ½Ù•Ù•¹Ñ1¥ÍÑ•¹•È ‰¡…¹”ˆ°ÕÁ‘…Ñ”¤(€ô°mt¤((€I•…Ð¹ÕÍ•™™•Ð  ¤€ôøì(€€€Í•ÑA±…å¥¹œ¡…ÕÑ½Á±…ä¤(€ô°m…ÕÑ½Á±…åt¤((€I•…Ð¹ÕÍ•1…å½ÕÑ™™•Ð  ¤€ôøì(€€€½¹ÍÐÍÑ…”€ôÍÑ…•I•˜¹ÕÉÉ•¹Ð(€€€¥˜€ …ÍÑ…”¤É•ÑÕÉ¸(€€€½¹ÍÐµ•…ÍÕÉ”€ô€¡Ý¥‘Ñ è¹Õµ‰•È¤€ôøì(€€€€€½¹ÍÐ¸€ô5…Ñ ¹µ…à Ä°±¥Ù”¹ÕÉÉ•¹Ð¹½Õ¹Ð¤(€€€€€½¹ÍÐÉ…¥±\€ô5…Ñ ¹µ¥¸¡5a}\°€¡Ý¥‘Ñ €´€ÐÀ¤€¼€¡¸€¨I%1}A%Q!}5%8€¬€À¸Ð¤¤(€€€€€½¹ÍÐ…É½ÕÍ•°€ôÉ…¥±\€ð5%9}I%1}\(€€€€€½¹ÍÐ\€ô5…Ñ ¹É½Õ¹ ¡…É½ÕÍ•°€ü±…µÀ¡Ý¥‘Ñ €¨€À¸Ì°€äØ°€ÄÄà¤€èÉ…¥±\¤€¨€Ð¤€¼€Ð(€€€€€Í•ÑM¥é” ¡½±¤€ôø€¡5…Ñ ¹…‰Ì¡½±¹Ý¥‘Ñ €´Ý¥‘Ñ ¤€ð€À¸Ô€˜˜½±¹…É½ÕÍ•°€ôôô…É½ÕÍ•°€˜˜½±¹\€ôôô\€ü½±€èìÝ¥‘Ñ °\°…É½ÕÍ•°ô¤¤(€€€ô(€€€µ•…ÍÕÉ”¡ÍÑ…”¹±¥•¹Ñ]¥‘Ñ ¤(€€€½¹ÍÐ½‰Í•ÉÙ•È€ô¹•ÜI•Í¥é•=‰Í•ÉÙ•È ¡•¹ÑÉ¥•Ì¤€ôøì(€€€€€½¹ÍÐ‰½à€ô•¹ÑÉ¥•ÍlÁt(€€€€€¥˜€¡‰½à¤µ•…ÍÕÉ”¡‰½à¹½¹Ñ•¹ÑI•Ð¹Ý¥‘Ñ ¤(€€€ô¤(€€€½‰Í•ÉÙ•È¹½‰Í•ÉÙ”¡ÍÑ…”¤(€€€É•ÑÕÉ¸€ ¤€ôø½‰Í•ÉÙ•È¹‘¥Í½¹¹•Ð ¤(€ô°m½Õ¹Ñt¤((€½¹ÍÐÁ…¥¹Ð€ôI•…Ð¹ÕÍ•…±±‰…¬ ¡¤è¹Õµ‰•È¤€ôøì(€€€½¹ÍÐÌ€ôÍ¥´¹ÕÉÉ•¹Ð(€€€½¹ÍÐœ€ô±¥Ù”¹ÕÉÉ•¹Ð¹•¼(€€€½¹ÍÐÍ±½Ð€ôÍ±½ÑÌ¹ÕÉÉ•¹Ñm¥t(€€€¥˜€ …Í±½Ð¤É•ÑÕÉ¸(€€€Í±½Ð¹ÍÑå±”¹ÑÉ…¹Í™½É´€ôÑÉ…¹Í±…Ñ”Í ‘ì ¡Ì¹ám¥t€üü€À¤€´œ¹\€¼€È¤¹Ñ½¥á• È¥õÁà°À°À¥€(€€€½¹ÍÐÍÜ€ôÌ¹ÍÝm¥t€üü€À(€€€½¹ÍÐÍÝ¥¹œ€ôÍÝ¥¹Ì¹ÕÉÉ•¹Ñm¥t(€€€¥˜€¡ÍÝ¥¹œ¤ÍÝ¥¹œ¹ÍÑå±”¹ÑÉ…¹Í™½É´€ôÉ½Ñ…Ñ” ‘íÍÜ¹Ñ½¥á• Ì¥õ‘•œ¥€(€€€½¹ÍÐÍÐ€ôÌ¹ÍÑm¥t€üü€À(€€€ÍÑÉ…ÁÌ¹ÕÉÉ•¹Ñm¥tü¹ÍÑå±”¹Í•ÑAÉ½Á•ÉÑä ˆ´µÍÑÉ•Ñ ˆ°€‘íÍÐ¹Ñ½¥á• È¥õÁá€¤(€€€½¹ÍÐ½É€ô½É‘Ì¹ÕÉÉ•¹Ñm¥t(€€€¥˜€¡½É¤½É¹ÍÑå±”¹ÑÉ…¹Í™½É´€ôÍ…±•d ‘í5…Ñ ¹µ…à À¸ÄÈ°€¡œ¹½É‘I•ÍÐ€¬ÍÐ¤€¼œ¹½É‘I•ÍÐ¤¹Ñ½¥á• Ð¥ô¥€(€€€½¹ÍÐ±¥™Ð€ôÌ¹±¥™Ñm¥t€üü€À(€€€½¹ÍÐÁ½À€ôÌ¹Á½Ám¥t€üü€À(€€€½¹ÍÐ¡…¹œ€ô¡…¹Ì¹ÕÉÉ•¹Ñm¥t(€€€¥˜€¡¡…¹œ¤(€€€€€¡…¹œ¹ÍÑå±”¹ÑÉ…¹Í™½É´€ôÑÉ…¹Í±…Ñ”Í À°‘ì¡ÍÐ€´€Ð€¨±¥™Ð¤¹Ñ½¥á• È¥õÁà°À¤É½Ñ…Ñ” ‘ì ¡Ì¹‰•Ñ…m¥t€üü€À¤€´ÍÜ€¬€¡Ì¹Éém¥t€üü€À¤¤¹Ñ½¥á• Ì¥õ‘•œ¤Í…±” ‘ì Ä€¬€À¸Àà€¨Á½À¤¹Ñ½¥á• Ð¥ô¥€(€€€½¹ÍÐÉä€ôÌ¹Éåm¥t€üü€À(€€€½¹ÍÐ™±¥À€ô™±¥ÁÌ¹ÕÉÉ•¹Ñm¥t(€€€½¹ÍÐ™…¥¹œ€ô5…Ñ ¹…‰Ì¡5…Ñ ¹½Ì ¡Éä€¨5…Ñ ¹A$¤€¼€ÄàÀ¤¤(€€€¥˜€¡™±¥À¤ì(€€€€€™±¥À¹ÍÑå±”¹ÑÉ…¹Í™½É´€ôÁ•ÉÍÁ•Ñ¥Ù” ‘íAIMAQ%YõÁà¤É½Ñ…Ñ•d ‘íÉä¹Ñ½¥á• È¥õ‘•œ¥€(€€€€€™±¥À¹ÍÑå±”¹Í•ÑAÉ½Á•ÉÑä ˆ´µÍ¡…‘”ˆ°€  Ä€´™…¥¹œ¤€¨€À¸ÐÔ¤¹Ñ½¥á• Ì¤¤(€€€€€½¹ÍÐÁ¡¤€ô€   ¡Éä€¬€äÀ¤€”€ÄàÀ¤€¬€ÄàÀ¤€”€ÄàÀ¤€´€äÀ(€€€€€™±¥À¹ÍÑå±”¹Í•ÑAÉ½Á•ÉÑä ˆ´µàˆ°€‘ì¡Á¡¤€¨€À¸ä¤¹Ñ½¥á• Ä¥ô•€¤(€€€ô(€€€½¹ÍÐÍ¡…‘½Ü€ôÍ¡…‘½ÝÌ¹ÕÉÉ•¹Ñm¥t(€€€¥˜€¡Í¡…‘½Ü¤ì(€€€€€Í¡…‘½Ü¹ÍÑå±”¹ÑÉ…¹Í™½É´€ôÑÉ…¹Í±…Ñ”Í ‘ì¡œ¹\€¨€À¸ÀÐÔ€¬±¥™Ð€¨€Ì€¨œ¹Ô¤¹Ñ½¥á• È¥õÁà°‘ì¡œ¹ €¨€À¸ÀÌ€¬±¥™Ð€¨€Ü€¨œ¹Ô¤¹Ñ½¥á• È¥õÁà°À¤Í…±” ‘ì¡5…Ñ ¹µ…à À¸ÄÈ°™…¥¹œ¤€¨€ Ä€¬€À¸ÀÌ€¨±¥™Ð€¬€À¸ÀÔ€¨Á½À¤¤¹Ñ½¥á• Ì¥ô°‘ì Ä€¬€À¸ÀÌ€¨±¥™Ð€¬€À¸ÀÔ€¨Á½À¤¹Ñ½¥á• Ì¥ô¥€(€€€€€Í¡…‘½Ü¹ÍÑå±”¹½Á…¥Ñä€ô€ À¸ÜÈ€¬€À¸Èà€¨±¥™Ð¤¹Ñ½¥á• Ì¤(€€€ô(€€€½¹ÍÐ±…å•È€ô±¥¹­1…å•ÉÌ¹ÕÉÉ•¹Ñm¥t((€€€½¹ÍÐ½¸€ô€„…±…å•È€˜˜5…Ñ ¹…‰Ì¡Éä€´€ÄàÀ¤€ð€¡±…å•È¹ÍÑå±”¹Ù¥Í¥‰¥±¥Ñä€ôôô€‰Ù¥Í¥‰±”ˆ€ü€ÈÐ€è€ä¤(€€€¥˜€¡±…å•È¤ì(€€€€€±…å•È¹ÍÑå±”¹½Á…¥Ñä€ô½¸€ü€ˆÄˆ€è€ˆÀˆ(€€€€€±…å•È¹ÍÑå±”¹Ù¥Í¥‰¥±¥Ñä€ô½¸€ü€‰Ù¥Í¥‰±”ˆ€è€‰¡¥‘‘•¸ˆ(€€€ô(€€€™±¥Àü¹ÍÑå±”¹Í•ÑAÉ½Á•ÉÑä ˆ´µ‘É…Ý¸ˆ°½¸€ü€ˆÀˆ€è€ˆÄˆ¤(€ô°mt¤((€½¹ÍÐÍÑ•À€ôI•…Ð¹ÕÍ•…±±‰…¬ (€€€€¡¹½Üè¹Õµ‰•È¤€ôøì(€€€€€½¹ÍÐÌ€ôÍ¥´¹ÕÉÉ•¹Ð(€€€€€½¹ÍÐ0€ô±¥Ù”¹ÕÉÉ•¹Ð(€€€€€½¹ÍÐ¸€ô0¹½Õ¹Ð(€€€€€½¹ÍÐœ€ô0¹•¼(€€€€€½¹ÍÐìÝ¥‘Ñ °…É½ÕÍ•°ô€ô0¹Í¥é”(€€€€€½¹ÍÐ‘Ð€ôÌ¹±…ÍÐ€ü5…Ñ ¹µ¥¸ À¸Ä°€¡¹½Ü€´Ì¹±…ÍÐ¤€¼€ÄÀÀÀ¤€è€Ä€¼€ØÀ(€€€€€Ì¹±…ÍÐ€ô¹½Ü((€€€€€½¹ÍÐÍÕˆ€ô5…Ñ ¹µ…à Ì°5…Ñ ¹•¥°¡‘Ð€¼€À¸ÀÀØ¤¤(€€€€€½¹ÍÐ €ô‘Ð€¼ÍÕˆ(€€€€€±•Ð‰ÕÍä€ô™…±Í”(€€€€€™½È€¡±•Ð¬€ô€Àì¬€ðÍÕˆì¬¬¬¤ì(€€€€€€€™½È€¡±•Ð¤€ô€Àì¤€ð¸ì¤¬¬¤ì(€€€€€€€€€½¹ÍÐ‰•™½É”€ôÌ¹Ùám¥t€üü€À(€€€€€€€€€¥˜€¡¤€„ôôÌ¹‘É…œ¤ì(€€€€€€€€€€€½¹ÍÐÉ•ÍÑ½É¥¹œ€ô¹½Ü€øÌ¹™É•”(€€€€€€€€€€€½¹ÍÐ…à€ôÉ•ÍÑ½É¥¹œ€ü€´ÄÌÀ€¨€ ¡Ì¹ám¥t€üü€À¤€´€¡Ì¹Ñám¥t€üü€À¤¤€´€È€¨5…Ñ ¹ÍÅÉÐ ÄÌÀ¤€¨€À¸àØ€¨‰•™½É”€è€´Ì¸È€¨‰•™½É”(€€€€€€€€€€€Ì¹Ùám¥t€ô‰•™½É”€¬…à€¨ (€€€€€€€€€€€Ì¹ám¥t€ô€¡Ì¹ám¥t€üü€À¤€¬€¡Ì¹Ùám¥t€üü€À¤€¨ (€€€€€€€€€ô(€€€€€€€ô(€€€€€€€¥˜€ ……É½ÕÍ•°€˜˜¸€ø€À¤ì(€€€€€€€€€½¹ÍÐm±•™Ð°É¥¡Ñt€ôÍÑ½ÁÌ¡Ì°œ¹\°Ý¥‘Ñ °¸¤(€€€€€€€€€¥˜€¡Ì¹‘É…œ€øô€À¤ì(€€€€€€€€€€€½¹ÍÐ€ôÌ¹‘É…œ(€€€€€€€€€€€™½È€¡±•Ð¨€ô€´€Äì¨€øô€Àì¨´´¤ì(€€€€€€€€€€€€€½¹ÍÐ±¥µ¥Ð€ô€¡Ì¹ám¨€¬€Åt€üü€À¤€´µ¥¹…À¡Ì°œ¹\°¨°¨€¬€Ä¤(€€€€€€€€€€€€€¥˜€ ¡Ì¹ám©t€üü€À¤€ø±¥µ¥Ð¤ì(€€€€€€€€€€€€€€€Ì¹ám©t€ô±¥µ¥Ð(€€€€€€€€€€€€€€€Ì¹Ùám©t€ô5…Ñ ¹µ¥¸¡Ì¹Ùám©t€üü€À°Ì¹Ùám¨€¬€Åt€üü€À¤(€€€€€€€€€€€€€ô(€€€€€€€€€€€ô(€€€€€€€€€€€™½È€¡±•Ð¨€ô€¬€Äì¨€ð¸ì¨¬¬¤ì(€€€€€€€€€€€€€½¹ÍÐ±¥µ¥Ð€ô€¡Ì¹ám¨€´€Åt€üü€À¤€¬µ¥¹…À¡Ì°œ¹\°¨€´€Ä°¨¤(€€€€€€€€€€€€€¥˜€ ¡Ì¹ám©t€üü€À¤€ð±¥µ¥Ð¤ì(€€€€€€€€€€€€€€€Ì¹ám©t€ô±¥µ¥Ð(€€€€€€€€€€€€€€€Ì¹Ùám©t€ô5…Ñ ¹µ…à¡Ì¹Ùám©t€üü€À°Ì¹Ùám¨€´€Åt€üü€À¤(€€€€€€€€€€€€€ô(€€€€€€€€€€€ô(€€€€€€€€€ô•±Í”ì(€€€€€€€€€€€™½È€¡±•ÐÁ…ÍÌ€ô€ÀìÁ…ÍÌ€ð€ÌìÁ…ÍÌ¬¬¤ì(€€€€€€€€€€€€€™½È€¡±•Ð¨€ô€Àì¨€ð¸€´€Äì¨¬¬¤ì(€€€€€€€€€€€€€€€½¹ÍÐ„€ôÌ¹ám©t€üü€À(€€€€€€€€€€€€€€€½¹ÍÐˆ€ôÌ¹ám¨€¬€Åt€üü€À(€€€€€€€€€€€€€€€½¹ÍÐ½Ù•É±…À€ôµ¥¹…À¡Ì°œ¹\°¨°¨€¬€Ä¤€´€¡ˆ€´„¤(€€€€€€€€€€€€€€€¥˜€¡½Ù•É±…À€ðô€À¤½¹Ñ¥¹Õ”(€€€€€€€€€€€€€€€Ì¹ám©t€ô„€´½Ù•É±…À€¼€È(€€€€€€€€€€€€€€€Ì¹ám¨€¬€Åt€ôˆ€¬½Ù•É±…À€¼€È(€€€€€€€€€€€€€€€½¹ÍÐÙ„€ôÌ¹Ùám©t€üü€À(€€€€€€€€€€€€€€€½¹ÍÐÙˆ€ôÌ¹Ùám¨€¬€Åt€üü€À(€€€€€€€€€€€€€€€¥˜€¡Ù„€øÙˆ¤ì(€€€€€€€€€€€€€€€€€½¹ÍÐÍ¡…É•€ô€¡Ù„€¬Ùˆ¤€¼€È(€€€€€€€€€€€€€€€€€Ì¹Ùám©t€ôÍ¡…É•(€€€€€€€€€€€€€€€€€Ì¹Ùám¨€¬€Åt€ôÍ¡…É•(€€€€€€€€€€€€€€€ô(€€€€€€€€€€€€€ô(€€€€€€€€€€€ô(€€€€€€€€€€€¥˜€ ¡Ì¹álÁt€üü€À¤€ð±•™Ð¤ì(€€€€€€€€€€€€€Ì¹álÁt€ô±•™Ð(€€€€€€€€€€€€€Ì¹ÙálÁt€ô5…Ñ ¹…‰Ì¡Ì¹ÙálÁt€üü€À¤€¨€À¸Ì(€€€€€€€€€€€ô(€€€€€€€€€€€™½È€¡±•Ð¨€ô€Äì¨€ð¸ì¨¬¬¤Ì¹ám©t€ô5…Ñ ¹µ…à¡Ì¹ám©t€üü€À°€¡Ì¹ám¨€´€Åt€üü€À¤€¬µ¥¹…À¡Ì°œ¹\°¨€´€Ä°¨¤¤(€€€€€€€€€€€¥˜€ ¡Ì¹ám¸€´€Åt€üü€À¤€øÉ¥¡Ð¤ì(€€€€€€€€€€€€€Ì¹ám¸€´€Åt€ôÉ¥¡Ð(€€€€€€€€€€€€€Ì¹Ùám¸€´€Åt€ô€µ5…Ñ ¹…‰Ì¡Ì¹Ùám¸€´€Åt€üü€À¤€¨€À¸Ì(€€€€€€€€€€€ô(€€€€€€€€€€€™½È€¡±•Ð¨€ô¸€´€Èì¨€øô€Àì¨´´¤Ì¹ám©t€ô5…Ñ ¹µ¥¸¡Ì¹ám©t€üü€À°€¡Ì¹ám¨€¬€Åt€üü€À¤€´µ¥¹…À¡Ì°œ¹\°¨°¨€¬€Ä¤¤(€€€€€€€€€ô(€€€€€€€ô(€€€€€€€™½È€¡±•Ð¤€ô€Àì¤€ð¸ì¤¬¬¤ì(€€€€€€€€€½¹ÍÐ‘Ø€ô€¡Ì¹Ùám¥t€üü€À¤€´€¡Ì¹Áám¥t€üü€À¤(€€€€€€€€€Ì¹Áám¥t€ôÌ¹Ùám¥t€üü€À(€€€€€€€€€¥˜€¡¤€„ôôÌ¹ÁÕ±°¤ì(€€€€€€€€€€€½¹ÍÐÍÜ€ôÌ¹ÍÝm¥t€üü€À(€€€€€€€€€€€½¹ÍÐÙÍÜ€ô±…µÀ ¡Ì¹ÙÍÝm¥t€üü€À¤€¬€¡œ¹½ÕÁ±•m¥t€üü€À¸ÀÜ¤€¨±…µÀ¡‘Ø°€´äÀÀ°€äÀÀ¤°€´äÀ°€äÀ¤(€€€€€€€€€€€½¹ÍÐ¹•áÐ€ôÙÍÜ€¬€ ´¡œ¹ÍÝ¥¹-m¥t€üüM]%9},¤€¨ÍÜ€´M]%9}5@€¨ÙÍÜ¤€¨ (€€€€€€€€€€€Ì¹ÙÍÝm¥t€ô¹•áÐ(€€€€€€€€€€€Ì¹ÍÝm¥t€ô±…µÀ¡ÍÜ€¬¹•áÐ€¨ °€´Äà°€Äà¤(€€€€€€€€€ô(€€€€€€€€€Ì¹‰•Ñ…m¥t€ô€¡Ì¹‰•Ñ…m¥t€üü€À¤€¬€ ¡Ì¹ÍÝm¥t€üü€À¤€´€¡Ì¹‰•Ñ…m¥t€üü€À¤¤€¨5…Ñ ¹µ¥¸ Ä° €¼1¤(€€€€€€€€€ÍÁÉ¥¹œ¡Ì¹Éä°Ì¹ÙÉä°Ì¹ÑÉm¥t€üü€À°¤°€ÄÜÀ°€À¸ØÈ° ¤(€€€€€€€€€ÍÁÉ¥¹œ¡Ì¹Éè°Ì¹ÙÉè°Ì¹Ñém¥t€üü€À°¤°€ÄÈÀ°€À¸à° ¤(€€€€€€€€€ÍÁÉ¥¹œ¡Ì¹±¥™Ð°Ì¹Ù±¥™Ð°Ì¹Ñ±m¥t€üü€À°¤°€ÈÀÀ°€À¸ÜÔ° ¤(€€€€€€€€€ÍÁÉ¥¹œ¡Ì¹Á½À°Ì¹ÙÁ½À°Ì¹ÑÁm¥t€üü€À°¤°€ÄØÀ°€À¸ÔÔ° ¤(€€€€€€€€€¥˜€¡¤€„ôôÌ¹ÁÕ±°¤ì(€€€€€€€€€€€ÍÁÉ¥¹œ¡Ì¹ÍÐ°Ì¹ÙÍÐ°€À°¤°I1},°I1}iQ° ¤(€€€€€€€€€€€Ì¹ÍÑm¥t€ô5…Ñ ¹µ…à µœ¹½É‘I•ÍÐ€¨€À¸àÔ°Ì¹ÍÑm¥t€üü€À¤(€€€€€€€€€ô(€€€€€€€ô(€€€€€€€™½È€¡±•Ð„€ô€Àì„€ð¸€´€Äì„¬¬¤ì(€€€€€€€€€½¹ÍÐˆ€ô„€¬€Ä(€€€€€€€€€¥˜€ ¡Ì¹ám‰t€üü€À¤€ðô€¡Ì¹ám…t€üü€À¤¤½¹Ñ¥¹Õ”(€€€€€€€€€½¹ÍÐm…Q½À°…	½ÑÑ½´°…ÉµQ½À°…Éµ	½ÑÑ½µt€ô…É‘‘”¡Ì°œ°„°€Ä¤(€€€€€€€€€½¹ÍÐm‰Q½À°‰	½ÑÑ½´°‰ÉµQ½À°‰Éµ	½ÑÑ½µt€ô…É‘‘”¡Ì°œ°ˆ°€´Ä¤(€€€€€€€€€½¹ÍÐÑ½Áá•ÍÌ€ô…Q½À€´‰Q½À€¬€È(€€€€€€€€€½¹ÍÐ‰½ÑÑ½µá•ÍÌ€ô…	½ÑÑ½´€´‰	½ÑÑ½´€¬€È(€€€€€€€€€½¹ÍÐ•á•ÍÌ€ô5…Ñ ¹µ…à¡Ñ½Áá•ÍÌ°‰½ÑÑ½µá•ÍÌ¤(€€€€€€€€€¥˜€¡•á•ÍÌ€ðô€À¤½¹Ñ¥¹Õ”(€€€€€€€€€½¹ÍÐ…É´€ô5…Ñ ¹µ…à ÐÀ°Ñ½Áá•ÍÌ€ø‰½ÑÑ½µá•ÍÌ€ü€¡…ÉµQ½À€¬‰ÉµQ½À¤€¼€È€è€¡…Éµ	½ÑÑ½´€¬‰Éµ	½ÑÑ½´¤€¼€È¤(€€€€€€€€€½¹ÍÐÁÕÍ €ô€¡5…Ñ ¹…Í¥¸¡±…µÀ¡•á•ÍÌ€¼…É´°€À°€Ä¤¤€¨€ÄàÀ¤€¼5…Ñ ¹A$(€€€€€€€€€½¹ÍÐÍ¡…É”€ô„€ôôôÌ¹ÁÕ±°€ü€À€èˆ€ôôôÌ¹ÁÕ±°€ü€Ä€è€À¸Ô(€€€€€€€€€Ì¹ÍÝm…t€ô±…µÀ ¡Ì¹ÍÝm…t€üü€À¤€¬ÁÕÍ €¨Í¡…É”°€´Äà°€Äà¤(€€€€€€€€€Ì¹‰•Ñ…m…t€ô€¡Ì¹‰•Ñ…m…t€üü€À¤€¬ÁÕÍ €¨Í¡…É”(€€€€€€€€€Ì¹ÍÝm‰t€ô±…µÀ ¡Ì¹ÍÝm‰t€üü€À¤€´ÁÕÍ €¨€ Ä€´Í¡…É”¤°€´Äà°€Äà¤(€€€€€€€€€Ì¹‰•Ñ…m‰t€ô€¡Ì¹‰•Ñ…m‰t€üü€À¤€´ÁÕÍ €¨€ Ä€´Í¡…É”¤(€€€€€€€€€½¹ÍÐÙ„€ôÌ¹ÙÍÝm…t€üü€À(€€€€€€€€€½¹ÍÐÙˆ€ôÌ¹ÙÍÝm‰t€üü€À(€€€€€€€€€¥˜€¡Ùˆ€´Ù„€ø€À¤ì(€€€€€€€€€€€½¹ÍÐµ•…¸€ô€¡Ù„€¬Ùˆ¤€¼€È(€€€€€€€€€€€¥˜€¡„€„ôôÌ¹ÁÕ±°¤Ì¹ÙÍÝm…t€ôµ•…¸€¬€¡Ùˆ€´Ù„¤€¨€À¸ÄÔ(€€€€€€€€€€€¥˜€¡ˆ€„ôôÌ¹ÁÕ±°¤Ì¹ÙÍÝm‰t€ôµ•…¸€´€¡Ùˆ€´Ù„¤€¨€À¸ÄÔ(€€€€€€€€€ô(€€€€€€€ô(€€€€€ô(€€€€€™½È€¡±•Ð¤€ô€Àì¤€ð¸ì¤¬¬¤ì(€€€€€€€Á…¥¹Ð¡¤¤(€€€€€€€¥˜€ (€€€€€€€€€5…Ñ ¹…‰Ì¡Ì¹Ùám¥t€üü€À¤€ø€À¸Ðñð(€€€€€€€€€€¡¹½Ü€øÌ¹™É•”€˜˜5…Ñ ¹…‰Ì ¡Ì¹ám¥t€üü€À¤€´€¡Ì¹Ñám¥t€üü€À¤¤€ø€À¸ÈÔ¤ñð(€€€€€€€€€5…Ñ ¹…‰Ì ¡Ì¹Éåm¥t€üü€À¤€´€¡Ì¹ÑÉm¥t€üü€À¤¤€ø€À¸ÀÔñð(€€€€€€€€€5…Ñ ¹…‰Ì¡Ì¹ÙÉåm¥t€üü€À¤€ø€À¸ÀÔñð(€€€€€€€€€5…Ñ ¹…‰Ì ¡Ì¹Éém¥t€üü€À¤€´€¡Ì¹Ñém¥t€üü€À¤¤€ø€À¸ÀÈñð(€€€€€€€€€5…Ñ ¹…‰Ì¡Ì¹ÙÉém¥t€üü€À¤€ø€À¸ÀÔñð(€€€€€€€€€5…Ñ ¹…‰Ì ¡Ì¹±¥™Ñm¥t€üü€À¤€´€¡Ì¹Ñ±m¥t€üü€À¤¤€ø€À¸ÀÀÈñð(€€€€€€€€€5…Ñ ¹…‰Ì¡Ì¹Ù±¥™Ñm¥t€üü€À¤€ø€À¸ÀÄñð(€€€€€€€€€5…Ñ ¹…‰Ì ¡Ì¹Á½Ám¥t€üü€À¤€´€¡Ì¹ÑÁm¥t€üü€À¤¤€ø€À¸ÀÀÈñð(€€€€€€€€€5…Ñ ¹…‰Ì¡Ì¹ÙÁ½Ám¥t€üü€À¤€ø€À¸ÀÄñð(€€€€€€€€€5…Ñ ¹…‰Ì¡Ì¹ÍÝm¥t€üü€À¤€ø€À¸ÀÈñð(€€€€€€€€€5…Ñ ¹…‰Ì¡Ì¹ÙÍÝm¥t€üü€À¤€ø€À¸ÀÔñð(€€€€€€€€€5…Ñ ¹…‰Ì ¡Ì¹‰•Ñ…m¥t€üü€À¤€´€¡Ì¹ÍÝm¥t€üü€À¤¤€ø€À¸ÀÄñð(€€€€€€€€€5…Ñ ¹…‰Ì¡Ì¹ÍÑm¥t€üü€À¤€ø€À¸ÀÔñð(€€€€€€€€€5…Ñ ¹…‰Ì¡Ì¹ÙÍÑm¥t€üü€À¤€ø€À¸Ä(€€€€€€€€¤(€€€€€€€€€‰ÕÍä€ôÑÉÕ”(€€€€€ô(€€€€€¥˜€¡Ì¹‘É…œ€øô€ÀñðÌ¹ÁÕ±°€øô€Àñð¹½Ü€ðÌ¹™É•”¤‰ÕÍä€ôÑÉÕ”(€€€€€¥˜€¡‰ÕÍä¤Ì¹É…˜€ôÉ•ÅÕ•ÍÑ¹¥µ…Ñ¥½¹É…µ”¡ÍÑ•À¤(€€€€€•±Í”ì(€€€€€€€Ì¹É…˜€ô€À(€€€€€€€Ì¹±…ÍÐ€ô€À(€€€€€€€™½È€¡±•Ð¤€ô€Àì¤€ð¸ì¤¬¬¤ì(€€€€€€€€€¥˜€¡¹½Ü€øÌ¹™É•”¤ì(€€€€€€€€€€€Ì¹ám¥t€ôÌ¹Ñám¥t€üü€À(€€€€€€€€€€€Ì¹Ùám¥t€ô€À(€€€€€€€€€€€Ì¹Áám¥t€ô€À(€€€€€€€€€ô(€€€€€€€€€Ì¹ÍÝm¥t€ô€À(€€€€€€€€€Ì¹ÙÍÝm¥t€ô€À(€€€€€€€€€Ì¹‰•Ñ…m¥t€ô€À(€€€€€€€€€Ì¹ÍÑm¥t€ô€À(€€€€€€€€€Ì¹ÙÍÑm¥t€ô€À(€€€€€€€€€Ì¹Éåm¥t€ôÌ¹ÑÉm¥t€üü€À(€€€€€€€€€Ì¹ÙÉåm¥t€ô€À(€€€€€€€€€Ì¹Éém¥t€ôÌ¹Ñém¥t€üü€À(€€€€€€€€€Ì¹ÙÉém¥t€ô€À(€€€€€€€€€Ì¹±¥™Ñm¥t€ôÌ¹Ñ±m¥t€üü€À(€€€€€€€€€Ì¹Ù±¥™Ñm¥t€ô€À(€€€€€€€€€Ì¹Á½Ám¥t€ôÌ¹ÑÁm¥t€üü€À(€€€€€€€€€Ì¹ÙÁ½Ám¥t€ô€À(€€€€€€€€€Á…¥¹Ð¡¤¤(€€€€€€€ô(€€€€€ô(€€€ô°(€€€mÁ…¥¹Ñt°(€€¤((€½¹ÍÐÍ¹…À€ôI•…Ð¹ÕÍ•…±±‰…¬  ¤€ôøì(€€€½¹ÍÐÌ€ôÍ¥´¹ÕÉÉ•¹Ð(€€€™½È€¡±•Ð¤€ô€Àì¤€ð±¥Ù”¹ÕÉÉ•¹Ð¹½Õ¹Ðì¤¬¬¤ì(€€€€€Ì¹ám¥t€ôÌ¹Ñám¥t€üü€À(€€€€€Ì¹Ùám¥t€ô€À(€€€€€Ì¹Áám¥t€ô€À(€€€€€Ì¹ÍÝm¥t€ô€À(€€€€€Ì¹ÙÍÝm¥t€ô€À(€€€€€Ì¹‰•Ñ…m¥t€ô€À(€€€€€¥˜€¡¤€„ôôÌ¹ÁÕ±°¤ì(€€€€€€€Ì¹ÍÑm¥t€ô€À(€€€€€€€Ì¹ÙÍÑm¥t€ô€À(€€€€€ô(€€€€€Ì¹Éåm¥t€ôÌ¹ÑÉm¥t€üü€À(€€€€€Ì¹ÙÉåm¥t€ô€À(€€€€€Ì¹Éém¥t€ôÌ¹Ñém¥t€üü€À(€€€€€Ì¹ÙÉém¥t€ô€À(€€€€€Ì¹±¥™Ñm¥t€ôÌ¹Ñ±m¥t€üü€À(€€€€€Ì¹Ù±¥™Ñm¥t€ô€À(€€€€€Ì¹Á½Ám¥t€ôÌ¹ÑÁm¥t€üü€À(€€€€€Ì¹ÙÁ½Ám¥t€ô€À(€€€€€Á…¥¹Ð¡¤¤(€€€ô(€ô°mÁ…¥¹Ñt¤((€½¹ÍÐ­¥¬€ôI•…Ð¹ÕÍ•…±±‰…¬  ¤€ôøì(€€€½¹ÍÐÌ€ôÍ¥´¹ÕÉÉ•¹Ð(€€€¥˜€¡±¥Ù”¹ÕÉÉ•¹Ð¹É•‘Õ•¤ì(€€€€€…¹•±¹¥µ…Ñ¥½¹É…µ”¡Ì¹É…˜¤(€€€€€Ì¹É…˜€ô€À(€€€€€Í¹…À ¤(€€€€€É•ÑÕÉ¸(€€€ô(€€€¥˜€ …Ì¹É…˜¤ì(€€€€€Ì¹±…ÍÐ€ô€À(€€€€€Ì¹É…˜€ôÉ•ÅÕ•ÍÑ¹¥µ…Ñ¥½¹É…µ”¡ÍÑ•À¤(€€€ô(€ô°mÍ¹…À°ÍÑ•Át¤((€½¹ÍÐ¥µÁÕ±Í”€ôI•…Ð¹ÕÍ•…±±‰…¬ (€€€€¡¤è¹Õµ‰•È°…µ½Õ¹Ðè¹Õµ‰•È¤€ôøì(€€€€€½¹ÍÐÌ€ôÍ¥´¹ÕÉÉ•¹Ð(€€€€€¥˜€¡±¥Ù”¹ÕÉÉ•¹Ð¹É•‘Õ•ñð¤€ð€Àñð¤€øô±¥Ù”¹ÕÉÉ•¹Ð¹½Õ¹Ð¤É•ÑÕÉ¸(€€€€€Ì¹ÙÍÝm¥t€ô€¡Ì¹ÙÍÝm¥t€üü€À¤€¬…µ½Õ¹Ð(€€€€€­¥¬ ¤(€€€ô°(€€€m­¥­t°(€€¤((€½¹ÍÐÑÕœ€ôI•…Ð¹ÕÍ•…±±‰…¬ (€€€€¡¤è¹Õµ‰•È°…µ½Õ¹Ðè¹Õµ‰•È¤€ôøì(€€€€€½¹ÍÐÌ€ôÍ¥´¹ÕÉÉ•¹Ð(€€€€€¥˜€¡±¥Ù”¹ÕÉÉ•¹Ð¹É•‘Õ•ñð¤€ð€Àñð¤€øô±¥Ù”¹ÕÉÉ•¹Ð¹½Õ¹Ð¤É•ÑÕÉ¸(€€€€€Ì¹ÙÍÑm¥t€ô€¡Ì¹ÙÍÑm¥t€üü€À¤€¬…µ½Õ¹Ð(€€€€€­¥¬ ¤(€€€ô°(€€€m­¥­t°(€€¤((€I•…Ð¹ÕÍ•1…å½ÕÑ™™•Ð  ¤€ôøì(€€€¥˜€ …Í¥é”¹Ý¥‘Ñ ¤É•ÑÕÉ¸(€€€½¹ÍÐÌ€ôÍ¥´¹ÕÉÉ•¹Ð(€€€½¹ÍÐ0€ô±¥Ù”¹ÕÉÉ•¹Ð(€€€½¹ÍÐ•¹Ñ•È€ôÍ¥é”¹…É½ÕÍ•°€ü€¡…Ñ¥Ù”€üü0¹…É½ÕÍ•±%¹‘•à¤€è¹Õ±°(€€€½¹ÍÐìáÌ°Ñ½Ñ…°ô€ô±…å½ÕÑQ…É•ÑÌ¡Í¥é”¹Ý¥‘Ñ °Í¥é”¹\°Í¥é”¹…É½ÕÍ•°°•¹Ñ•È°½Õ¹Ð¤(€€€0¹å±¥Œ€ôÑ½Ñ…°€ø€À(€€€½¹ÍÐ™É•Í €ôÌ¹à¹±•¹Ñ €„ôô½Õ¹ÐñðÌ¹…É½ÕÍ•°€„ôôÍ¥é”¹…É½ÕÍ•°(€€€Ì¹…É½ÕÍ•°€ôÍ¥é”¹…É½ÕÍ•°(€€€™½È€¡±•Ð¤€ô€Àì¤€ð½Õ¹Ðì¤¬¬¤ì(€€€€€½¹ÍÐÑà€ô€¡áÍm¥t€üü€À¤€¬€¡Í¥é”¹…É½ÕÍ•°€üÁ½¥¹Ñ•È¹ÕÉÉ•¹Ð¹ÍÝ¥Á”€è€À¤(€€€€€¥˜€ …™É•Í €˜˜Ñ½Ñ…°€ø€À¤ì(€€€€€€€½¹ÍÐÍ¡¥™Ð€ô5…Ñ ¹É½Õ¹ ¡Ñà€´€¡Ì¹Ñám¥t€üüÑà¤¤€¼Ñ½Ñ…°¤€¨Ñ½Ñ…°(€€€€€€€¥˜€¡Í¡¥™Ð¤Ì¹ám¥t€ô€¡Ì¹ám¥t€üü€À¤€¬Í¡¥™Ð(€€€€€ô(€€€€€Ì¹Ñám¥t€ôÑà(€€€€€½¹ÍÐ™É½¹Ð€ô™±¥ÁÁ•€ôôô¤ñð…Ñ¥Ù”€ôôô¤(€€€€€Ì¹ÑÉm¥t€ô™±¥ÁÁ•€ôôô¤€ü€ÄàÀ€è…Ñ¥Ù”€ôôô¤€ü€À€è€¡IMQ}em¤€”IMQ}d¹±•¹Ñ¡t€üü€À¤(€€€€€Ì¹Ñém¥t€ô™É½¹Ð€ü€À€è€¡IMQ}im¤€”IMQ}h¹±•¹Ñ¡t€üü€À¤(€€€€€Ì¹Ñ±m¥t€ô™É½¹Ð€ü€Ä€è€À(€€€€€Ì¹ÑÁm¥t€ô™±¥ÁÁ•€ôôô¤€ü€Ä€è€À(€€€€€¥˜€¡™É•Í ¤ì(€€€€€€€Ì¹ám¥t€ôÑà(€€€€€€€Ì¹Ùám¥t€ô€À(€€€€€€€Ì¹Áám¥t€ô€À(€€€€€€€Ì¹ÍÝm¥t€ô€À(€€€€€€€Ì¹ÙÍÝm¥t€ô€À(€€€€€€€Ì¹‰•Ñ…m¥t€ô€À(€€€€€€€Ì¹ÍÑm¥t€ô€À(€€€€€€€Ì¹ÙÍÑm¥t€ô€À(€€€€€€€Ì¹Éåm¥t€ôÌ¹ÑÉm¥t€üü€À(€€€€€€€Ì¹ÙÉåm¥t€ô€À(€€€€€€€Ì¹Éém¥t€ôÌ¹Ñém¥t€üü€À(€€€€€€€Ì¹ÙÉém¥t€ô€À(€€€€€€€Ì¹±¥™Ñm¥t€ôÌ¹Ñ±m¥t€üü€À(€€€€€€€Ì¹Ù±¥™Ñm¥t€ô€À(€€€€€€€Ì¹Á½Ám¥t€ôÌ¹ÑÁm¥t€üü€À(€€€€€€€Ì¹ÙÁ½Ám¥t€ô€À(€€€€€ô(€€€ô(€€€™½È€¡½¹ÍÐ­•ä½˜l(€€€€€€‰àˆ°(€€€€€€‰Ùàˆ°(€€€€€€‰Áàˆ°(€€€€€€‰Ñàˆ°(€€€€€€‰ÍÜˆ°(€€€€€€‰ÙÍÜˆ°(€€€€€€‰‰•Ñ„ˆ°(€€€€€€‰Éäˆ°(€€€€€€‰ÙÉäˆ°(€€€€€€‰ÑÈˆ°(€€€€€€‰Éèˆ°(€€€€€€‰ÙÉèˆ°(€€€€€€‰Ñèˆ°(€€€€€€‰±¥™Ðˆ°(€€€€€€‰Ù±¥™Ðˆ°(€€€€€€‰Ñ°ˆ°(€€€€€€‰Á½Àˆ°(€€€€€€‰ÙÁ½Àˆ°(€€€€€€‰ÑÀˆ°(€€€€€€‰ÍÐˆ°(€€€€€€‰ÙÍÐˆ°(€€€t…Ì½¹ÍÐ¤(€€€€€Ím­•åt¹±•¹Ñ €ô½Õ¹Ð(€€€¥˜€¡™É•Í ¤™½È€¡±•Ð¤€ô€Àì¤€ð½Õ¹Ðì¤¬¬¤Á…¥¹Ð¡¤¤(€€€­¥¬ ¤(€ô°mÍ¥é”°…Ñ¥Ù”°™±¥ÁÁ•°½Õ¹Ð°Á…¥¹Ð°­¥­t¤((€I•…Ð¹ÕÍ•™™•Ð  ¤€ôøì(€€€¥˜€¡É•‘Õ•¤­¥¬ ¤(€ô°mÉ•‘Õ•°­¥­t¤((€½¹ÍÐÍÝ…å•€ôI•…Ð¹ÕÍ•I•˜¡™…±Í”¤(€½¹ÍÐÉ•…‘ä€ôÍ¥é”¹Ý¥‘Ñ €ø€À(€I•…Ð¹ÕÍ•™™•Ð  ¤€ôøì(€€€¥˜€ …É•…‘äñðÉ•‘Õ•ñðÍÝ…å•¹ÕÉÉ•¹Ð¤É•ÑÕÉ¸(€€€½¹ÍÐÑ¥µ•ÉÌ€ôÉÉ…ä¹™É½´¡ì±•¹Ñ è½Õ¹Ðô°€¡|°¤¤€ôø(€€€€€Ý¥¹‘½Ü¹Í•ÑQ¥µ•½ÕÐ  ¤€ôø¥µÁÕ±Í”¡¤°€¡¤€”€È€ü€´Ä€è€Ä¤€¨€ ÌÀ€´€¡¤€”€Ð¤€¨€Ì¤¤°€ØÀ€¬¤€¨€ÜÀ¤°(€€€€¤(€€€½¹ÍÐ‘½¹”€ôÝ¥¹‘½Ü¹Í•ÑQ¥µ•½ÕÐ (€€€€€€ ¤€ôøì(€€€€€€€ÍÝ…å•¹ÕÉÉ•¹Ð€ôÑÉÕ”(€€€€€ô°(€€€€€€àÀ€¬½Õ¹Ð€¨€ÜÀ°(€€€€¤(€€€É•ÑÕÉ¸€ ¤€ôøì(€€€€€Ñ¥µ•ÉÌ¹™½É…  ¡Ð¤€ôøÝ¥¹‘½Ü¹±•…ÉQ¥µ•½ÕÐ¡Ð¤¤(€€€€€Ý¥¹‘½Ü¹±•…ÉQ¥µ•½ÕÐ¡‘½¹”¤(€€€ô(€ô°mÉ•…‘ä°É•‘Õ•°½Õ¹Ð°¥µÁÕ±Í•t¤((€I•…Ð¹ÕÍ•™™•Ð (€€€€ ¤€ôø€ ¤€ôøì(€€€€€…¹•±¹¥µ…Ñ¥½¹É…µ”¡Í¥´¹ÕÉÉ•¹Ð¹É…˜¤(€€€€€Í¥´¹ÕÉÉ•¹Ð¹É…˜€ô€À(€€€ô°(€€€mt°(€€¤((€½¹ÍÐÁÉ•Ù¥½ÕÌ€ôI•…Ð¹ÕÍ•I•˜¡ì…Ñ¥Ù”è¹Õ±°…Ì¹Õµ‰•Èð¹Õ±°°™±¥ÁÁ•è¹Õ±°…Ì¹Õµ‰•Èð¹Õ±°ô¤(€I•…Ð¹ÕÍ•™™•Ð  ¤€ôøì(€€€½¹ÍÐ½±€ôÁÉ•Ù¥½ÕÌ¹ÕÉÉ•¹Ð(€€€½¹ÍÐÝÉ…À€ô€¡¤è¹Õµ‰•È¤€ôø€¡±¥Ù”¹ÕÉÉ•¹Ð¹å±¥Œ€ü€ ¡¤€”½Õ¹Ð¤€¬½Õ¹Ð¤€”½Õ¹Ð€è¤¤(€€€¥˜€¡½±¹…Ñ¥Ù”€„ôô…Ñ¥Ù”¤ì(€€€€€¥˜€¡…Ñ¥Ù”€„ôô¹Õ±°¤ì(€€€€€€€¥µÁÕ±Í”¡ÝÉ…À¡…Ñ¥Ù”€´€Ä¤°€ÄØ¤(€€€€€€€¥µÁÕ±Í”¡ÝÉ…À¡…Ñ¥Ù”€¬€Ä¤°€´ÄØ¤(€€€€€ô(€€€€€¥˜€¡½±¹…Ñ¥Ù”€„ôô¹Õ±°¤ì(€€€€€€€¥µÁÕ±Í”¡ÝÉ…À¡½±¹…Ñ¥Ù”€´€Ä¤°€´Ø¤(€€€€€€€¥µÁÕ±Í”¡ÝÉ…À¡½±¹…Ñ¥Ù”€¬€Ä¤°€Ø¤(€€€€€ô(€€€ô(€€€¥˜€¡½±¹™±¥ÁÁ•€„ôô™±¥ÁÁ•¤ì(€€€€€¥˜€¡™±¥ÁÁ•€„ôô¹Õ±°¤ì(€€€€€€€¥µÁÕ±Í”¡™±¥ÁÁ•°™±¥ÁÁ•€”€È€ü€ä€è€´ä¤(€€€€€€€ÑÕœ¡™±¥ÁÁ•°€ÜÀ¤(€€€€€ô(€€€€€¥˜€¡½±¹™±¥ÁÁ•€„ôô¹Õ±°¤ÑÕœ¡½±¹™±¥ÁÁ•°€ÐÀ¤(€€€ô(€€€ÁÉ•Ù¥½ÕÌ¹ÕÉÉ•¹Ð€ôì…Ñ¥Ù”°™±¥ÁÁ•ô(€ô°m…Ñ¥Ù”°™±¥ÁÁ•°½Õ¹Ð°¥µÁÕ±Í”°ÑÕt¤((€½¹ÍÐÍÑ½À€ôI•…Ð¹ÕÍ•…±±‰…¬  ¤€ôøÍ•ÑA±…å¥¹œ¡™…±Í”¤°mt¤((€I•…Ð¹ÕÍ•™™•Ð  ¤€ôøì(€€€¥˜€ …Á±…å¥¹œñðÉ•‘Õ•ñð½Õ¹Ð€ôôô€Àñð€…É•…‘ä¤É•ÑÕÉ¸(€€€±•ÐÑ¥µ•È€ô€À(€€€™Õ¹Ñ¥½¸™É½¹Ð¡¥¹‘•àè¹Õµ‰•È¤ì(€€€€€Í•ÑÑ¥Ù”¡¥¹‘•à¤(€€€€€Ñ¥µ•È€ôÝ¥¹‘½Ü¹Í•ÑQ¥µ•½ÕÐ  ¤€ôø™±¥À¡¥¹‘•à¤°1%A}1d¤(€€€ô(€€€™Õ¹Ñ¥½¸™±¥À¡¥¹‘•àè¹Õµ‰•È¤ì(€€€€€Í•Ñ±¥ÁÁ•¡¥¹‘•à¤(€€€€€Ñ¥µ•È€ôÝ¥¹‘½Ü¹Í•ÑQ¥µ•½ÕÐ  ¤€ôøì(€€€€€€€Í•Ñ±¥ÁÁ•¡¹Õ±°¤(€€€€€€€™É½¹Ð ¡¥¹‘•à€¬€Ä¤€”5…Ñ ¹µ…à Ä°±¥Ù”¹ÕÉÉ•¹Ð¹½Õ¹Ð¤¤(€€€€€ô°¥¹Ñ•ÉÙ…°¤(€€€ô(€€€½¹ÍÐÕÉÉ•¹Ð€ô±¥Ù”¹ÕÉÉ•¹Ð¹…Ñ¥Ù”(€€€Ñ¥µ•È€ôÕÉÉ•¹Ð€ôôô¹Õ±°€üÝ¥¹‘½Ü¹Í•ÑQ¥µ•½ÕÐ  ¤€ôø™É½¹Ð À¤°%IMQ}1d¤€èÝ¥¹‘½Ü¹Í•ÑQ¥µ•½ÕÐ  ¤€ôø™±¥À¡ÕÉÉ•¹Ð¤°1%A}1d¤(€€€É•ÑÕÉ¸€ ¤€ôøÝ¥¹‘½Ü¹±•…ÉQ¥µ•½ÕÐ¡Ñ¥µ•È¤(€ô°mÁ±…å¥¹œ°É•‘Õ•°½Õ¹Ð°É•…‘ä°¥¹Ñ•ÉÙ…°°Í•ÑÑ¥Ù”°Í•Ñ±¥ÁÁ•‘t¤((€I•…Ð¹ÕÍ•™™•Ð  ¤€ôøì(€€€¥˜€¡™±¥ÁÁ•€ôôô¹Õ±°¤É•ÑÕÉ¸(€€€½¹ÍÐ½¹-•ä€ô€¡•Ù•¹Ðè-•å‰½…É‘Ù•¹Ð¤€ôøì(€€€€€¥˜€¡•Ù•¹Ð¹­•ä€„ôô€‰Í…Á”ˆñð•Ù•¹Ð¹‘•™…Õ±ÑAÉ•Ù•¹Ñ•¤É•ÑÕÉ¸(€€€€€½¹ÍÐÍÑ…”€ôÍÑ…•I•˜¹ÕÉÉ•¹Ð(€€€€€¥˜€¡ÍÑ…”€˜˜•Ù•¹Ð¹Ñ…É•Ð¥¹ÍÑ…¹•½˜9½‘”€˜˜ÍÑ…”¹½¹Ñ…¥¹Ì¡•Ù•¹Ð¹Ñ…É•Ð¤¤É•ÑÕÉ¸(€€€€€Í•Ñ±¥ÁÁ•¡¹Õ±°¤(€€€ô(€€€‘½Õµ•¹Ð¹…‘‘Ù•¹Ñ1¥ÍÑ•¹•È ‰­•å‘½Ý¸ˆ°½¹-•ä¤(€€€É•ÑÕÉ¸€ ¤€ôø‘½Õµ•¹Ð¹É•µ½Ù•Ù•¹Ñ1¥ÍÑ•¹•È ‰­•å‘½Ý¸ˆ°½¹-•ä¤(€ô°m™±¥ÁÁ•°Í•Ñ±¥ÁÁ•‘t¤((€½¹ÍÐÑ½±”€ôI•…Ð¹ÕÍ•…±±‰…¬ (€€€€¡¥¹‘•àè¹Õµ‰•È¤€ôøì(€€€€€ÍÑ½À ¤(€€€€€½¹ÍÐ¹•áÐ€ô±¥Ù”¹ÕÉÉ•¹Ð¹™±¥ÁÁ•€ôôô¥¹‘•à€ü¹Õ±°€è¥¹‘•à(€€€€€¥˜€¡¹•áÐ€„ôô¹Õ±°¤Í•ÑÑ¥Ù”¡¥¹‘•à¤(€€€€€Í•Ñ±¥ÁÁ•¡¹•áÐ¤(€€€ô°(€€€mÍÑ½À°Í•ÑÑ¥Ù”°Í•Ñ±¥ÁÁ•‘t°(€€¤((€½¹ÍÐÉ•Ñ…É•Ð€ô€ ¤€ôøì(€€€½¹ÍÐÌ€ôÍ¥´¹ÕÉÉ•¹Ð(€€€½¹ÍÐ0€ô±¥Ù”¹ÕÉÉ•¹Ð(€€€½¹ÍÐìáÌô€ô±…å½ÕÑQ…É•ÑÌ¡0¹Í¥é”¹Ý¥‘Ñ °0¹Í¥é”¹\°0¹Í¥é”¹…É½ÕÍ•°°0¹Í¥é”¹…É½ÕÍ•°€ü€¡0¹…Ñ¥Ù”€üü0¹…É½ÕÍ•±%¹‘•à¤€è¹Õ±°°0¹½Õ¹Ð¤(€€€™½È€¡±•Ð¤€ô€Àì¤€ð0¹½Õ¹Ðì¤¬¬¤Ì¹Ñám¥t€ô€¡áÍm¥t€üü€À¤€¬€¡0¹Í¥é”¹…É½ÕÍ•°€üÁ½¥¹Ñ•È¹ÕÉÉ•¹Ð¹ÍÝ¥Á”€è€À¤(€€€¥˜€¡0¹É•‘Õ•¤Í¹…À ¤(€€€•±Í”­¥¬ ¤(€ô((€½¹ÍÐ™•…Í¥‰±”€ô€¡è¹Õµ‰•È¤€ôøì(€€€½¹ÍÐÌ€ôÍ¥´¹ÕÉÉ•¹Ð(€€€½¹ÍÐ0€ô±¥Ù”¹ÕÉÉ•¹Ð(€€€½¹ÍÐ\€ô0¹•¼¹\(€€€½¹ÍÐ¸€ô0¹½Õ¹Ð(€€€±•Ðm±¼°¡¥t€ôÍÑ½ÁÌ¡Ì°\°0¹Í¥é”¹Ý¥‘Ñ °¸¤(€€€™½È€¡±•Ð¬€ô€Àì¬€ðì¬¬¬¤±¼€¬ôµ¥¹…À¡Ì°\°¬°¬€¬€Ä¤(€€€™½È€¡±•Ð¬€ô¸€´€Äì¬€øì¬´´¤¡¤€´ôµ¥¹…À¡Ì°\°¬€´€Ä°¬¤(€€€É•ÑÕÉ¸m±¼°5…Ñ ¹µ…à¡±¼°¡¤¥t…Ì½¹ÍÐ(€ô((€½¹ÍÐ¹•…É•ÍÐ€ô€¡±¥•¹Ñ`è¹Õµ‰•È°±¥•¹Ñdè¹Õµ‰•È¤€ôøì(€€€½¹ÍÐÍÑ…”€ôÍÑ…•I•˜¹ÕÉÉ•¹Ð(€€€¥˜€ …ÍÑ…”¤É•ÑÕÉ¸¹Õ±°(€€€½¹ÍÐ‰½à€ôÍÑ…”¹•Ñ	½Õ¹‘¥¹±¥•¹ÑI•Ð ¤(€€€½¹ÍÐà€ô±¥•¹Ñ`€´‰½à¹±•™Ð(€€€½¹ÍÐä€ô±¥•¹Ñd€´‰½à¹Ñ½À(€€€½¹ÍÐœ€ô±¥Ù”¹ÕÉÉ•¹Ð¹•¼(€€€½¹ÍÐÌ€ôÍ¥´¹ÕÉÉ•¹Ð(€€€¥˜€¡ä€ðœ¹É…¥±d€´€ÄÈ¤É•ÑÕÉ¸¹Õ±°(€€€±•Ð‰•ÍÐ€ô¹Õ±°…Ì¹Õµ‰•Èð¹Õ±°(€€€±•Ð‘¥ÍÑ…¹”€ô%¹™¥¹¥Ñä(€€€™½È€¡±•Ð¤€ô€Àì¤€ð±¥Ù”¹ÕÉÉ•¹Ð¹½Õ¹Ðì¤¬¬¤ì(€€€€€¥˜€¡ä€ø€¡œ¹…É‘Q½ÁÍm¥t€üü€À¤€¬œ¹ €¬5…Ñ ¹µ…à À°Ì¹ÍÑm¥t€üü€À¤€¬€à¤½¹Ñ¥¹Õ”(€€€€€½¹ÍÐ€ô5…Ñ ¹…‰Ì¡à€´€¡Ì¹ám¥t€üü€À¤¤(€€€€€¥˜€¡€ðœ¹\€¼€È€¬€Ø€˜˜€ð‘¥ÍÑ…¹”¤ì(€€€€€€€‰•ÍÐ€ô¤(€€€€€€€‘¥ÍÑ…¹”€ô(€€€€€ô(€€€ô(€€€É•ÑÕÉ¸‰•ÍÐ(€ô((€½¹ÍÐ½¹A½¥¹Ñ•É5½Ù”€ô€¡•Ù•¹ÐèI•…Ð¹A½¥¹Ñ•ÉÙ•¹Ð¤€ôøì(€€€½¹ÍÐÀ€ôÁ½¥¹Ñ•È¹ÕÉÉ•¹Ð(€€€½¹ÍÐÌ€ôÍ¥´¹ÕÉÉ•¹Ð(€€€½¹ÍÐ0€ô±¥Ù”¹ÕÉÉ•¹Ð(€€€½¹ÍÐÍÑ…”€ôÍÑ…•I•˜¹ÕÉÉ•¹Ð(€€€½¹ÍÐ¹½Ü€ôÁ•É™½Éµ…¹”¹¹½Ü ¤(€€€¥˜€¡À¹¥€ôôô•Ù•¹Ð¹Á½¥¹Ñ•É%€˜˜ÍÑ…”¤ì(€€€€€½¹ÍÐ‘à€ô•Ù•¹Ð¹±¥•¹Ñ`€´À¹à(€€€€€½¹ÍÐ‘ä€ô•Ù•¹Ð¹±¥•¹Ñd€´À¹ä(€€€€€¥˜€ …À¹µ½‘”€˜˜5…Ñ ¹¡åÁ½Ð¡‘à°‘ä¤€ø€à¤ì(€€€€€€€¥˜€¡5…Ñ ¹…‰Ì¡‘ä¤€ø5…Ñ ¹…‰Ì¡‘à¤¤À¹µ½‘”€ô‘ä€ø€À€˜˜À¹¥¹‘•à€øô€À€ü€‰ÁÕ±°ˆ€è€‰¹½¹”ˆ(€€€€€€€•±Í”À¹µ½‘”€ô0¹Í¥é”¹…É½ÕÍ•°€ü€‰ÍÝ¥Á”ˆ€èÀ¹¥¹‘•à€øô€À€˜˜€…0¹É•‘Õ•€ü€‰‘É…œˆ€è€‰¹½¹”ˆ(€€€€€€€¥˜€¡À¹µ½‘”€„ôô€‰¹½¹”ˆ¤ì(€€€€€€€€€ÍÑ½À ¤(€€€€€€€€€¥˜€¡ÍÑ…”¹¥Í½¹¹•Ñ•¤ÍÑ…”¹Í•ÑA½¥¹Ñ•É…ÁÑÕÉ”¡•Ù•¹Ð¹Á½¥¹Ñ•É%¤(€€€€€€€ô(€€€€€€€¥˜€¡À¹µ½‘”€ôôô€‰ÁÕ±°ˆ¤Ì¹ÁÕ±°€ôÀ¹¥¹‘•à(€€€€€€€¥˜€¡À¹µ½‘”€ôôô€‰‘É…œˆ¤ì(€€€€€€€€€Ì¹‘É…œ€ôÀ¹¥¹‘•à(€€€€€€€€€Ì¹É…ˆ€ô•Ù•¹Ð¹±¥•¹Ñ`€´ÍÑ…”¹•Ñ	½Õ¹‘¥¹±¥•¹ÑI•Ð ¤¹±•™Ð€´€¡Ì¹ámÀ¹¥¹‘•át€üü€À¤(€€€€€€€ô(€€€€€ô(€€€€€½¹ÍÐ•±…ÁÍ•€ô5…Ñ ¹µ…à Ä°¹½Ü€´À¹±…ÍÑP¤(€€€€€À¹Ø€ôÀ¹Ø€¨€À¸Ø€¬€ ¡•Ù•¹Ð¹±¥•¹Ñ`€´À¹±…ÍÑ`¤€¼•±…ÁÍ•¤€¨€À¸Ð(€€€€€À¹±…ÍÑ`€ô•Ù•¹Ð¹±¥•¹Ñ`(€€€€€À¹±…ÍÑd€ô•Ù•¹Ð¹±¥•¹Ñd(€€€€€À¹±…ÍÑP€ô¹½Ü(€€€€€¥˜€¡À¹µ½‘”€ôôô€‰ÁÕ±°ˆ¤ì(€€€€€€€½¹ÍÐ¤€ôÀ¹¥¹‘•à(€€€€€€€Ì¹ÍÑm¥t€ôÍ½™Ð¡5…Ñ ¹µ…à À°‘ä¤°0¹•¼¹µ…áMÑÉ•Ñ ¤(€€€€€€€Ì¹ÙÍÑm¥t€ô€À(€€€€€€€½¹ÍÐ…¹±”€ô±…µÀ  µ5…Ñ ¹…Ñ…¸È¡‘à°€¡0¹•¼¹Á•¹‘Õ±Õµm¥t€üü€ÈÀÀ¤€¬€¡Ì¹ÍÑm¥t€üü€À¤¤€¨€ÄàÀ¤€¼5…Ñ ¹A$°€´ÄØ°€ÄØ¤(€€€€€€€Ì¹ÙÍÝm¥t€ô€ ¡…¹±”€´€¡Ì¹ÍÝm¥t€üü€À¤¤€¼•±…ÁÍ•¤€¨€ÄÀÀÀ€¨€À¸Ô(€€€€€€€Ì¹ÍÝm¥t€ô…¹±”(€€€€€€€¥˜€¡0¹É•‘Õ•¤Á…¥¹Ð¡¤¤(€€€€€€€•±Í”­¥¬ ¤(€€€€€ô•±Í”¥˜€¡À¹µ½‘”€ôôô€‰‘É…œˆ€˜˜Ì¹‘É…œ€øô€À¤ì(€€€€€€€½¹ÍÐm±¼°¡¥t€ô™•…Í¥‰±”¡Ì¹‘É…œ¤(€€€€€€€Ì¹ámÌ¹‘É…t€ô±…µÀ¡•Ù•¹Ð¹±¥•¹Ñ`€´ÍÑ…”¹•Ñ	½Õ¹‘¥¹±¥•¹ÑI•Ð ¤¹±•™Ð€´Ì¹É…ˆ°±¼°¡¤¤(€€€€€€€Ì¹ÙámÌ¹‘É…t€ôÀ¹Ø€¨€ÄÀÀÀ(€€€€€€€Ì¹™É•”€ô¹½Ü€¬€äÀÀ(€€€€€€€­¥¬ ¤(€€€€€ô•±Í”¥˜€¡À¹µ½‘”€ôôô€‰ÍÝ¥Á”ˆ¤ì(€€€€€€€À¹ÍÝ¥Á”€ô‘à(€€€€€€€É•Ñ…É•Ð ¤(€€€€€ô(€€€€€É•ÑÕÉ¸(€€€ô(€€€¥˜€¡•Ù•¹Ð¹Á½¥¹Ñ•ÉQåÁ”€„ôô€‰µ½ÕÍ”ˆñðÀ¹¥€øô€À¤É•ÑÕÉ¸(€€€½¹ÍÐ¡¥Ð€ô¹•…É•ÍÐ¡•Ù•¹Ð¹±¥•¹Ñ`°•Ù•¹Ð¹±¥•¹Ñd¤(€€€½¹ÍÐ¡½Ù•ÉX€ô€¡•Ù•¹Ð¹±¥•¹Ñ`€´À¹¡½Ù•É`¤€¼5…Ñ ¹µ…à Ä°¹½Ü€´À¹¡½Ù•ÉP¤(€€€À¹¡½Ù•É`€ô•Ù•¹Ð¹±¥•¹Ñ`(€€€À¹¡½Ù•ÉP€ô¹½Ü(€€€¥˜€¡0¹Í¥é”¹…É½ÕÍ•°¤ì(€€€€€½¹ÍÐ•¹Ñ•È€ô0¹…Ñ¥Ù”€üü0¹…É½ÕÍ•±%¹‘•à(€€€€€¥˜€¡¡¥Ð€„ôô¹Õ±°€˜˜¡¥Ð€ôôô•¹Ñ•È€˜˜0¹…Ñ¥Ù”€„ôô¡¥Ð¤ì(€€€€€€€ÍÑ½À ¤(€€€€€€€Í•ÑÑ¥Ù”¡¡¥Ð¤(€€€€€ô(€€€€€É•ÑÕÉ¸(€€€ô(€€€¥˜€¡¡¥Ð€„ôô¹Õ±°€˜˜¡¥Ð€„ôôÀ¹¡½Ù•É!¥Ð¤¥µÁÕ±Í”¡¡¥Ð°±…µÀ µ¡½Ù•ÉX€¨€ÈÈ°€´ÈÐ°€ÈÐ¤¤(€€€À¹¡½Ù•É!¥Ð€ô¡¥Ð€üü€´Ä(€€€¥˜€¡¡¥Ð€„ôô¹Õ±°€˜˜¡¥Ð€„ôô0¹…Ñ¥Ù”¤ì(€€€€€ÍÑ½À ¤(€€€€€Í•ÑÑ¥Ù”¡¡¥Ð¤(€€€ô(€ô((€½¹ÍÐ½¹A½¥¹Ñ•É½Ý¸€ô€¡•Ù•¹ÐèI•…Ð¹A½¥¹Ñ•ÉÙ•¹Ð¤€ôøì(€€€¥˜€¡•Ù•¹Ð¹‰ÕÑÑ½¸€„ôô€À¤É•ÑÕÉ¸(€€€½¹ÍÐ¡¥Ð€ô¹•…É•ÍÐ¡•Ù•¹Ð¹±¥•¹Ñ`°•Ù•¹Ð¹±¥•¹Ñd¤(€€€½¹ÍÐ¹½Ü€ôÁ•É™½Éµ…¹”¹¹½Ü ¤(€€€Á•¹‘¥¹=Á•¸¹ÕÉÉ•¹Ð€ô€´Ä(€€€Á½¥¹Ñ•È¹ÕÉÉ•¹Ð€ôì(€€€€€€¸¸¹Á½¥¹Ñ•È¹ÕÉÉ•¹Ð°(€€€€€¥è•Ù•¹Ð¹Á½¥¹Ñ•É%°(€€€€€¥¹‘•àè¡¥Ð€üü€´Ä°(€€€€€àè•Ù•¹Ð¹±¥•¹Ñ`°(€€€€€äè•Ù•¹Ð¹±¥•¹Ñd°(€€€€€µ½‘”è€ˆˆ°(€€€€€­¥¹è•Ù•¹Ð¹Á½¥¹Ñ•ÉQåÁ”°(€€€€€±…ÍÑ`è•Ù•¹Ð¹±¥•¹Ñ`°(€€€€€±…ÍÑdè•Ù•¹Ð¹±¥•¹Ñd°(€€€€€±…ÍÑPè¹½Ü°(€€€€€Øè€À°(€€€€€ÍÝ¥Á”è€À°(€€€ô(€ô((€½¹ÍÐ™¥¹¥Í¡A½¥¹Ñ•È€ô€¡•Ù•¹ÐèI•…Ð¹A½¥¹Ñ•ÉÙ•¹Ð°…¹•±±•è‰½½±•…¸¤€ôøì(€€€½¹ÍÐÀ€ôÁ½¥¹Ñ•È¹ÕÉÉ•¹Ð(€€€¥˜€¡À¹¥€„ôô•Ù•¹Ð¹Á½¥¹Ñ•É%¤É•ÑÕÉ¸(€€€½¹ÍÐÌ€ôÍ¥´¹ÕÉÉ•¹Ð(€€€½¹ÍÐ0€ô±¥Ù”¹ÕÉÉ•¹Ð(€€€½¹ÍÐÍÑ…”€ôÍÑ…•I•˜¹ÕÉÉ•¹Ð(€€€¥˜€¡ÍÑ…”ü¹¡…ÍA½¥¹Ñ•É…ÁÑÕÉ”¡•Ù•¹Ð¹Á½¥¹Ñ•É%¤¤ÍÑ…”¹É•±•…Í•A½¥¹Ñ•É…ÁÑÕÉ”¡•Ù•¹Ð¹Á½¥¹Ñ•É%¤(€€€Á½¥¹Ñ•È¹ÕÉÉ•¹Ð€ôì€¸¸¹À°¥è€´Äô(€€€¥˜€¡À¹µ½‘”€ôôô€‰ÁÕ±°ˆ¤ì(€€€€€½¹ÍÐ¤€ôÌ¹ÁÕ±°(€€€€€Ì¹ÁÕ±°€ô€´Ä(€€€€€¥˜€¡0¹É•‘Õ•¤ì(€€€€€€€Ì¹ÍÑm¥t€ô€À(€€€€€€€Ì¹ÙÍÑm¥t€ô€À(€€€€€€€Ì¹ÍÝm¥t€ô€À(€€€€€€€Ì¹ÙÍÝm¥t€ô€À(€€€€€€€Ì¹‰•Ñ…m¥t€ô€À(€€€€€€€Á…¥¹Ð¡¤¤(€€€€€ô•±Í”­¥¬ ¤(€€€€€É•ÑÕÉ¸(€€€ô(€€€¥˜€¡À¹µ½‘”€ôôô€‰‘É…œˆ¤ì(€€€€€Ì¹‘É…œ€ô€´Ä(€€€€€Ì¹™É•”€ôÁ•É™½Éµ…¹”¹¹½Ü ¤€¬€ÜÀÀ(€€€€€­¥¬ ¤(€€€€€É•ÑÕÉ¸(€€€ô(€€€¥˜€¡À¹µ½‘”€ôôô€‰ÍÝ¥Á”ˆ¤ì(€€€€€½¹ÍÐ‘à€ô•Ù•¹Ð¹±¥•¹Ñ`€´À¹à(€€€€€½¹ÍÐ¸€ô0¹½Õ¹Ð(€€€€€½¹ÍÐÕÉÉ•¹Ð€ô0¹…Ñ¥Ù”€üü0¹…É½ÕÍ•±%¹‘•à(€€€€€½¹ÍÐ‰ä€ô5…Ñ ¹…‰Ì¡‘à¤€ø€ÐÀñð5…Ñ ¹…‰Ì¡À¹Ø¤€ø€À¸ÐÔ€ü€¡‘à€ð€À€ü€Ä€è€´Ä¤€è€À(€€€€€Á½¥¹Ñ•È¹ÕÉÉ•¹Ð¹ÍÝ¥Á”€ô€À(€€€€€½¹ÍÐ¹•áÐ€ô0¹å±¥Œ€ü€  ¡ÕÉÉ•¹Ð€¬‰ä¤€”¸¤€¬¸¤€”¸€è±…µÀ¡ÕÉÉ•¹Ð€¬‰ä°€À°¸€´€Ä¤(€€€€€¥˜€¡¹•áÐ€ôôô0¹…Ñ¥Ù”¤É•Ñ…É•Ð ¤(€€€€€•±Í”Í•ÑÑ¥Ù”¡¹•áÐ¤(€€€€€É•ÑÕÉ¸(€€€ô(€€€¥˜€¡…¹•±±•ñðÀ¹µ½‘”ñðÀ¹¥¹‘•à€ð€À¤É•ÑÕÉ¸(€€€ÍÑ½À ¤(€€€¥˜€ ¡À¹­¥¹€„ôô€‰µ½ÕÍ”ˆñð0¹Í¥é”¹…É½ÕÍ•°¤€˜˜0¹…Ñ¥Ù”€„ôôÀ¹¥¹‘•à¤Í•ÑÑ¥Ù”¡À¹¥¹‘•à¤(€€€•±Í”Á•¹‘¥¹=Á•¸¹ÕÉÉ•¹Ð€ôÀ¹¥¹‘•à(€ô((€½¹ÍÐ½¹-•å½Ý¸€ô€¡•Ù•¹ÐèI•…Ð¹-•å‰½…É‘Ù•¹Ð¤€ôøì(€€€½¹ÍÐ0€ô±¥Ù”¹ÕÉÉ•¹Ð(€€€¥˜€¡•Ù•¹Ð¹­•ä€ôôô€‰Í…Á”ˆ¤ì(€€€€€¥˜€¡0¹™±¥ÁÁ•€„ôô¹Õ±°¤ì(€€€€€€€•Ù•¹Ð¹ÁÉ•Ù•¹Ñ•™…Õ±Ð ¤(€€€€€€€Í•Ñ±¥ÁÁ•¡¹Õ±°¤(€€€€€ô(€€€€€É•ÑÕÉ¸(€€€ô(€€€½¹ÍÐÑ…É•Ð€ô•Ù•¹Ð¹Ñ…É•Ð¥¹ÍÑ…¹•½˜!Q51±•µ•¹Ð€ü•Ù•¹Ð¹Ñ…É•Ð€è¹Õ±°(€€€½¹ÍÐ‰…‘”€ôÑ…É•Ðü¹‘…Ñ…Í•Ð¹‰…‘”(€€€¥˜€¡•Ù•¹Ð¹­•ä€ôôô€‰ÉÉ½Ý½Ý¸ˆ¤ì(€€€€€¥˜€¡‰…‘”€ôôôÕ¹‘•™¥¹•¤É•ÑÕÉ¸(€€€€€•Ù•¹Ð¹ÁÉ•Ù•¹Ñ•™…Õ±Ð ¤(€€€€€ÍÑ½À ¤(€€€€€ÑÕœ¡9Õµ‰•È¡‰…‘”¤°€ÌÀÀ¤(€€€€€É•ÑÕÉ¸(€€€ô(€€€¥˜€ …l‰ÉÉ½ÝI¥¡Ðˆ°€‰ÉÉ½Ý1•™Ðˆ°€‰!½µ”ˆ°€‰¹‰t¹¥¹±Õ‘•Ì¡•Ù•¹Ð¹­•ä¤¤É•ÑÕÉ¸(€€€•Ù•¹Ð¹ÁÉ•Ù•¹Ñ•™…Õ±Ð ¤(€€€ÍÑ½À ¤(€€€½¹ÍÐ™É½´€ô0¹…Ñ¥Ù”€üü™½ÕÍ%¹‘•à(€€€½¹ÍÐ¹•áÐ€ô(€€€€€•Ù•¹Ð¹­•ä€ôôô€‰!½µ”ˆ€ü€À€è•Ù•¹Ð¹­•ä€ôôô€‰¹ˆ€ü0¹½Õ¹Ð€´€Ä€è±…µÀ¡™É½´€¬€¡•Ù•¹Ð¹­•ä€ôôô€‰ÉÉ½ÝI¥¡Ðˆ€ü€Ä€è€´Ä¤°€À°0¹½Õ¹Ð€´€Ä¤(€€€Í•Ñ½ÕÍ%¹‘•à¡¹•áÐ¤(€€€Í•ÑÑ¥Ù”¡¹•áÐ¤(€€€‰ÕÑÑ½¹Ì¹ÕÉÉ•¹Ñm¹•áÑtü¹™½ÕÌ¡ìÁÉ•Ù•¹ÑMÉ½±°èÑÉÕ”ô¤(€ô((€½¹ÍÐœ€ô•¼(€½¹ÍÐ\€ôœ¹\(€½¹ÍÐ‰…Í”€ô\€¼4(€½¹ÍÐÕÉÉ•¹Ð€ô…Ñ¥Ù”€üü™±¥ÁÁ•(€½¹ÍÐÁ•ÉÍ½¸€ôÕÉÉ•¹Ð€ôôô¹Õ±°€ü¹Õ±°€è€¡¥Ñ•µÍmÕÉÉ•¹Ñt€üü¹Õ±°¤(€½¹ÍÐÍ¡½Ý¥¹	…¬€ôÕÉÉ•¹Ð€„ôô¹Õ±°€˜˜ÕÉÉ•¹Ð€ôôô™±¥ÁÁ•(€½¹ÍÐ•¹Ñ•É%¹‘•à€ôÍ¥é”¹…É½ÕÍ•°€ü€¡…Ñ¥Ù”€üü±¥Ù”¹ÕÉÉ•¹Ð¹…É½ÕÍ•±%¹‘•à¤€è¹Õ±°(€½¹ÍÐ±¥¹”Ä€ôÁ•ÉÍ½¸€ü€‘íÁ•ÉÍ½¸¹¹…µ•ôƒŠP€‘íÁ•ÉÍ½¸¹É½±•õ€€è…ÁÑ¥½¸(€½¹ÍÐ±¥¹”È€ôÁ•ÉÍ½¸€ü€¡Í¡½Ý¥¹	…¬€ü±…‰•±Ì¹‰…¬€è±…‰•±Ì¹™±¥À¤€è€ˆˆ((€É•ÑÕÉ¸€ (€€€€ñÍ•Ñ¥½¸(€€€€€ì¸¸¹É•ÍÑô(€€€€€‘…Ñ„µÍ±½Ðô‰Ñ•…´µ±…¹å…ÉµÉ…¥°ˆ(€€€€€‘…Ñ„µµ½‘”õíÍ¥é”¹…É½ÕÍ•°€ü€‰…É½ÕÍ•°ˆ€è€‰É…¥°‰ô(€€€€€‘…Ñ„µ…Ñ¥Ù”õí…Ñ¥Ù”€üü€ˆ‰ô(€€€€€‘…Ñ„µ™±¥ÁÁ•õí™±¥ÁÁ•€üü€ˆ‰ô(€€€€€±…ÍÍ9…µ”õíÉ•±…Ñ¥Ù”¥Í½±…Ñ”Üµ™Õ±°½Ù•É™±½Üµ¡¥‘‘•¸‰œµ‰…­É½Õ¹Ñ•áÐµ™½É•É½Õ¹€‘í±…ÍÍ9…µ”€üü€ˆ‰õô(€€€€ø(€€€€€€ñ‘¥Ø(€€€€€€€…É¥„µ¡¥‘‘•¸ô‰ÑÉÕ”ˆ(€€€€€€€±…ÍÍ9…µ”ô‰Á½¥¹Ñ•Èµ•Ù•¹ÑÌµ¹½¹”…‰Í½±ÕÑ”¥¹Í•Ð´À€µè´ÄÀˆ(€€€€€€€ÍÑå±”õíì(€€€€€€€€€‰…­É½Õ¹è€‰É…‘¥…°µÉ…‘¥•¹Ð¡±½Í•ÍÐµÍ¥‘”…Ð€ÔÀ”€ÐØ”°½±½Èµµ¥à¡¥¸½­±…ˆ°Ù…È ´µ½±½Èµ™½É•É½Õ¹¤€Ü”°ÑÉ…¹ÍÁ…É•¹Ð¤°ÑÉ…¹ÍÁ…É•¹Ð¤ˆ°(€€€€€€€õô(€€€€€€¼ø(€€€€€€ñ‘¥Ø(€€€€€€€…É¥„µ¡¥‘‘•¸ô‰ÑÉÕ”ˆ(€€€€€€€±…ÍÍ9…µ”ô‰Á½¥¹Ñ•Èµ•Ù•¹ÑÌµ¹½¹”…‰Í½±ÕÑ”¥¹Í•Ð´À€µè´ÄÀˆ(€€€€€€€ÍÑå±”õíì(€€€€€€€€€‰…­É½Õ¹è(€€€€€€€€€€€€‰É…‘¥…°µÉ…‘¥•¹Ð¡½±½Èµµ¥à¡¥¸½­±…ˆ°Ù…È ´µ½±½Èµ™½É•É½Õ¹¤€à”°ÑÉ…¹ÍÁ…É•¹Ð¤€ÅÁà°ÑÉ…¹ÍÁ…É•¹Ð€Ä¸ÍÁà¤€À€À€¼€ÄáÁà€ÄáÁàˆ°(€€€€€€€€€µ…Í­%µ…”è€‰É…‘¥…°µÉ…‘¥•¹Ð¡±½Í•ÍÐµÍ¥‘”…Ð€ÔÀ”€ÔÀ”°‰±…¬€ÔÔ”°ÑÉ…¹ÍÁ…É•¹Ð¤ˆ°(€€€€€€€€€]•‰­¥Ñ5…Í­%µ…”è€‰É…‘¥…°µÉ…‘¥•¹Ð¡±½Í•ÍÐµÍ¥‘”…Ð€ÔÀ”€ÔÀ”°‰±…¬€ÔÔ”°ÑÉ…¹ÍÁ…É•¹Ð¤ˆ°(€€€€€€€õô(€€€€€€¼ø(€€€€€ì¡•å•‰É½Üñð¡•…‘¥¹œ¤€˜˜€ (€€€€€€€€ñ¡•…‘•È±…ÍÍ9…µ”ô‰É•±…Ñ¥Ù”è´ÄÀ™±•à™±•àµ½°¥Ñ•µÌµ•¹Ñ•È…À´ÈÁà´ØÁÐ´ÜÑ•áÐµ•¹Ñ•Èˆø(€€€€€€€€€í•å•‰É½Ü€˜˜€ñÀ±…ÍÍ9…µ”ô‰Ñ•áÐµlÄÅÁát™½¹Ðµµ•‘¥Õ´ÕÁÁ•É…Í”ÑÉ…­¥¹œµlÀ¸Èá•µtÑ•áÐµµÕÑ•µ™½É•É½Õ¹ˆùí•å•‰É½Ýôð½Àùô(€€€€€€€€€í¡•…‘¥¹œ€˜˜€ñ È±…ÍÍ9…µ”ô‰Ñ•áÐµ‰…±…¹”Ñ•áÐ´Éá°™½¹Ðµµ•‘¥Õ´ÑÉ…­¥¹œµÑ¥¡ÐµéÑ•áÐ´Íá°ˆùí¡•…‘¥¹ôð½ Èùô(€€€€€€€€ð½¡•…‘•Èø(€€€€€€¥ô((€€€€€€ñ‘¥Ø(€€€€€€€É•˜õíÍÑ…•I•™ô(€€€€€€€‘…Ñ„µÍÑ…”(€€€€€€€É½±”ô‰É½ÕÀˆ(€€€€€€€…É¥„µ±…‰•°õí¡•…‘¥¹œ€üü€‰Q•…´‰ô(€€€€€€€…É¥„µÉ½±•‘•ÍÉ¥ÁÑ¥½¸ô‰±…¹å…ÉÉ…¥°ˆ(€€€€€€€±…ÍÍ9…µ”ô‰É•±…Ñ¥Ù”µÐ´ÐÜµ™Õ±°Ñ½Õ µÁ…¸µäÍ•±•Ðµ¹½¹”ˆ(€€€€€€€ÍÑå±”õíì¡•¥¡Ðèœ¹¡•¥¡Ð°½Ù•É™±½Ý`è€‰±¥Àˆõô(€€€€€€€½¹A½¥¹Ñ•É5½Ù”õí½¹A½¥¹Ñ•É5½Ù•ô(€€€€€€€½¹A½¥¹Ñ•É½Ý¸õí½¹A½¥¹Ñ•É½Ý¹ô(€€€€€€€½¹A½¥¹Ñ•ÉUÀõì¡•Ù•¹Ð¤€ôø™¥¹¥Í¡A½¥¹Ñ•È¡•Ù•¹Ð°™…±Í”¥ô(€€€€€€€½¹A½¥¹Ñ•É…¹•°õì¡•Ù•¹Ð¤€ôø™¥¹¥Í¡A½¥¹Ñ•È¡•Ù•¹Ð°ÑÉÕ”¥ô(€€€€€€€½¹A½¥¹Ñ•É1•…Ù”õì¡•Ù•¹Ð¤€ôøì(€€€€€€€€€Á½¥¹Ñ•È¹ÕÉÉ•¹Ð¹¡½Ù•É!¥Ð€ô€´Ä(€€€€€€€€€¥˜€ (€€€€€€€€€€€•Ù•¹Ð¹Á½¥¹Ñ•ÉQåÁ”€ôôô€‰µ½ÕÍ”ˆ€˜˜(€€€€€€€€€€€Á½¥¹Ñ•È¹ÕÉÉ•¹Ð¹¥€ð€À€˜˜(€€€€€€€€€€€€…Í¥é”¹…É½ÕÍ•°€˜˜(€€€€€€€€€€€€…‘½Õµ•¹Ð¹…Ñ¥Ù•±•µ•¹Ðü¹µ…Ñ¡•Ì ‰m‘…Ñ„µ‰…‘•té™½ÕÌµÙ¥Í¥‰±”ˆ¤(€€€€€€€€€€¤(€€€€€€€€€€€Í•ÑÑ¥Ù”¡¹Õ±°¤(€€€€€€€õô(€€€€€€€½¹-•å½Ý¸õí½¹-•å½Ý¹ô(€€€€€€ø(€€€€€€€€ñ‘¥Ø(€€€€€€€€€…É¥„µ¡¥‘‘•¸ô‰ÑÉÕ”ˆ(€€€€€€€€€‘…Ñ„µÉ…¥°(€€€€€€€€€±…ÍÍ9…µ”ô‰Á½¥¹Ñ•Èµ•Ù•¹ÑÌµ¹½¹”…‰Í½±ÕÑ”¥¹Í•Ðµà´Àè´Àˆ(€€€€€€€€€ÍÑå±”õíìÑ½Àèœ¹É…¥±d€´œ¹É…¥±H°¡•¥¡Ðèœ¹É…¥±H€¨€Èõô(€€€€€€€€ø(€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰…‰Í½±ÕÑ”¥¹Í•Ðµà´À ´ÌÉ½Õ¹‘•µ™Õ±°‰œµ™½É•É½Õ¹¼ÄÀ‰±ÕÈµlÕÁátˆÍÑå±”õíìÑ½Àèœ¹É…¥±H€¨€È€¬€Èõô€¼ø(€€€€€€€€€€ñ‘¥Ø(€€€€€€€€€€€±…ÍÍ9…µ”ô‰…‰Í½±ÕÑ”¥¹Í•Ð´ÀÉ½Õ¹‘•µ™Õ±°ˆ(€€€€€€€€€€€ÍÑå±”õíì(€€€€€€€€€€€€€‰…­É½Õ¹è(€€€€€€€€€€€€€€€€‰±¥¹•…ÈµÉ…‘¥•¹Ð¡Ñ¼‰½ÑÑ½´°½±½Èµµ¥à¡¥¸½­±…ˆ°Ù…È ´µ½±½ÈµµÕÑ•µ™½É•É½Õ¹¤€ÌÔ”°Ý¡¥Ñ”¤€À”°Ý¡¥Ñ”€ÈÀ”°½±½Èµµ¥à¡¥¸½­±…ˆ°Ù…È ´µ½±½ÈµµÕÑ•µ™½É•É½Õ¹¤€ÜÀ”°Ý¡¥Ñ”¤€ÐÀ”°Ù…È ´µ½±½ÈµµÕÑ•µ™½É•É½Õ¹¤€ØÐ”°½±½Èµµ¥à¡¥¸½­±…ˆ°Ù…È ´µ½±½ÈµµÕÑ•µ™½É•É½Õ¹¤€ÔÔ”°‰±…¬¤€ÄÀÀ”¤ˆ°(€€€€€€€€€€€€€‰½áM¡…‘½Üè€ˆÀ€ÅÁà€À½±½Èµµ¥à¡¥¸½­±…ˆ°Ù…È ´µ½±½Èµ™½É•É½Õ¹¤€Äà”°ÑÉ…¹ÍÁ…É•¹Ð¤ˆ°(€€€€€€€€€€€õô(€€€€€€€€€€¼ø(€€€€€€€€€€ñ‘¥Ø(€€€€€€€€€€€±…ÍÍ9…µ”ô‰…‰Í½±ÕÑ”¥¹Í•Ð´ÀÉ½Õ¹‘•µ™Õ±°½Á…¥Ñä´ÐÀµ¥àµ‰±•¹µ½Ù•É±…äˆ(€€€€€€€€€€€ÍÑå±”õíì(€€€€€€€€€€€€€‰…­É½Õ¹è(€€€€€€€€€€€€€€€€‰É•Á•…Ñ¥¹œµ±¥¹•…ÈµÉ…‘¥•¹Ð äÁ‘•œ°ÑÉ…¹ÍÁ…É•¹Ð€À€ÉÁà°½±½Èµµ¥à¡¥¸½­±…ˆ°Ý¡¥Ñ”€ÐÀ”°ÑÉ…¹ÍÁ…É•¹Ð¤€ÉÁà€ÍÁà°ÑÉ…¹ÍÁ…É•¹Ð€ÍÁà€ÝÁà¤ˆ°(€€€€€€€€€€€õô(€€€€€€€€€€¼ø(€€€€€€€€€ì…Í¥é”¹…É½ÕÍ•°€˜˜(€€€€€€€€€€€lÀ°€Åt¹µ…À ¡Í¥‘”¤€ôø€ (€€€€€€€€€€€€€€ñ‘¥Ø(€€€€€€€€€€€€€€€­•äõíÍ¥‘•ô(€€€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰…‰Í½±ÕÑ”Ñ½À´Ä¼È ´ÜÜ´Ð€µÑÉ…¹Í±…Ñ”µä´Ä¼ÈÉ½Õ¹‘•µlÍÁátˆ(€€€€€€€€€€€€€€€ÍÑå±”õíì(€€€€€€€€€€€€€€€€€mÍ¥‘”€ü€‰É¥¡Ðˆ€è€‰±•™Ð‰tè€Ø°(€€€€€€€€€€€€€€€€€‰…­É½Õ¹è(€€€€€€€€€€€€€€€€€€€€‰±¥¹•…ÈµÉ…‘¥•¹Ð¡Ñ¼É¥¡Ð°½±½Èµµ¥à¡¥¸½­±…ˆ°Ù…È ´µ½±½ÈµµÕÑ•µ™½É•É½Õ¹¤€ØÀ”°Ý¡¥Ñ”¤°Ù…È ´µ½±½ÈµµÕÑ•µ™½É•É½Õ¹¤€ÔÔ”°½±½Èµµ¥à¡¥¸½­±…ˆ°Ù…È ´µ½±½ÈµµÕÑ•µ™½É•É½Õ¹¤€ØÀ”°‰±…¬¤¤ˆ°(€€€€€€€€€€€€€€€€€‰½áM¡…‘½Üè€ˆÀ€ÍÁà€ÙÁà½±½Èµµ¥à¡¥¸½­±…ˆ°Ù…È ´µ½±½Èµ™½É•É½Õ¹¤€Äà”°ÑÉ…¹ÍÁ…É•¹Ð¤ˆ°(€€€€€€€€€€€€€€€õô(€€€€€€€€€€€€€€ø(€€€€€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”ô‰…‰Í½±ÕÑ”±•™Ð´Ä¼ÈÑ½À´ÄÍ¥é”´Ä€µÑÉ…¹Í±…Ñ”µà´Ä¼ÈÉ½Õ¹‘•µ™Õ±°‰œµ™½É•É½Õ¹¼ÌÔˆ€¼ø(€€€€€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”ô‰…‰Í½±ÕÑ”‰½ÑÑ½´´Ä±•™Ð´Ä¼ÈÍ¥é”´Ä€µÑÉ…¹Í±…Ñ”µà´Ä¼ÈÉ½Õ¹‘•µ™Õ±°‰œµ™½É•É½Õ¹¼ÌÔˆ€¼ø(€€€€€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€€€¤¥ô(€€€€€€€€ð½‘¥Øø((€€€€€€€í¥Ñ•µÌ¹µ…À ¡¥Ñ•´°¤¤€ôøì(€€€€€€€€€½¹ÍÐÑ½¹”€ôQ=9Ml ¡¥Ñ•´¹Ñ½¹”€üü€¡¤€”€Ô¤€¬€Ä¤€´€Ä¤€”Q=9L¹±•¹Ñ¡t€üüQ=9MlÁt(€€€€€€€€€½¹ÍÐ¥ÍÑ¥Ù”€ô…Ñ¥Ù”€ôôô¤(€€€€€€€€€½¹ÍÐ¥Í±¥ÁÁ•€ô™±¥ÁÁ•€ôôô¤(€€€€€€€€€½¹ÍÐÍÑÉ…À€ôœ¹ÍÑÉ…ÁÍm¥t€üü€À(€€€€€€€€€½¹ÍÐÉ••±Q½À€ôœ¹É••±Q½ÁÍm¥t€üü€À(€€€€€€€€€½¹ÍÐ±¥ÁQ½À€ôœ¹±¥ÁQ½ÁÍm¥t€üü€À(€€€€€€€€€½¹ÍÐ…É‘=™™Í•Ð€ô€¡œ¹…É‘Q½ÁÍm¥t€üü€À¤€´±¥ÁQ½À(€€€€€€€€€½¹ÍÐ±¥¹­Ì€ô€¡¥Ñ•´¹±¥¹­Ì€üümt¤¹Í±¥” À°€Ì¤(€€€€€€€€€É•ÑÕÉ¸€ (€€€€€€€€€€€€ñ‘¥Ø(€€€€€€€€€€€€€­•äõí¥Ñ•´¹¥‘ô(€€€€€€€€€€€€€É•˜õì¡¹½‘”¤€ôøì(€€€€€€€€€€€€€€€Í±½ÑÌ¹ÕÉÉ•¹Ñm¥t€ô¹½‘”(€€€€€€€€€€€€€õô(€€€€€€€€€€€€€‘…Ñ„µ±…¹å…Éõí¥ô(€€€€€€€€€€€€€±…ÍÍ9…µ”õíÁ½¥¹Ñ•Èµ•Ù•¹ÑÌµ¹½¹”…‰Í½±ÕÑ”±•™Ð´ÀÑ½À´À€‘íÑ½¹•õô(€€€€€€€€€€€€€ÍÑå±”õíì(€€€€€€€€€€€€€€€Ý¥‘Ñ è\°(€€€€€€€€€€€€€€€¡•¥¡Ðèœ¹¡•¥¡Ð°(€€€€€€€€€€€€€€€é%¹‘•àè¥Í±¥ÁÁ•€ü€ÐÀ€è¥ÍÑ¥Ù”€ü€ÌÀ€è€ÄÀ€¬¤°(€€€€€€€€€€€€€€€ÑÉ…¹Í™½É´èÑÉ…¹Í±…Ñ”Í ‘ì ¡Í¥´¹ÕÉÉ•¹Ð¹ám¥t€üü€À¤€´\€¼€È¤¹Ñ½¥á• È¥õÁà°À°À¥€°(€€€€€€€€€€€€€õô(€€€€€€€€€€€€ø(€€€€€€€€€€€€€€ñÍÁ…¸(€€€€€€€€€€€€€€€…É¥„µ¡¥‘‘•¸ô‰ÑÉÕ”ˆ(€€€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰…‰Í½±ÕÑ”‰±½¬É½Õ¹‘•µ™Õ±°ˆ(€€€€€€€€€€€€€€€ÍÑå±”õíì(€€€€€€€€€€€€€€€€€±•™Ðè\€¼€È€´€Ð¸Ô€¨œ¹Ô°(€€€€€€€€€€€€€€€€€Ñ½Àèœ¹É…¥±d€´œ¹É¥¹œ°(€€€€€€€€€€€€€€€€€Ý¥‘Ñ è€ä€¨œ¹Ô°(€€€€€€€€€€€€€€€€€¡•¥¡Ðèœ¹É¥¹œ€¨€È°(€€€€€€€€€€€€€€€€€‰½É‘•Èè€‘í5…Ñ ¹µ…à Ä¸Ø°€È¸È€¨œ¹Ô¤¹Ñ½¥á• È¥õÁàÍ½±¥½±½Èµµ¥à¡¥¸½­±…ˆ°Ù…È ´µ½±½ÈµµÕÑ•µ™½É•É½Õ¹¤€ÐÔ”°Ý¡¥Ñ”¥€°(€€€€€€€€€€€€€€€€€‰½áM¡…‘½Üè(€€€€€€€€€€€€€€€€€€€€‰¥¹Í•Ð€ÅÁà€À€À½±½Èµµ¥à¡¥¸½­±…ˆ°‰±…¬€ÈÔ”°ÑÉ…¹ÍÁ…É•¹Ð¤°€ÅÁà€ÅÁà€ÉÁà½±½Èµµ¥à¡¥¸½­±…ˆ°‰±…¬€ÈÀ”°ÑÉ…¹ÍÁ…É•¹Ð¤ˆ°(€€€€€€€€€€€€€€€õô(€€€€€€€€€€€€€€¼ø(€€€€€€€€€€€€€€ñÍÁ…¸(€€€€€€€€€€€€€€€É•˜õì¡¹½‘”¤€ôøì(€€€€€€€€€€€€€€€€€ÍÝ¥¹Ì¹ÕÉÉ•¹Ñm¥t€ô¹½‘”(€€€€€€€€€€€€€€€õô(€€€€€€€€€€€€€€€‘…Ñ„µÍÝ¥¹œ(€€€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰…‰Í½±ÕÑ”¥¹Í•Ð´À‰±½¬ˆ(€€€€€€€€€€€€€€€ÍÑå±”õíìÑÉ…¹Í™½Éµ=É¥¥¸è€‘í\€¼€ÉõÁà€‘íœ¹Á¥Ù½ÑeõÁá€õô(€€€€€€€€€€€€€€ø(€€€€€€€€€€€€€€€€ñÍÁ…¸(€€€€€€€€€€€€€€€€€É•˜õì¡¹½‘”¤€ôøì(€€€€€€€€€€€€€€€€€€€ÍÑÉ…ÁÌ¹ÕÉÉ•¹Ñm¥t€ô¹½‘”(€€€€€€€€€€€€€€€€€õô(€€€€€€€€€€€€€€€€€‘…Ñ„µÍÑÉ…À(€€€€€€€€€€€€€€€€€…É¥„µ¡¥‘‘•¸ô‰ÑÉÕ”ˆ(€€€€€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰…‰Í½±ÕÑ”¥¹Í•Ð´À‰±½¬ˆ(€€€€€€€€€€€€€€€€€ÍÑå±”õíìlˆ´µÍÑÉ•Ñ ˆ…ÌÍÑÉ¥¹tè€ˆÁÁàˆõô(€€€€€€€€€€€€€€€€ø(€€€€€€€€€€€€€€€€€€ñÍÁ…¸(€€€€€€€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰…‰Í½±ÕÑ”‰±½¬‰œµ‰±…¬¼ÄÔ‰±ÕÈµlÉÁát‘…É¬é‰œµ‰±…¬¼ÐÔˆ(€€€€€€€€€€€€€€€€€€€ÍÑå±”õíì±•™Ðè\€¼€È€´œ¹ÍÑÉ…Á\€¼€È€¬€Ì€¨œ¹Ô°Ñ½Àèœ¹Á¥Ù½Ñd€¬€Ì°Ý¥‘Ñ èœ¹ÍÑÉ…Á\°¡•¥¡ÐèÍÑÉ…Àõô(€€€€€€€€€€€€€€€€€€¼ø(€€€€€€€€€€€€€€€€€€ñÍÁ…¸(€€€€€€€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰…‰Í½±ÕÑ”‰±½¬ˆ(€€€€€€€€€€€€€€€€€€€ÍÑå±”õíì(€€€€€€€€€€€€€€€€€€€€€±•™Ðè\€¼€È€´œ¹ÍÑÉ…Á\€¼€È°(€€€€€€€€€€€€€€€€€€€€€Ñ½Àèœ¹Á¥Ù½Ñd€´€È°(€€€€€€€€€€€€€€€€€€€€€Ý¥‘Ñ èœ¹ÍÑÉ…Á\°(€€€€€€€€€€€€€€€€€€€€€¡•¥¡ÐèÍÑÉ…À€¬€È°(€€€€€€€€€€€€€€€€€€€€€‰…­É½Õ¹èl(€€€€€€€€€€€€€€€€€€€€€€€€‰É•Á•…Ñ¥¹œµ±¥¹•…ÈµÉ…‘¥•¹Ð ÄÌÕ‘•œ°½±½Èµµ¥à¡¥¸½­±…ˆ°Ý¡¥Ñ”€ÄØ”°ÑÉ…¹ÍÁ…É•¹Ð¤€À€ÅÁà°ÑÉ…¹ÍÁ…É•¹Ð€ÅÁà€ÍÁà¤ˆ°(€€€€€€€€€€€€€€€€€€€€€€€€‰É•Á•…Ñ¥¹œµ±¥¹•…ÈµÉ…‘¥•¹Ð ÐÕ‘•œ°½±½Èµµ¥à¡¥¸½­±…ˆ°‰±…¬€ÄÌ”°ÑÉ…¹ÍÁ…É•¹Ð¤€À€ÅÁà°ÑÉ…¹ÍÁ…É•¹Ð€ÅÁà€ÍÁà¤ˆ°(€€€€€€€€€€€€€€€€€€€€€€€€‰±¥¹•…ÈµÉ…‘¥•¹Ð äÁ‘•œ°½±½Èµµ¥à¡¥¸½­±…ˆ°ÕÉÉ•¹Ñ½±½È€Øà”°‰±…¬¤€À”°ÕÉÉ•¹Ñ½±½È€ÄØ”°½±½Èµµ¥à¡¥¸½­±…ˆ°ÕÉÉ•¹Ñ½±½È€àØ”°Ý¡¥Ñ”¤€Ðà”°ÕÉÉ•¹Ñ½±½È€àÀ”°½±½Èµµ¥à¡¥¸½­±…ˆ°ÕÉÉ•¹Ñ½±½È€ØØ”°‰±…¬¤€ÄÀÀ”¤ˆ°(€€€€€€€€€€€€€€€€€€€€€t¹©½¥¸ ˆ°ˆ¤°(€€€€€€€€€€€€€€€€€€€õô(€€€€€€€€€€€€€€€€€€ø(€€€€€€€€€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”ô‰…‰Í½±ÕÑ”¥¹Í•Ðµä´À±•™ÐµlÄ¸ÕÁátÉ¥¡ÐµlÄ¸ÕÁát‰±½¬‰½É‘•Èµà‰½É‘•Èµ‘…Í¡•‰½É‘•ÈµÝ¡¥Ñ”¼ÌÔˆ€¼ø(€€€€€€€€€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”ô‰…‰Í½±ÕÑ”¥¹Í•Ðµà´ÀÑ½À´À‰±½¬‰œµ‰±…¬¼ÈÔˆÍÑå±”õíì¡•¥¡Ðè€Ü€¨œ¹Ôõô€¼ø(€€€€€€€€€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”ô‰…‰Í½±ÕÑ”¥¹Í•ÐµàµlÉÁát‰±½¬‰½É‘•ÈµÐ‰½É‘•Èµ‘…Í¡•‰½É‘•ÈµÝ¡¥Ñ”¼ÐÔˆÍÑå±”õíìÑ½Àè€ä€¨œ¹Ôõô€¼ø(€€€€€€€€€€€€€€€€€€ð½ÍÁ…¸ø(€€€€€€€€€€€€€€€€€€ñÍÙœ(€€€€€€€€€€€€€€€€€€€…É¥„µ¡¥‘‘•¸ô‰ÑÉÕ”ˆ(€€€€€€€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰…‰Í½±ÕÑ”½Ù•É™±½ÜµÙ¥Í¥‰±”ˆ(€€€€€€€€€€€€€€€€€€€ÍÑå±”õíì±•™Ðè\€¼€È€´œ¹ÍÑÉ…Á\€¨€À¸ÜÔ°Ñ½Àèœ¹Á¥Ù½Ñd€´€Ð€¨œ¹Ô°Ý¥‘Ñ èœ¹ÍÑÉ…Á\€¨€Ä¸Ô°¡•¥¡Ðè€à€¨œ¹Ôõô(€€€€€€€€€€€€€€€€€€€Ù¥•Ý	½àôˆÀ€À€ÌÀ€ÄØˆ(€€€€€€€€€€€€€€€€€€€ÁÉ•Í•ÉÙ•ÍÁ•ÑI…Ñ¥¼ô‰¹½¹”ˆ(€€€€€€€€€€€€€€€€€€ø(€€€€€€€€€€€€€€€€€€€€ñÉ•Ð(€€€€€€€€€€€€€€€€€€€€€àôˆÈˆ(€€€€€€€€€€€€€€€€€€€€€äôˆÌˆ(€€€€€€€€€€€€€€€€€€€€€Ý¥‘Ñ ôˆÈØˆ(€€€€€€€€€€€€€€€€€€€€€¡•¥¡ÐôˆÄÀˆ(€€€€€€€€€€€€€€€€€€€€€ÉàôˆÔˆ(€€€€€€€€€€€€€€€€€€€€€™¥±°ô‰¹½¹”ˆ(€€€€€€€€€€€€€€€€€€€€€ÍÑÉ½­”ô‰½±½Èµµ¥à¡¥¸½­±…ˆ°Ù…È ´µ½±½ÈµµÕÑ•µ™½É•É½Õ¹¤€ÐÀ”°Ý¡¥Ñ”¤ˆ(€€€€€€€€€€€€€€€€€€€€€ÍÑÉ½­•]¥‘Ñ ôˆÌˆ(€€€€€€€€€€€€€€€€€€€€¼ø(€€€€€€€€€€€€€€€€€€€€ñÁ…Ñ ô‰4Ü€Ð¸Ô ÈÌˆÍÑÉ½­”ô‰Ý¡¥Ñ”ˆÍÑÉ½­•=Á…¥ÑäôˆÀ¸ØˆÍÑÉ½­•]¥‘Ñ ôˆÄˆ€¼ø(€€€€€€€€€€€€€€€€€€ð½ÍÙœø(€€€€€€€€€€€€€€€€€€ñÍÁ…¸(€€€€€€€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰…‰Í½±ÕÑ”‰±½¬É½Õ¹‘•µlÉÁátˆ(€€€€€€€€€€€€€€€€€€€ÍÑå±”õíì(€€€€€€€€€€€€€€€€€€€€€±•™Ðè\€¼€È€´œ¹ÍÑÉ…Á\€¼€È€´€Ä¸Ô°(€€€€€€€€€€€€€€€€€€€€€Ñ½Àèœ¹Á¥Ù½Ñd€¬ÍÑÉ…À€´œ¹É¥µÀ€¨€À¸Ð°(€€€€€€€€€€€€€€€€€€€€€Ý¥‘Ñ èœ¹ÍÑÉ…Á\€¬€Ì°(€€€€€€€€€€€€€€€€€€€€€¡•¥¡Ðèœ¹É¥µÀ°(€€€€€€€€€€€€€€€€€€€€€‰…­É½Õ¹è5Q0°(€€€€€€€€€€€€€€€€€€€€€‰½áM¡…‘½Üè€ˆÀ€ÅÁà€Ä¸ÕÁà½±½Èµµ¥à¡¥¸½­±…ˆ°‰±…¬€ÌÀ”°ÑÉ…¹ÍÁ…É•¹Ð¤ˆ°(€€€€€€€€€€€€€€€€€€€õô(€€€€€€€€€€€€€€€€€€¼ø(€€€€€€€€€€€€€€€€€€ñÍÁ…¸(€€€€€€€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰…‰Í½±ÕÑ”‰±½¬É½Õ¹‘•µ™Õ±°ˆ(€€€€€€€€€€€€€€€€€€€ÍÑå±”õíì(€€€€€€€€€€€€€€€€€€€€€±•™Ðè\€¼€È€´œ¹É••°€¼€È°(€€€€€€€€€€€€€€€€€€€€€Ñ½ÀèÉ••±Q½À°(€€€€€€€€€€€€€€€€€€€€€Ý¥‘Ñ èœ¹É••°°(€€€€€€€€€€€€€€€€€€€€€¡•¥¡Ðèœ¹É••°°(€€€€€€€€€€€€€€€€€€€€€‰…­É½Õ¹è(€€€€€€€€€€€€€€€€€€€€€€€€‰É…‘¥…°µÉ…‘¥•¹Ð¡¥É±”…Ð€ÌÐ”€ÌÀ”°½±½Èµµ¥à¡¥¸½­±…ˆ°Ù…È ´µ½±½Èµ™½É•É½Õ¹¤€Ðà”°Ù…È ´µ½±½Èµ‰…­É½Õ¹¤¤€À”°Ù…È ´µ½±½Èµ™½É•É½Õ¹¤€Ôà”°½±½Èµµ¥à¡¥¸½­±…ˆ°Ù…È ´µ½±½Èµ™½É•É½Õ¹¤€àÈ”°Ù…È ´µ½±½Èµ‰…­É½Õ¹¤¤€ÄÀÀ”¤ˆ°(€€€€€€€€€€€€€€€€€€€€€‰½áM¡…‘½Üè(€€€€€€€€€€€€€€€€€€€€€€€€‰¥¹Í•Ð€À€´ÅÁà€ÉÁà½±½Èµµ¥à¡¥¸½­±…ˆ°‰±…¬€ÐÀ”°ÑÉ…¹ÍÁ…É•¹Ð¤°€À€ÉÁà€ÍÁà½±½Èµµ¥à¡¥¸½­±…ˆ°‰±…¬€Èà”°ÑÉ…¹ÍÁ…É•¹Ð¤ˆ°(€€€€€€€€€€€€€€€€€€€õô(€€€€€€€€€€€€€€€€€€ø(€€€€€€€€€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”ô‰…‰Í½±ÕÑ”¥¹Í•ÐµlÄÐ•t‰±½¬É½Õ¹‘•µ™Õ±°‰½É‘•È‰½É‘•ÈµÝ¡¥Ñ”¼ÈÀˆ€¼ø(€€€€€€€€€€€€€€€€€€€€ñÍÁ…¸(€€€€€€€€€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰…‰Í½±ÕÑ”±•™Ð´Ä¼ÈÑ½À´Ä¼È‰±½¬Í¥é”µlÌÈ•t€µÑÉ…¹Í±…Ñ”µà´Ä¼È€µÑÉ…¹Í±…Ñ”µä´Ä¼ÈÉ½Õ¹‘•µ™Õ±°ˆ(€€€€€€€€€€€€€€€€€€€€€ÍÑå±”õíì‰…­É½Õ¹è5Q0õô(€€€€€€€€€€€€€€€€€€€€¼ø(€€€€€€€€€€€€€€€€€€ð½ÍÁ…¸ø(€€€€€€€€€€€€€€€€€€ñÍÁ…¸(€€€€€€€€€€€€€€€€€€€É•˜õì¡¹½‘”¤€ôøì(€€€€€€€€€€€€€€€€€€€€€½É‘Ì¹ÕÉÉ•¹Ñm¥t€ô¹½‘”(€€€€€€€€€€€€€€€€€€€õô(€€€€€€€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰…‰Í½±ÕÑ”‰±½¬ÜµlÄ¸ÕÁát‰œµ™½É•É½Õ¹¼ØÀˆ(€€€€€€€€€€€€€€€€€€€ÍÑå±”õíì±•™Ðè\€¼€È€´€À¸ÜÔ°Ñ½ÀèÉ••±Q½À€¬œ¹É••°€¨€À¸àÈ°¡•¥¡Ðèœ¹½É‘I•ÍÐ°ÑÉ…¹Í™½Éµ=É¥¥¸è€ˆÔÀ”€Àˆõô(€€€€€€€€€€€€€€€€€€¼ø(€€€€€€€€€€€€€€€€ð½ÍÁ…¸ø(€€€€€€€€€€€€€€€€ñÍÁ…¸(€€€€€€€€€€€€€€€€€É•˜õì¡¹½‘”¤€ôøì(€€€€€€€€€€€€€€€€€€€¡…¹Ì¹ÕÉÉ•¹Ñm¥t€ô¹½‘”(€€€€€€€€€€€€€€€€€õô(€€€€€€€€€€€€€€€€€‘…Ñ„µ¡…¹œ(€€€€€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰…‰Í½±ÕÑ”±•™Ð´À‰±½¬ˆ(€€€€€€€€€€€€€€€€€ÍÑå±”õíìÑ½Àè±¥ÁQ½À°Ý¥‘Ñ è\°¡•¥¡Ðè…É‘=™™Í•Ð€¬œ¹ °ÑÉ…¹Í™½Éµ=É¥¥¸è€‘í\€¼€ÉõÁà€ÁÁá€õô(€€€€€€€€€€€€€€€€ø(€€€€€€€€€€€€€€€€€€ñÍÁ…¸(€€€€€€€€€€€€€€€€€€€…É¥„µ¡¥‘‘•¸ô‰ÑÉÕ”ˆ(€€€€€€€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰…‰Í½±ÕÑ”±•™Ð´À‰±½¬ˆ(€€€€€€€€€€€€€€€€€€€ÍÑå±”õíìÑ½Àè…É‘=™™Í•Ð°Ý¥‘Ñ è\°¡•¥¡Ðèœ¹ °™¥±Ñ•Èè‰±ÕÈ ‘í5…Ñ ¹µ…à Ð°€à€¨œ¹Ô¤¹Ñ½¥á• Ä¥õÁà¥€õô(€€€€€€€€€€€€€€€€€€ø(€€€€€€€€€€€€€€€€€€€€ñÍÁ…¸(€€€€€€€€€€€€€€€€€€€€€É•˜õì¡¹½‘”¤€ôøì(€€€€€€€€€€€€€€€€€€€€€€€Í¡…‘½ÝÌ¹ÕÉÉ•¹Ñm¥t€ô¹½‘”(€€€€€€€€€€€€€€€€€€€€€õô(€€€€€€€€€€€€€€€€€€€€€‘…Ñ„µÍ¡…‘½Ü(€€€€€€€€€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰…‰Í½±ÕÑ”¥¹Í•Ð´À‰±½¬É½Õ¹‘•µlÄÁÁát‰œµ‰±…¬¼ÈÔ‘…É¬é‰œµ‰±…¬¼ÜÀˆ(€€€€€€€€€€€€€€€€€€€€¼ø(€€€€€€€€€€€€€€€€€€ð½ÍÁ…¸ø(€€€€€€€€€€€€€€€€€€ñ‰ÕÑÑ½¸(€€€€€€€€€€€€€€€€€€€É•˜õì¡¹½‘”¤€ôøì(€€€€€€€€€€€€€€€€€€€€€‰ÕÑÑ½¹Ì¹ÕÉÉ•¹Ñm¥t€ô¹½‘”(€€€€€€€€€€€€€€€€€€€õô(€€€€€€€€€€€€€€€€€€€ÑåÁ”ô‰‰ÕÑÑ½¸ˆ(€€€€€€€€€€€€€€€€€€€‘…Ñ„µ‰…‘”õí¥ô(€€€€€€€€€€€€€€€€€€€‘…Ñ„µ™±¥ÁÁ•õí¥Í±¥ÁÁ•€ü€‰ÑÉÕ”ˆ€è€‰™…±Í”‰ô(€€€€€€€€€€€€€€€€€€€‘…Ñ„µ…Ñ¥Ù”õí¥ÍÑ¥Ù”ñðÕ¹‘•™¥¹•‘ô(€€€€€€€€€€€€€€€€€€€Ñ…‰%¹‘•àõí¤€ôôô€¡…Ñ¥Ù”€üü™½ÕÍ%¹‘•à¤€ü€À€è€´Åô(€€€€€€€€€€€€€€€€€€€…É¥„µ±…‰•°õí€‘í¥Ñ•´¹¹…µ•ô°€‘í¥Ñ•´¹É½±•õô(€€€€€€€€€€€€€€€€€€€…É¥„µ‘•ÍÉ¥‰•‘‰äõí€‘íÕ¥‘ôµ…ÁÑ¥½¹ô(€€€€€€€€€€€€€€€€€€€…É¥„µÁÉ•ÍÍ•õí¥Í±¥ÁÁ•‘ô(€€€€€€€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰Á½¥¹Ñ•Èµ•Ù•¹ÑÌµ…ÕÑ¼…‰Í½±ÕÑ”±•™Ð´ÀÕÉÍ½ÈµÁ½¥¹Ñ•ÈÉ½Õ¹‘•µlÀ¸àÕ•µtÀ´ÀÑ•áÐµ±•™Ð½ÕÑ±¥¹”µ¹½¹”™½ÕÌµÙ¥Í¥‰±”é½ÕÑ±¥¹”™½ÕÌµÙ¥Í¥‰±”é½ÕÑ±¥¹”´È™½ÕÌµÙ¥Í¥‰±”é½ÕÑ±¥¹”µ½™™Í•Ð´Ð™½ÕÌµÙ¥Í¥‰±”é½ÕÑ±¥¹”µÉ¥¹œˆ(€€€€€€€€€€€€€€€€€€€ÍÑå±”õíìÑ½Àè…É‘=™™Í•Ð°Ý¥‘Ñ è\°¡•¥¡Ðèœ¹ °™½¹ÑM¥é”è‰…Í”õô(€€€€€€€€€€€€€€€€€€€½¹½ÕÌõì ¤€ôøì(€€€€€€€€€€€€€€€€€€€€€Í•Ñ½ÕÍ%¹‘•à¡¤¤(€€€€€€€€€€€€€€€€€€€€€¥˜€¡Á½¥¹Ñ•È¹ÕÉÉ•¹Ð¹¥€ð€À¤ì(€€€€€€€€€€€€€€€€€€€€€€€ÍÑ½À ¤(€€€€€€€€€€€€€€€€€€€€€€€Í•ÑÑ¥Ù”¡¤¤(€€€€€€€€€€€€€€€€€€€€€ô(€€€€€€€€€€€€€€€€€€€õô(€€€€€€€€€€€€€€€€€€€½¹±¥¬õì¡•Ù•¹Ð¤€ôøì(€€€€€€€€€€€€€€€€€€€€€½¹ÍÐÁ•¹‘¥¹œ€ôÁ•¹‘¥¹=Á•¸¹ÕÉÉ•¹Ð(€€€€€€€€€€€€€€€€€€€€€Á•¹‘¥¹=Á•¸¹ÕÉÉ•¹Ð€ô€´Ä(€€€€€€€€€€€€€€€€€€€€€¥˜€¡•Ù•¹Ð¹‘•Ñ…¥°€ôôô€ÀñðÁ•¹‘¥¹œ€ôôô¤¤Ñ½±”¡¤¤(€€€€€€€€€€€€€€€€€€€õô(€€€€€€€€€€€€€€€€€€ø(€€€€€€€€€€€€€€€€€€€€ñÍÁ…¸(€€€€€€€€€€€€€€€€€€€€€É•˜õì¡¹½‘”¤€ôøì(€€€€€€€€€€€€€€€€€€€€€€€™±¥ÁÌ¹ÕÉÉ•¹Ñm¥t€ô¹½‘”(€€€€€€€€€€€€€€€€€€€€€õô(€€€€€€€€€€€€€€€€€€€€€‘…Ñ„µ™±¥À(€€€€€€€€€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰…‰Í½±ÕÑ”¥¹Í•Ð´À‰±½¬mÑÉ…¹Í™½É´µÍÑå±”éÁÉ•Í•ÉÙ”´Í‘tˆ(€€€€€€€€€€€€€€€€€€€€€ÍÑå±”õíìÑÉ…¹Í™½É´èÁ•ÉÍÁ•Ñ¥Ù” ‘íAIMAQ%YõÁà¤É½Ñ…Ñ•d ‘íIMQ}em¤€”IMQ}d¹±•¹Ñ¡t€üü€Áõ‘•œ¥€õô(€€€€€€€€€€€€€€€€€€€€ø(€€€€€€€€€€€€€€€€€€€€€€ñ	…‘•…•Ì¥Ñ•´õí¥Ñ•µôÑ½¹”õíÑ½¹•ô€¼ø(€€€€€€€€€€€€€€€€€€€€ð½ÍÁ…¸ø(€€€€€€€€€€€€€€€€€€ð½‰ÕÑÑ½¸ø(€€€€€€€€€€€€€€€€€€ñÍÁ…¸(€€€€€€€€€€€€€€€€€€€…É¥„µ¡¥‘‘•¸ô‰ÑÉÕ”ˆ(€€€€€€€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰Á½¥¹Ñ•Èµ•Ù•¹ÑÌµ¹½¹”…‰Í½±ÕÑ”‰±½¬ˆ(€€€€€€€€€€€€€€€€€€€ÍÑå±”õíì±•™Ðè\€¼€È€´œ¹±¥Á\€¼€È°Ñ½Àè€À°Ý¥‘Ñ èœ¹±¥Á\°¡•¥¡Ðèœ¹±¥Á €¬€ÄÀ€¨œ¹Ôõô(€€€€€€€€€€€€€€€€€€ø(€€€€€€€€€€€€€€€€€€€€ñÍÁ…¸(€€€€€€€€€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰…‰Í½±ÕÑ”±•™Ð´Ä¼È‰±½¬€µÑÉ…¹Í±…Ñ”µà´Ä¼ÈÉ½Õ¹‘•µˆµlÉÁátˆ(€€€€€€€€€€€€€€€€€€€€€ÍÑå±”õíì(€€€€€€€€€€€€€€€€€€€€€€€Ñ½Àèœ¹±¥Á €¨€À¸Ü°(€€€€€€€€€€€€€€€€€€€€€€€Ý¥‘Ñ èœ¹±¥Á\€¨€À¸ÐÈ°(€€€€€€€€€€€€€€€€€€€€€€€¡•¥¡Ðè…É‘=™™Í•Ð€´œ¹±¥Á €¨€À¸Ü€¬€À¸ÜÈ€¨‰…Í”€¬€À¸Ì€¨‰…Í”°(€€€€€€€€€€€€€€€€€€€€€€€‰…­É½Õ¹èA1MQ%°(€€€€€€€€€€€€€€€€€€€€€õô(€€€€€€€€€€€€€€€€€€€€¼ø(€€€€€€€€€€€€€€€€€€€€ñÍÁ…¸(€€€€€€€€€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰…‰Í½±ÕÑ”¥¹Í•Ðµà´ÀÑ½À´À‰±½¬ˆ(€€€€€€€€€€€€€€€€€€€€€ÍÑå±”õíì(€€€€€€€€€€€€€€€€€€€€€€€¡•¥¡Ðèœ¹±¥Á °(€€€€€€€€€€€€€€€€€€€€€€€±¥ÁA…Ñ è€‰Á½±å½¸ ÈÐ”€À°€ÜØ”€À°€ÄÀÀ”€ÜÈ”°€äÐ”€ÄÀÀ”°€Ø”€ÄÀÀ”°€À€ÜÈ”¤ˆ°(€€€€€€€€€€€€€€€€€€€€€€€‰…­É½Õ¹èA1MQ%°(€€€€€€€€€€€€€€€€€€€€€õô(€€€€€€€€€€€€€€€€€€€€¼ø(€€€€€€€€€€€€€€€€€€€€ñÍÁ…¸±…ÍÍ9…µ”ô‰…‰Í½±ÕÑ”‰±½¬‰œµÝ¡¥Ñ”¼ÔÀˆÍÑå±”õíì±•™Ðè€ˆÌÀ”ˆ°É¥¡Ðè€ˆÌÀ”ˆ°Ñ½Àè€Ä°¡•¥¡Ðè€Äõô€¼ø(€€€€€€€€€€€€€€€€€€€€ñÍÁ…¸(€€€€€€€€€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰…‰Í½±ÕÑ”±•™Ð´Ä¼È‰±½¬€µÑÉ…¹Í±…Ñ”µà´Ä¼ÈÉ½Õ¹‘•µ™Õ±°‰œµ‰…­É½Õ¹ˆ(€€€€€€€€€€€€€€€€€€€€€ÍÑå±”õíì(€€€€€€€€€€€€€€€€€€€€€€€Ñ½Àèœ¹±¥Á €¨€À¸ÄÐ°(€€€€€€€€€€€€€€€€€€€€€€€Ý¥‘Ñ èœ¹±¥Á €¨€À¸ÌÐ°(€€€€€€€€€€€€€€€€€€€€€€€¡•¥¡Ðèœ¹±¥Á €¨€À¸ÌÐ°(€€€€€€€€€€€€€€€€€€€€€€€‰½áM¡…‘½Üè€‰¥¹Í•Ð€À€ÅÁà€ÅÁà½±½Èµµ¥à¡¥¸½­±…ˆ°‰±…¬€ÐÔ”°ÑÉ…¹ÍÁ…É•¹Ð¤ˆ°(€€€€€€€€€€€€€€€€€€€€€õô(€€€€€€€€€€€€€€€€€€€€¼ø(€€€€€€€€€€€€€€€€€€ð½ÍÁ…¸ø(€€€€€€€€€€€€€€€€€í¥Í±¥ÁÁ•€˜˜±¥¹­Ì¹±•¹Ñ €ø€À€˜˜€ (€€€€€€€€€€€€€€€€€€€€ñ‘¥Ø(€€€€€€€€€€€€€€€€€€€€€É•˜õì¡¹½‘”¤€ôøì(€€€€€€€€€€€€€€€€€€€€€€€±¥¹­1…å•ÉÌ¹ÕÉÉ•¹Ñm¥t€ô¹½‘”(€€€€€€€€€€€€€€€€€€€€€õô(€€€€€€€€€€€€€€€€€€€€€‘…Ñ„µ±¥¹­Ì(€€€€€€€€€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰Á½¥¹Ñ•Èµ•Ù•¹ÑÌµ¹½¹”…‰Í½±ÕÑ”±•™Ð´ÀÑÉ…¹Í¥Ñ¥½¸µ½Á…¥Ñä‘ÕÉ…Ñ¥½¸´ÄÔÀµ½Ñ¥½¸µÉ•‘Õ”éÑÉ…¹Í¥Ñ¥½¸µ¹½¹”ˆ(€€€€€€€€€€€€€€€€€€€€€ÍÑå±”õíìÑ½Àè…É‘=™™Í•Ð°Ý¥‘Ñ è\°¡•¥¡Ðèœ¹ °™½¹ÑM¥é”è‰…Í”°½Á…¥Ñäè€À°Ù¥Í¥‰¥±¥Ñäè€‰¡¥‘‘•¸ˆõô(€€€€€€€€€€€€€€€€€€€€ø(€€€€€€€€€€€€€€€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰…‰Í½±ÕÑ”‰½ÑÑ½´µlÀ¸ÜÕ•µt±•™ÐµlÀ¸Ù•µt™±•à™±•àµ½°¥Ñ•µÌµÍÑ…ÉÐ…ÀµlÀ¸Å•µtˆø(€€€€€€€€€€€€€€€€€€€€€€€í±¥¹­Ì¹µ…À ¡±¥¹¬¤€ôø€ (€€€€€€€€€€€€€€€€€€€€€€€€€€ñ„(€€€€€€€€€€€€€€€€€€€€€€€€€€€­•äõí±¥¹¬¹±…‰•±ô(€€€€€€€€€€€€€€€€€€€€€€€€€€€¡É•˜õí±¥¹¬¹¡É•™ô(€€€€€€€€€€€€€€€€€€€€€€€€€€€½¹A½¥¹Ñ•É½Ý¸õì¡•Ù•¹Ð¤€ôøì(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€•Ù•¹Ð¹ÍÑ½ÁAÉ½Á……Ñ¥½¸ ¤(€€€€€€€€€€€€€€€€€€€€€€€€€€€€€ÍÑ½À ¤(€€€€€€€€€€€€€€€€€€€€€€€€€€€õô(€€€€€€€€€€€€€€€€€€€€€€€€€€€½¹½ÕÌõíÍÑ½Áô(€€€€€€€€€€€€€€€€€€€€€€€€€€€±…ÍÍ9…µ”õí€‘í1%9-}I=]ôÁ½¥¹Ñ•Èµ•Ù•¹ÑÌµ…ÕÑ¼Ñ•áÐµ…Éµ™½É•É½Õ¹½ÕÑ±¥¹”µ¹½¹”¡½Ù•Èé‰œµµÕÑ•™½ÕÌµÙ¥Í¥‰±”éÉ¥¹œ´È™½ÕÌµÙ¥Í¥‰±”éÉ¥¹œµÉ¥¹ô(€€€€€€€€€€€€€€€€€€€€€€€€€€ø(€€€€€€€€€€€€€€€€€€€€€€€€€€€€ñ1¥¹­%½¸±…‰•°õí±¥¹¬¹±…‰•±ô€¼ø(€€€€€€€€€€€€€€€€€€€€€€€€€€€í±¥¹¬¹±…‰•±ô(€€€€€€€€€€€€€€€€€€€€€€€€€€ð½„ø(€€€€€€€€€€€€€€€€€€€€€€€€¤¥ô(€€€€€€€€€€€€€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€€€€€€€€€¥ô(€€€€€€€€€€€€€€€€ð½ÍÁ…¸ø(€€€€€€€€€€€€€€ð½ÍÁ…¸ø(€€€€€€€€€€€€ð½‘¥Øø(€€€€€€€€€€¤(€€€€€€€ô¥ô((€€€€€€€íÍ¥é”¹…É½ÕÍ•°€˜˜€ (€€€€€€€€€€ðø(€€€€€€€€€€€€ñ‘¥Ø(€€€€€€€€€€€€€…É¥„µ¡¥‘‘•¸ô‰ÑÉÕ”ˆ(€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰Á½¥¹Ñ•Èµ•Ù•¹ÑÌµ¹½¹”…‰Í½±ÕÑ”¥¹Í•Ðµä´À±•™Ð´Àè´ÔÀÜ´ÄÈ‰œµÉ…‘¥•¹ÐµÑ¼µÈ™É½´µ‰…­É½Õ¹™É½´´ÈÔ”Ñ¼µÑÉ…¹ÍÁ…É•¹Ðˆ(€€€€€€€€€€€€¼ø(€€€€€€€€€€€€ñ‘¥Ø(€€€€€€€€€€€€€…É¥„µ¡¥‘‘•¸ô‰ÑÉÕ”ˆ(€€€€€€€€€€€€€±…ÍÍ9…µ”ô‰Á½¥¹Ñ•Èµ•Ù•¹ÑÌµ¹½¹”…‰Í½±ÕÑ”¥¹Í•Ðµä´ÀÉ¥¡Ð´Àè´ÔÀÜ´ÄÈ‰œµÉ…‘¥•¹ÐµÑ¼µ°™É½´µ‰…­É½Õ¹™É½´´ÈÔ”Ñ¼µÑÉ…¹ÍÁ…É•¹Ðˆ(€€€€€€€€€€€€¼ø(€€€€€€€€€€ð¼ø(€€€€€€€€¥ô(€€€€€€ð½‘¥Øø((€€€€€íÍ¥é”¹…É½ÕÍ•°€˜˜½Õ¹Ð€ø€Ä€˜˜€ (€€€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰É•±…Ñ¥Ù”è´ÄÀµÐ´Ä™±•à©ÕÍÑ¥™äµ•¹Ñ•È…À´Ä¸ÔˆÉ½±”ô‰É½ÕÀˆ…É¥„µ±…‰•°õí±…‰•±Ì¹Í¡½Ýôø(€€€€€€€€€í¥Ñ•µÌ¹µ…À ¡¥Ñ•´°¤¤€ôø€ (€€€€€€€€€€€€ñ‰ÕÑÑ½¸(€€€€€€€€€€€€€­•äõí¥Ñ•´¹¥‘ô(€€€€€€€€€€€€€ÑåÁ”ô‰‰ÕÑÑ½¸ˆ(€€€€€€€€€€€€€…É¥„µ±…‰•°õí€‘í±…‰•±Ì¹Í¡½Ýô€‘í¥Ñ•´¹¹…µ•õô(€€€€€€€€€€€€€…É¥„µÕÉÉ•¹Ðõí•¹Ñ•É%¹‘•à€ôôô¥ô(€€€€€€€€€€€€€½¹±¥¬õì ¤€ôøì(€€€€€€€€€€€€€€€ÍÑ½À ¤(€€€€€€€€€€€€€€€Í•ÑÑ¥Ù”¡¤¤(€€€€€€€€€€€€€õô(€€€€€€€€€€€€€±…ÍÍ9…µ”õí ´Ä¸ÔÉ½Õ¹‘•µ™Õ±°½ÕÑ±¥¹”µ¹½¹”ÑÉ…¹Í¥Ñ¥½¸µmÝ¥‘Ñ ±‰…­É½Õ¹µ½±½Ét‘ÕÉ…Ñ¥½¸´ÌÀÀ™½ÕÌµÙ¥Í¥‰±”éÉ¥¹œ´È™½ÕÌµÙ¥Í¥‰±”éÉ¥¹œµÉ¥¹œµ½Ñ¥½¸µÉ•‘Õ”éÑÉ…¹Í¥Ñ¥½¸µ¹½¹”€‘í•¹Ñ•É%¹‘•à€ôôô¤€ü€‰Ü´Ø‰œµ™½É•É½Õ¹ˆ€è€‰Ü´Ä¸Ô‰œµ™½É•É½Õ¹¼ÈÔ¡½Ù•Èé‰œµ™½É•É½Õ¹¼ÐÔ‰õô(€€€€€€€€€€€€¼ø(€€€€€€€€€€¤¥ô(€€€€€€€€ð½‘¥Øø(€€€€€€¥ô((€€€€€€ñ‘¥Ø±…ÍÍ9…µ”ô‰É•±…Ñ¥Ù”è´ÄÀ™±•à™±•àµ½°¥Ñ•µÌµ•¹Ñ•È…À´ÌÁà´ØÁˆ´ÜÁÐ´ÌÑ•áÐµ•¹Ñ•Èˆø(€€€€€€€€ñ‘¥Ø¥õí€‘íÕ¥‘ôµ…ÁÑ¥½¹ô…É¥„µ±¥Ù”ô‰Á½±¥Ñ”ˆ±…ÍÍ9…µ”ô‰µ¥¸µ µlÈ¸ÙÉ•µtˆø(€€€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰Ñ•áÐµÍ´™½¹Ðµµ•‘¥Õ´ˆùí±¥¹”Åôð½Àø(€€€€€€€€€€ñÀ±…ÍÍ9…µ”ô‰µÐ´À¸ÔÑ•áÐµlÄÍÁátÑ•áÐµµÕÑ•µ™½É•É½Õ¹ˆùí±¥¹”Éôð½Àø(€€€€€€€€€íÍ¡½Ý¥¹	…¬€˜˜Á•ÉÍ½¸ü¹‰¥¼€˜˜€ñÍÁ…¸±…ÍÍ9…µ”ô‰ÍÈµ½¹±äˆùíÁ•ÉÍ½¸¹‰¥½ôð½ÍÁ…¸ùô(€€€€€€€€ð½‘¥Øø(€€€€€€€í…Ñ¥½¹ô(€€€€€€ð½‘¥Øø(€€€€ð½Í•Ñ¥½¸ø(€€¤)ô()•áÁ½ÉÐ‘•™…Õ±ÐQ•…µ1…¹å…É‘I…¥°