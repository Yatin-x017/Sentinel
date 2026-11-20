import VerificationSession from "../models/VerificationSession.js"
import ScanSession from "../models/ScanSession.js"
import { normalizeEmail, hmacHash } from "../middleware/crypto.utils.js"
import { isValidEmail } from "../validators/input.validator.js"
import { runScanPipeline } from "../services/scan-orchestrator.service.js"

export async function startScan(req, res) {
  const { verificationId, sessionToken, email } = req.body

  if (!verificationId || !sessionToken || !isValidEmail(email)) {
    return res.status(400).json({ error: "INVALID_REQUEST", message: "Verified session and email required." })
  }

  const verification = await VerificationSession.findById(verificationId)
  if (!verification || !verification.verified || verification.expiresAt < new Date()) {
    return res.status(401).json({ error: "UNVERIFIED_SESSION", message: "Ownership verification required." })
  }

  const tokenHash = hmacHash(sessionToken, process.env.OTP_HMAC_SECRET)
  const emailHash = hmacHash(normalizeEmail(email), process.env.EMAIL_HMAC_SECRET)

  if (verification.sessionTokenHash !== tokenHash || verification.emailHash !== emailHash) {
    return res.status(403).json({ error: "SESSION_MISMATCH", message: "Session does not match verified email." })
  }

  const scan = await ScanSession.create({
    verificationSessionId: verification._id,
    status: "running",
    sourcesStatus: [
      { sourceId: "sentinel_verified_feed_01", sourceName: "Primary Breach Metadata Feed", status: "pending" },
      { sourceId: "sentinel_archive_feed_02", sourceName: "Secondary Archive Index", status: "pending" },
    ],
    expiresAt: new Date(Date.now() + 20 * 60 * 1000),
  })

  const normalized = normalizeEmail(email)
  runScanPipeline(normalized)
    .then(async (outcome) => {
      await ScanSession.findByIdAndUpdate(scan._id, {
        status: outcome.status,
        sourcesStatus: outcome.sourcesStatus,
        findings: outcome.findings,
        actions: outcome.actions,
      })
    })
    .catch(async () => {
      await ScanSession.findByIdAndUpdate(scan._id, { status: "failed" })
    })

  return res.status(202).json({
    scanId: scan._id,
    status: scan.status,
    sourcesStatus: scan.sourcesStatus,
  })
}

export async function getScanStatus(req, res) {
  const scan = await ScanSession.findById(req.params.id)
  if (!scan) {
    return res.status(404).json({ error: "SCAN_NOT_FOUND", message: "Scan session not found or cleared." })
  }

  return res.status(200).json({
    scanId: scan._id,
    status: scan.status,
    sourcesStatus: scan.sourcesStatus,
    matchCount: scan.findings.length,
  })
}

export async function getScanFindings(req, res) {
  const scan = await ScanSession.findById(req.params.id)
  if (!scan) {
    return res.status(404).json({ error: "SCAN_NOT_FOUND", message: "Scan session not found or cleared." })
  }

  return res.status(200).json({
    scanId: scan._id,
    status: scan.status,
    sourcesStatus: scan.sourcesStatus,
    summary: {
      matchingRecords: scan.findings.length,
      sourcesChecked: scan.sourcesStatus.length,
      sourcesSucceeded: scan.sourcesStatus.filter((s) => s.status === "success").length,
    },
    findings: scan.findings,
    actions: scan.actions,
  })
}

export async function deleteScan(req, res) {
  const scan = await ScanSession.findById(req.params.id)
  if (scan) {
    await VerificationSession.findByIdAndDelete(scan.verificationSessionId)
    await ScanSession.findByIdAndDelete(scan._id)
  }
  return res.status(200).json({ cleared: true, message: "Temporary scan and verification records deleted." })
}
