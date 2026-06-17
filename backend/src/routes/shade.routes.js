'use strict';

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/shadeController');

router.post('/analyze', controller.analyzeShade);

router.post('/match',   controller.matchShade);

router.get('/evaluate', controller.evaluateModel);

module.exports = router;