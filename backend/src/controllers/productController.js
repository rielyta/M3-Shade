'use strict';

const path        = require('path');
const fs          = require('fs');
const KNNModel    = require('../models/knnModel');
const ColorMatcher = require('../models/colorMatcher');

const DATASET_PATH = path.join(__dirname, '../../data/foundation-shades.json');

let products = [];
let knn      = new KNNModel(7);
let matcher  = new ColorMatcher();

try {
    products = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf-8'));
    knn.fit(products);
    console.log(`[ProductController] Loaded ${products.length} products, KNN fitted.`);
} catch (err) {
    console.error(`[ProductController] Gagal load dataset: ${err.message}`);
}

function calculateBrandDistribution(data) {
    const distribution = {};

    data.forEach(product => {
        const brand = product.brand || 'Unknown';
        distribution[brand] = (distribution[brand] || 0) + 1;
    });

    return Object.fromEntries(
        Object.entries(distribution).sort((a, b) => b[1] - a[1])
    );
}

function calculateUndertoneDist(data) {
    const dist = {};
    data.forEach(p => {
        const u = p.undertone || 'Unknown';
        dist[u] = (dist[u] || 0) + 1;
    });
    return Object.fromEntries(
        Object.entries(dist).sort((a, b) => b[1] - a[1])
    );
}

function calculateSkinToneDist(data) {
    const ORDER = ['Very Fair','Fair','Light Medium','Medium','Tan','Deep','Very Deep'];
    const dist  = {};
    data.forEach(p => {
        const s = p.skinTone || 'Unknown';
        dist[s] = (dist[s] || 0) + 1;
    });
    const sorted = {};
    ORDER.forEach(st => { if (dist[st]) sorted[st] = dist[st]; });
    Object.keys(dist).forEach(k => { if (!sorted[k]) sorted[k] = dist[k]; });
    return sorted;
}

function rankTopBrands(distribution, n = 5) {
    const total  = Object.values(distribution).reduce((s, v) => s + v, 0);
    return Object.entries(distribution)
        .slice(0, n)
        .map(([brand, count]) => ({
            brand,
            count,
            percentage: +((count / total) * 100).toFixed(2),
        }));
}

function calcMatchScore(distance) {
    const MAX = Math.sqrt(3 * 255 * 255);
    return Math.round((1 - distance / MAX) * 100);
}

exports.getPopularProducts = (req, res) => {
    try {
        const limit     = Math.min(parseInt(req.query.limit) || 10, 50);
        const undertone = req.query.undertone || null;
        const skinTone  = req.query.skinTone  || null;

        let filtered = products;
        if (undertone) filtered = filtered.filter(p => p.undertone === undertone);
        if (skinTone)  filtered = filtered.filter(p => p.skinTone  === skinTone);

        const brandDist = calculateBrandDistribution(filtered);
        const topBrands = rankTopBrands(brandDist, 5).map(b => b.brand);

        const ranked = filtered
            .map(p => ({
                ...p,
                rankScore: p.popularity + (topBrands.includes(p.brand) ? 10 : 0),
            }))
            .sort((a, b) => b.rankScore - a.rankScore)
            .slice(0, limit)
            .map(({ rankScore, ...p }) => p);

        res.json({
            success: true,
            count:   ranked.length,
            filters: { undertone, skinTone },
            data:    ranked,
        });

    } catch (err) {
        console.error('[getPopularProducts]', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getBrandDistribution = (req, res) => {
    try {
        const top  = Math.min(parseInt(req.query.top) || 10, 36);

        const distribution = calculateBrandDistribution(products);
        const topBrands    = rankTopBrands(distribution, top);
        const total        = products.length;

        res.json({
            success: true,
            total,
            topBrands,
            fullDistribution: distribution,
            subCPMK: '232 — Big Data Analysis & Ranking',
        });

    } catch (err) {
        console.error('[getBrandDistribution]', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getDatasetStats = (req, res) => {
    try {
        const brandDist    = calculateBrandDistribution(products);
        const undertoneDist = calculateUndertoneDist(products);
        const skinToneDist  = calculateSkinToneDist(products);

        const popularityByBrand = {};
        products.forEach(p => {
            if (!popularityByBrand[p.brand]) {
                popularityByBrand[p.brand] = { total: 0, count: 0 };
            }
            popularityByBrand[p.brand].total += p.popularity;
            popularityByBrand[p.brand].count += 1;
        });
        const avgPopularityByBrand = Object.fromEntries(
            Object.entries(popularityByBrand)
                .map(([brand, { total, count }]) => [brand, +(total / count).toFixed(1)])
                .sort((a, b) => b[1] - a[1])
        );

        res.json({
            success: true,
            stats: {
                totalProducts:     products.length,
                totalBrands:       Object.keys(brandDist).length,
                brandDistribution: brandDist,
                topBrands:         rankTopBrands(brandDist, 5),
                undertoneDistribution: undertoneDist,
                skinToneDistribution:  skinToneDist,
                avgPopularityByBrand,
            },
            subCPMK: '232 — Big Data Analysis & Ranking',
        });

    } catch (err) {
        console.error('[getDatasetStats]', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getRecommendations = (req, res) => {
    try {
        const { hex, r, g, b } = req.body;

        let targetRGB;
        if (hex) {
            targetRGB = KNNModel.hexToRGB(hex);
        } else if (r !== undefined && g !== undefined && b !== undefined) {
            targetRGB = {
                r: parseInt(r),
                g: parseInt(g),
                b: parseInt(b),
            };
        } else {
            return res.status(400).json({
                success: false,
                error: 'Kirim { hex } atau { r, g, b } di request body.',
            });
        }

        if ([targetRGB.r, targetRGB.g, targetRGB.b].some(v => v < 0 || v > 255 || isNaN(v))) {
            return res.status(400).json({
                success: false,
                error: 'Nilai RGB harus antara 0–255.',
            });
        }

        const undertoneFilter = req.query.undertone || null;
        const limit           = Math.min(parseInt(req.query.limit) || 10, 20);

        const knnResult = knn.classifyUndertone(targetRGB);

        const filterUndertone = undertoneFilter || knnResult.undertone;

        const recommendations = matcher.matchShade(
            targetRGB,
            undertoneFilter ? products.filter(p => p.undertone === undertoneFilter) : products,
            limit
        );

        res.json({
            success: true,
            input: {
                rgb: targetRGB,
                hex: hex || matcher.rgbToHex(targetRGB),
            },
            analysis: {
                predictedUndertone: knnResult.undertone,
                confidence:         knnResult.confidence,
                votes:              knnResult.votes,
            },
            recommendations,
            count: recommendations.length,
        });

    } catch (err) {
        console.error('[getRecommendations]', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getAllProducts = (req, res) => {
    try {
        const { undertone, skinTone, fitzpatrick, brand } = req.query;
        const page  = Math.max(parseInt(req.query.page)  || 1, 1);
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);

        let filtered = products;
        if (undertone)   filtered = filtered.filter(p => p.undertone   === undertone);
        if (skinTone)    filtered = filtered.filter(p => p.skinTone    === skinTone);
        if (fitzpatrick) filtered = filtered.filter(p => p.fitzpatrick === fitzpatrick);
        if (brand)       filtered = filtered.filter(p =>
            p.brand.toLowerCase().includes(brand.toLowerCase())
        );

        const total     = filtered.length;
        const totalPages = Math.ceil(total / limit);
        const start     = (page - 1) * limit;
        const paginated = filtered.slice(start, start + limit);

        res.json({
            success: true,
            total,
            page,
            totalPages,
            limit,
            filters: { undertone, skinTone, fitzpatrick, brand },
            data:    paginated,
        });

    } catch (err) {
        console.error('[getAllProducts]', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};