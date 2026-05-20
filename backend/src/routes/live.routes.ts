import { Router } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth.middleware';
import { validate, schemas } from '../middleware/validation.middleware';
import {
  createLiveStream,
  getLiveStreams,
  getLiveStreamById,
  updateLiveStream,
  endLiveStream,
  subscribeToStream,
  subscribeToChannel,
  likeStream,
  sendSuperChat,
  reportStream,
  getStreamMessages,
  getStreamStats,
  createClip,
  getStreamViewers,
  getLiveFeed,
  sendGift,
  getGiftList,
  getLeaderboard,
  startBroadcast,
  stopBroadcast,
  joinStreamAsViewer,
  leaveStream,
  getMyStreams,
  deleteStream,
} from '../controllers/live.controller';

const router = Router();

// =====================================================
// ROUTES PUBLIQUES
// =====================================================
router.get('/', getLiveStreams);
router.get('/feed', optionalAuth, getLiveFeed);
router.get('/gifts', getGiftList);
router.get('/:id', optionalAuth, getLiveStreamById);
router.get('/:id/messages', getStreamMessages);
router.get('/:id/stats', getStreamStats);
router.get('/:id/viewers', getStreamViewers);
router.get('/:id/leaderboard', getLeaderboard);

// =====================================================
// ROUTES AUTHENTIFIÉES
// =====================================================
router.post('/', authenticate, validate(schemas.createLiveStream), createLiveStream);
router.put('/:id', authenticate, updateLiveStream);
router.post('/:id/end', authenticate, endLiveStream);
router.post('/:id/start', authenticate, startBroadcast);
router.post('/:id/stop', authenticate, stopBroadcast);
router.post('/:id/join', authenticate, joinStreamAsViewer);
router.post('/:id/leave', authenticate, leaveStream);
router.post('/:id/subscribe', authenticate, subscribeToStream);
router.post('/channels/:channelId/subscribe', authenticate, subscribeToChannel);
router.post('/:id/like', authenticate, likeStream);
router.post('/:id/super-chat', authenticate, sendSuperChat);
router.post('/:id/gift', authenticate, sendGift);
router.post('/:id/report', authenticate, reportStream);
router.post('/:id/clips', authenticate, createClip);
router.get('/my/streams', authenticate, getMyStreams);
router.delete('/:id', authenticate, deleteStream);

export default router;