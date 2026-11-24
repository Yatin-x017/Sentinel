import { Router } from "express"
import { startVerification, confirmVerification, resendVerification } from "../controllers/verification.controller.js"
import { validateObjectId } from "../validators/scans.validator.js"

const router = Router()
router.post("/", startVerification)
router.post("/:id/confirm", validateObjectId, confirmVerification)
router.post("/:id/resend", validateObjectId, resendVerification)

export default router
