import { Router } from 'express';
import { startScan, getScanStatus, getScanFindings, deleteScan } from '../controllers/scans.controller.js';

const router = Router();
router.post('/', startScan);
router.get('/:id', getScanStatus);
router.get('/:id/findings', getScanFindings);
router.delete('/:id', deleteScan);

export default router;