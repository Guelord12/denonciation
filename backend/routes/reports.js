const express = require('express');
const reportController = require('../controllers/reportController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../config/multer');

const router = express.Router();

router.post('/', authMiddleware, reportController.createReport.bind(reportController));
router.get('/', authMiddleware, reportController.getReports.bind(reportController));
router.get('/me', authMiddleware, reportController.getMyReports.bind(reportController));
router.get('/:id', authMiddleware, reportController.getReportById.bind(reportController));
router.delete('/:id', authMiddleware, reportController.deleteReport.bind(reportController));
router.post('/upload', authMiddleware, upload.single('evidence'), reportController.uploadEvidence.bind(reportController));

module.exports = router;