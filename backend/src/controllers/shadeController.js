'use strict';

const path         = require('path');
const fs           = require('fs');
const KNNModel     = require('../models/knnModel');
const ColorMatcher = require('../models/colorMatcher');

const DATASET_PATH = path.join(__dirname, '../../data/foundation-shades.json');

let products = [];
const knn    = new KNNModel(7);
const matcher = new ColorMatcher();

try {
    products = JSON.parse(fs.readFileSync(DATASET_PATH, 'utf-8'));
    knn.fit(products);
    console.log(`[ShadeController] ${products.length} products loaded.`);
} catch (err) {
    console.error(`[ShadeController] Dataset error: ${err.message}`);
}

function parseColor(body) {
    const { hex, r, g, b } = body;
    if (hex) return KNNModel.hexToRGB(hex);
    if (r !== undefined && g !== undefined && b !== undefined) {
        return { r: parseInt(r), g: parseInt(g), b: parseInt(b) };
    }
    throw new Error('Kirim { hex } atau { r, g, b }.');
}

function validateRGB({ r, g, b }) {
    return [r, g, b].every(v => !isNaN(v) && v >= 0 && v <= 255);
}

exports.analyzeShade = (req, res) => {
    try {
        const rgb = parseColor(req.body);
        if (!validateRGB(rgb)) {
            return res.status(400).json({ success: false, error: 'RGB harus 0–255.' });
        }

        const knnResult = knn.classifyUndertone(rgb);

        const luminance = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
        const skinTone  = classifySkinTone(luminance);
        const fitzpatrick = classifyFitzpatrick(luminance);

        res.json({
            success: true,
            input: {
                rgb,
                hex: matcher.rgbToHex(rgb),
            },
            result: {
                undertone:    knnResult.undertone,
                confidence:   knnResult.confidence,
                skinTone,
                fitzpatrick,
                luminance:    +luminance.toFixed(2),
            },
            knn: {
                k:            7,
                votes:        knnResult.votes,
                weightedVotes: knnResult.weightedVotes,
                nearestNeighbors: knnResult.neighbors.slice(0, 3),
            },
            subCPMK: '230',
        });

    } catch (err) {
        console.error('[analyzeShade]', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.matchShade = (req, res) => {
    try {
        const rgb   = parseColor(req.body);
        if (!validateRGB(rgb)) {
            return res.status(400).json({ success: false, error: 'RGB harus 0–255.' });
        }

        const limit     = Math.min(parseInt(req.query.limit) || 10, 20);
        const undertone = req.query.undertone || null;

        const pool = undertone
            ? products.filter(p => p.undertone === undertone)
            : products;

        const matches = matcher.matchShade(rgb, pool, limit);

        const avgMSE    = +(matches.reduce((s, m) => s + m.metrics.mse,    0) / matches.length).toFixed(4);
        const avgDeltaE = +(matches.reduce((s, m) => s + m.metrics.deltaE, 0) / matches.length).toFixed(4);

        res.json({
            success: true,
            input: { rgb, hex: matcher.rgbToHex(rgb) },
            evaluation: {
                avgMSE,
                avgDeltaE,
                interpretation: {
                    mse:    matcher.interpretMSE(avgMSE),
                    deltaE: matcher.interpretDeltaE(avgDeltaE),
                },
            },
            matches,
            count:   matches.length,
            subCPMK: '231',
        });

    } catch (err) {
        console.error('[matchShade]', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.evaluateModel = (req, res) => {
    try {
        const n = Math.min(parseInt(req.query.n) || 100, products.length);

        const shuffled = [...products].sort(() => Math.random() - 0.5).slice(0, n);

        const samples = shuffled.map(product => {
            const actual   = { r: product.R, g: product.G, b: product.B };
            const matches  = matcher.matchShade(actual, products, 2);
            const predicted = matches[1] || matches[0];
            return {
                predicted: predicted.hex,
                actual:    product.hex,
            };
        });

        const evaluation = matcher.evaluateBatch(samples);

        res.json({
            success: true,
            sampleSize: n,
            evaluation,
            modelInfo:  knn.getModelInfo(),
        });

    } catch (err) {
        console.error('[evaluateModel]', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};

function classifySkinTone(lum) {
    if (lum > 200) return 'Very Fair';
    if (lum > 170) return 'Fair';
    if (lum > 140) return 'Light Medium';
    if (lum > 110) return 'Medium';
    if (lum > 80)  return 'Tan';
    if (lum > 55)  return 'Deep';
    return 'Very Deep';
}

function classifyFitzpatrick(lum) {
    if (lum > 210) return 'I';
    if (lum > 175) return 'II';
    if (lum > 140) return 'III';
    if (lum > 105) return 'IV';
    if (lum > 70)  return 'V';
    return 'VI';
}