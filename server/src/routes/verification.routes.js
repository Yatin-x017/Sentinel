import { Router } from 'express';
import { startVerification, confirmVerification, resendVerification } from '../controllers/verification.controller.js';

const router = Router();
router.post('/', startVerification);
router.post('/:id/confirm', confirmVerification);
router.post('/:id/resend', resendVerification);

export default router;