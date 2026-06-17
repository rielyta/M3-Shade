'use strict';

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/productController');

router.get('/',          controller.getAllProducts);

router.get('/popular',   controller.getPopularProducts);

router.get('/brands',    controller.getBrandDistribution);

router.get('/stats',     controller.getDatasetStats);

router.post('/recommend', controller.getRecommendations);

module.exports = router;