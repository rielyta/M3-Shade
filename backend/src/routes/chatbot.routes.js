'use strict';

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/chatbotController');

router.post('/message', controller.sendMessage);

router.get('/info',     controller.getProcessorInfo);

module.exports = router;