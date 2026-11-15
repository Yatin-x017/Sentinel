/*
 * Single entry point for all scan/verification calls. Pages never talk to fetch directly.
 * VITE_USE_MOCK=false switches from synthetic demo data to the real backend.
 */
import * as mock from './mockScanApi.js'
import * as real from './realScanApi.js'

export const isDemo = import.meta.env.VITE_USE_MOCK !== 'false'
const api = isDemo ? mock : real

export const { startVerification, resendVerification, confirmVerification, getScan, cancelScan, retryScan, demoHint } = api
