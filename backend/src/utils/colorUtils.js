
class ColorUtils {
    hexToRGB(hex) {
        hex = hex.replace(/^#/, '');

        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        return { r, g, b };
    }

    rgbToHex({ r, g, b }) {
        return '#' + [r, g, b].map(x => {
            const hex = Math.round(x).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('').toUpperCase();
    }

    rgbToLAB({ r, g, b }) {
        let rNorm = r / 255;
        let gNorm = g / 255;
        let bNorm = b / 255;

        rNorm = rNorm > 0.04045 ? Math.pow((rNorm + 0.055) / 1.055, 2.4) : rNorm / 12.92;
        gNorm = gNorm > 0.04045 ? Math.pow((gNorm + 0.055) / 1.055, 2.4) : gNorm / 12.92;
        bNorm = bNorm > 0.04045 ? Math.pow((bNorm + 0.055) / 1.055, 2.4) : bNorm / 12.92;

        rNorm *= 100;
        gNorm *= 100;
        bNorm *= 100;

        const x = rNorm * 0.4124 + gNorm * 0.3576 + bNorm * 0.1805;
        const y = rNorm * 0.2126 + gNorm * 0.7152 + bNorm * 0.0722;
        const z = rNorm * 0.0193 + gNorm * 0.1192 + bNorm * 0.9505;

        return this.xyzToLAB({ x, y, z });
    }

    hexToLAB(hex) {
        const rgb = this.hexToRGB(hex);
        return this.rgbToLAB(rgb);
    }

    xyzToLAB({ x, y, z }) {
        const refX = 95.047;
        const refY = 100.000;
        const refZ = 108.883;

        let xNorm = x / refX;
        let yNorm = y / refY;
        let zNorm = z / refZ;

        xNorm = xNorm > 0.008856 ? Math.pow(xNorm, 1/3) : (7.787 * xNorm + 16/116);
        yNorm = yNorm > 0.008856 ? Math.pow(yNorm, 1/3) : (7.787 * yNorm + 16/116);
        zNorm = zNorm > 0.008856 ? Math.pow(zNorm, 1/3) : (7.787 * zNorm + 16/116);

        const l = (116 * yNorm) - 16;
        const a = 500 * (xNorm - yNorm);
        const b = 200 * (yNorm - zNorm);

        return { l, a, b };
    }

    isValidHex(hex) {
        return /^#?[0-9A-F]{6}$/i.test(hex);
    }

    getBrightness({ r, g, b }) {
        return (r * 299 + g * 587 + b * 114) / 1000;
    }

    isDark({ r, g, b }) {
        return this.getBrightness({ r, g, b }) < 128;
    }
}

module.exports = ColorUtils;
