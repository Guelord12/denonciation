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
} from '../controllers/live.controller';

const router = Router();

// =====================================================
// ROUTES PUBLIQUES
// =====================================================
router.get('/', getLiveStreams);
router.get('/:id', optionalAuth, getLiveStreamById);
router.get('/:id/messages', getStreamMessages);
router.get('/:id/stats', getStreamStats);
router.get('/:id/viewers', getStreamViewers);

// =====================================================
// ROUTES AUTHENTIFIÉES
// =====================================================
router.post('/', authenticate, validate(schemas.createLiveStream), createLiveStream);
router.put('/:id', authenticate, updateLiveStream);
router.post('/:id/end', authenticate, endLiveStream);
router.post('/:id/subscribe', authenticate, subscribeToStream);
router.post('/channels/:channelId/subscribe', authenticate, subscribeToChannel);
router.post('/:id/like', authenticate, likeStream);
router.post('/:id/super-chat', authenticate, sendSuperChat);
router.post('/:id/report', authenticate, reportStream);
router.post('/:id/clips', authenticate, createClip);

export default router;