'use strict';

class ColorMatcher {

    hexToRGB(hex) {
        const h = String(hex).replace('#', '');
        if (h.length !== 6) throw new Error(`Invalid hex color: ${hex}`);
        return {
            r: parseInt(h.substring(0, 2), 16),
            g: parseInt(h.substring(2, 4), 16),
            b: parseInt(h.substring(4, 6), 16),
        };
    }

    rgbToHex({ r, g, b }) {
        return '#' + [r, g, b]
            .map(x => Math.round(Math.min(255, Math.max(0, x)))
                .toString(16).padStart(2, '0'))
            .join('').toUpperCase();
    }

    rgbToXYZ({ r, g, b }) {
        const linearize = c => {
            const v = c / 255;
            return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        };

        const lr = linearize(r);
        const lg = linearize(g);
        const lb = linearize(b);

        return {
            x: (lr * 0.4124564 + lg * 0.3575761 + lb * 0.1804375) * 100,
            y: (lr * 0.2126729 + lg * 0.7151522 + lb * 0.0721750) * 100,
            z: (lr * 0.0193339 + lg * 0.1191920 + lb * 0.9503041) * 100,
        };
    }

    xyzToLab({ x, y, z }) {
        const xn = 95.047, yn = 100.0, zn = 108.883;

        const f = t => t > 0.008856
            ? Math.cbrt(t)
            : (7.787 * t) + (16 / 116);

        const fx = f(x / xn);
        const fy = f(y / yn);
        const fz = f(z / zn);

        return {
            L: (116 * fy) - 16,
            a: 500 * (fx - fy),
            b: 200 * (fy - fz),
        };
    }

    rgbToLab(rgb) {
        return this.xyzToLab(this.rgbToXYZ(rgb));
    }

    calculateMSE(predicted, actual) {
        const p = typeof predicted === 'string' ? this.hexToRGB(predicted) : predicted;
        const a = typeof actual    === 'string' ? this.hexToRGB(actual)    : actual;

        const rErr = Math.pow(p.r - a.r, 2);
        const gErr = Math.pow(p.g - a.g, 2);
        const bErr = Math.pow(p.b - a.b, 2);

        return (rErr + gErr + bErr) / 3;
    }

    calculateMAE(predicted, actual) {
        const p = typeof predicted === 'string' ? this.hexToRGB(predicted) : predicted;
        const a = typeof actual    === 'string' ? this.hexToRGB(actual)    : actual;

        const rErr = Math.abs(p.r - a.r);
        const gErr = Math.abs(p.g - a.g);
        const bErr = Math.abs(p.b - a.b);

        return (rErr + gErr + bErr) / 3;
    }

    calculateRMSE(predicted, actual) {
        return Math.sqrt(this.calculateMSE(predicted, actual));
    }

    calculateEuclideanDistance(color1, color2) {
        const c1 = typeof color1 === 'string' ? this.hexToRGB(color1) : color1;
        const c2 = typeof color2 === 'string' ? this.hexToRGB(color2) : color2;

        return Math.sqrt(
            Math.pow(c1.r - c2.r, 2) +
            Math.pow(c1.g - c2.g, 2) +
            Math.pow(c1.b - c2.b, 2)
        );
    }

    calculateDeltaE(color1, color2) {
        const c1 = typeof color1 === 'string' ? this.hexToRGB(color1) : color1;
        const c2 = typeof color2 === 'string' ? this.hexToRGB(color2) : color2;

        const lab1 = this.rgbToLab(c1);
        const lab2 = this.rgbToLab(c2);

        return Math.sqrt(
            Math.pow(lab1.L - lab2.L, 2) +
            Math.pow(lab1.a - lab2.a, 2) +
            Math.pow(lab1.b - lab2.b, 2)
        );
    }

    evaluateBatch(samples) {
        if (!Array.isArray(samples) || samples.length === 0) {
            throw new Error('Samples tidak boleh kosong.');
        }

        const results = samples.map(({ predicted, actual }) => ({
            mse:       this.calculateMSE(predicted, actual),
            mae:       this.calculateMAE(predicted, actual),
            rmse:      this.calculateRMSE(predicted, actual),
            euclidean: this.calculateEuclideanDistance(predicted, actual),
            deltaE:    this.calculateDeltaE(predicted, actual),
        }));

        const avg = key => results.reduce((sum, r) => sum + r[key], 0) / results.length;

        return {
            avgMSE:       +avg('mse').toFixed(4),
            avgMAE:       +avg('mae').toFixed(4),
            avgRMSE:      +avg('rmse').toFixed(4),
            avgEuclidean: +avg('euclidean').toFixed(4),
            avgDeltaE:    +avg('deltaE').toFixed(4),
            count:        results.length,
            subCPMK:      '231',
            interpretation: {
                mse:    'Mendekati 0 = prediksi warna sangat akurat',
                deltaE: 'ΔE < 2 tidak terlihat mata, ΔE < 10 perbedaan kecil',
            },
        };
    }

    matchShade(userColor, products, limit = 10) {
        const target = typeof userColor === 'string'
            ? this.hexToRGB(userColor)
            : userColor;

        const MAX_DIST = Math.sqrt(3 * 255 * 255);

        const scored = products.map(product => {
            const productRGB = this.hexToRGB(product.hex);

            const euclidean = this.calculateEuclideanDistance(target, productRGB);
            const mse       = this.calculateMSE(target, productRGB);
            const deltaE    = this.calculateDeltaE(target, productRGB);

            const matchScore = Math.round((1 - euclidean / MAX_DIST) * 100);

            return {
                ...product,
                matchScore,
                metrics: {
                    euclidean: +euclidean.toFixed(4),
                    mse:       +mse.toFixed(4),
                    deltaE:    +deltaE.toFixed(4),
                },
            };
        });

        scored.sort((a, b) => b.matchScore - a.matchScore);

        return scored.slice(0, limit);
    }

    interpretDeltaE(deltaE) {
        if (deltaE < 1)  return 'Tidak terlihat oleh mata manusia';
        if (deltaE < 2)  return 'Hampir tidak terlihat';
        if (deltaE < 5)  return 'Perbedaan kecil, terlihat pada pandangan dekat';
        if (deltaE < 10) return 'Perbedaan terlihat jelas';
        if (deltaE < 25) return 'Perbedaan warna signifikan';
        return 'Warna sangat berbeda';
    }

    interpretMSE(mse) {
        if (mse < 50)   return 'Sangat akurat — hampir identik';
        if (mse < 200)  return 'Akurat — perbedaan sangat kecil';
        if (mse < 500)  return 'Cukup akurat — perbedaan kecil';
        if (mse < 1000) return 'Kurang akurat — perbedaan terlihat';
        return 'Tidak akurat — warna berbeda signifikan';
    }
}

module.exports = ColorMatcher;