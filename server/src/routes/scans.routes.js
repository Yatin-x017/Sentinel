import { Router } from 'express';
import { startScan, getScanStatus, getScanFindings, deleteScan } from '../controllers/scans.controller.js';
import { validateObjectId } from '../validators/scans.validator.js';

const router = Router();
router.post('/', startScan);
router.get('/:id',validateObjectId, getScanStatus);
router.get('/:id/findings',validateObjectId, getScanFindings);
router.delete('/:id',validateObjectId, deleteScan);

export default router;