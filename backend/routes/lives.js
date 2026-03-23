const express = require('express');
const liveController = require('../controllers/liveController');
const authMiddleware = require('../middleware/authMiddleware');
const { moderateMessage } = require('../middleware/moderationMiddleware');

const router = express.Router();

router.post('/', authMiddleware, liveController.createLive.bind(liveController));
router.get('/active', authMiddleware, liveController.getActiveLives.bind(liveController));
router.get('/active/filtered', authMiddleware, liveController.getActiveLivesFiltered.bind(liveController));
router.get('/:id', authMiddleware, liveController.getLiveById.bind(liveController));
router.post('/:id/start', authMiddleware, liveController.startLive.bind(liveController));
router.post('/:id/end', authMiddleware, liveController.endLive.bind(liveController));
router.post('/:liveId/messages', authMiddleware, moderateMessage, liveController.sendMessage.bind(liveController));
router.get('/:liveId/messages', authMiddleware, liveController.getMessages.bind(liveController));
router.post('/:liveId/join', authMiddleware, liveController.joinLive.bind(liveController));
router.post('/:liveId/leave', authMiddleware, liveController.leaveLive.bind(liveController));
router.get('/:liveId/participants', authMiddleware, liveController.getParticipants.bind(liveController));

module.exports = router;