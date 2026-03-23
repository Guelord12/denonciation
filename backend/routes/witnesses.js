const express = require('express');
const witnessController = require('../controllers/witnessController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/:reportId', authMiddleware, witnessController.addWitness.bind(witnessController));
router.get('/:reportId/status', authMiddleware, witnessController.hasWitnessed.bind(witnessController));

module.exports = router;