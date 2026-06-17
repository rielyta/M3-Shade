
class Validator {
    static validateHexColor(hex) {
        if (!hex || typeof hex !== 'string') {
            return { valid: false, message: 'Hex color must be a string' };
        }

        if (!/^#?[0-9A-F]{6}$/i.test(hex)) {
            return { valid: false, message: 'Invalid hex color format. Expected: #RRGGBB' };
        }

        return { valid: true };
    }

    static validateMessage(message) {
        if (!message || typeof message !== 'string') {
            return { valid: false, message: 'Message must be a string' };
        }

        if (message.trim().length === 0) {
            return { valid: false, message: 'Message cannot be empty' };
        }

        if (message.length > 1000) {
            return { valid: false, message: 'Message too long (max 1000 characters)' };
        }

        return { valid: true };
    }

    static validateK(k) {
        const kNum = parseInt(k);

        if (isNaN(kNum)) {
            return { valid: false, message: 'K must be a number' };
        }

        if (kNum < 1 || kNum > 50) {
            return { valid: false, message: 'K must be between 1 and 50' };
        }

        return { valid: true, value: kNum };
    }
}

module.exports = Validator;
