
'use strict';

class KNNModel {
    constructor(k = 7) {
        this.k = k;
        this.trainingData = [];
        this.isFitted = false;
    }

    fit(dataset) {
        if (!Array.isArray(dataset) || dataset.length === 0) {
            throw new Error('Dataset tidak boleh kosong.');
        }

        this.trainingData = dataset.map(item => ({
            r:          parseInt(item.R ?? item.r ?? 0),
            g:          parseInt(item.G ?? item.g ?? 0),
            b:          parseInt(item.B ?? item.b ?? 0),
            undertone:  item.undertone  ?? 'Neutral',
            skinTone:   item.skinTone   ?? '',
            fitzpatrick:item.fitzpatrick ?? '',
            brand:      item.brand      ?? '',
            product:    item.product    ?? '',
            shade:      item.shade      ?? '',
            hex:        item.hex        ?? '',
            popularity: item.popularity ?? 50,
        }));

        this.isFitted = true;
        console.log(`[KNN] fit() — ${this.trainingData.length} training samples loaded, K=${this.k}`);
    }

    euclideanDistance(color1, color2) {
        const rDiff = color1.r - color2.r;
        const gDiff = color1.g - color2.g;
        const bDiff = color1.b - color2.b;
        return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
    }

    findKNearest(targetColor, k = this.k) {
        if (!this.isFitted) throw new Error('Model belum di-fit. Panggil fit(dataset) dulu.');

        const withDistance = this.trainingData.map(sample => ({
            ...sample,
            distance: this.euclideanDistance(targetColor, sample),
        }));

        withDistance.sort((a, b) => a.distance - b.distance);

        return withDistance.slice(0, k);
    }

    classifyUndertone(targetColor) {
        const neighbors = this.findKNearest(targetColor);

        const votes = {};
        neighbors.forEach(n => {
            votes[n.undertone] = (votes[n.undertone] || 0) + 1;
        });

        const weightedVotes = {};
        neighbors.forEach(n => {
            const weight = 1 / (n.distance + 1);
            weightedVotes[n.undertone] = (weightedVotes[n.undertone] || 0) + weight;
        });

        const predictedUndertone = Object.keys(weightedVotes)
            .reduce((a, b) => weightedVotes[a] > weightedVotes[b] ? a : b);

        const totalVotes  = neighbors.length;
        const winnerVotes = votes[predictedUndertone] || 0;
        const confidence  = Math.round((winnerVotes / totalVotes) * 100);

        return {
            undertone:   predictedUndertone,
            confidence,
            votes,
            weightedVotes: Object.fromEntries(
                Object.entries(weightedVotes).map(([k, v]) => [k, +v.toFixed(4)])
            ),
            neighbors: neighbors.map(n => ({
                hex:       n.hex,
                brand:     n.brand,
                product:   n.product,
                undertone: n.undertone,
                distance:  +n.distance.toFixed(4),
            })),
        };
    }

    recommendProducts(targetColor, undertoneFilter = null, limit = 10) {
        if (!this.isFitted) throw new Error('Model belum di-fit.');

        const pool = undertoneFilter
            ? this.trainingData.filter(s => s.undertone === undertoneFilter)
            : this.trainingData;

        if (pool.length === 0) {
            return [];
        }

        const withDistance = pool.map(sample => ({
            ...sample,
            distance:  this.euclideanDistance(targetColor, sample),
            matchScore: 0,
        }));

        withDistance.sort((a, b) => a.distance - b.distance);

        const MAX_DIST = Math.sqrt(3 * 255 * 255);
        const result = withDistance.slice(0, limit).map(p => ({
            id:          p.id,
            brand:       p.brand,
            product:     p.product,
            shade:       p.shade,
            hex:         p.hex,
            undertone:   p.undertone,
            skinTone:    p.skinTone,
            fitzpatrick: p.fitzpatrick,
            popularity:  p.popularity,
            distance:    +p.distance.toFixed(4),
            matchScore:  Math.round((1 - p.distance / MAX_DIST) * 100),
        }));

        return result;
    }

    static hexToRGB(hex) {
        const h = hex.replace('#', '');
        if (h.length !== 6) throw new Error(`Invalid hex: ${hex}`);
        return {
            r: parseInt(h.substring(0, 2), 16),
            g: parseInt(h.substring(2, 4), 16),
            b: parseInt(h.substring(4, 6), 16),
        };
    }

    getModelInfo() {
        return {
            algorithm:     'K-Nearest Neighbors (manual implementation)',
            k:             this.k,
            metric:        'Euclidean distance',
            voting:        'weighted (1 / distance+1)',
            trainingSize:  this.trainingData.length,
            isFitted:      this.isFitted,
            subCPMK:       '230',
        };
    }
}

module.exports = KNNModel;