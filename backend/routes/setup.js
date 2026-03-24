const express = require('express');
const setupController = require('../controllers/setupController');

const router = express.Router();

// Route temporaire pour initialiser la base (à protéger ou supprimer après usage)
router.get('/init-db', setupController.initDatabase);

module.exports = router;