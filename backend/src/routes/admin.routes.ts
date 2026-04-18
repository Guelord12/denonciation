import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validate, schemas } from '../middleware/validation.middleware';
import {
  getDashboardStats,
  getAllUsers,
  banUser,
  unbanUser,
  getReports,
  updateReportStatus,
  getModerationReports,
  resolveModerationReport,
  getActivityLogs,
  sendWarningSMS,
  getRealtimeStats,
  exportData
} from '../controllers/admin.controller';

const router = Router();

router.use(authenticate);
router.use(authorize('admin'));

router.get('/dashboard', getDashboardStats);
router.get('/realtime-stats', getRealtimeStats);
router.get('/users', getAllUsers);
router.get('/reports', getReports);
router.get('/moderation', getModerationReports);
router.get('/logs', getActivityLogs);
router.get('/export/:type', exportData);

router.post('/users/:userId/ban', validate(schemas.banUser), banUser);
router.post('/users/:userId/unban', unbanUser);
router.post('/users/:userId/warn', validate(schemas.sendWarning), sendWarningSMS);
router.patch('/reports/:reportId/status', validate(schemas.updateReportStatus), updateReportStatus);
router.patch('/moderation/:reportId/resolve', resolveModerationReport);

export default router;