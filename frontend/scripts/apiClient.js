

class APIClient {
    constructor() {
        this.datasetURL = '../assets/data/foundation-shades.json';

        this._datasetCache = null;

        this._conversationHistory = [];
    }

    

    async sendChatMessage(message, conversationHistory = []) {
        const messages = [
            ...conversationHistory,
            { role: 'user', content: message }
        ];

        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, history: conversationHistory })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(`Chat API error ${response.status}: ${err.error || 'Unknown error'}`);
        }

        const data = await response.json();
        return {
            message: data.message || 'Maaf, saya tidak dapat merespons saat ini.',
            keywords: data.keywords || []
        };
    }

    async _loadDataset() {
        if (this._datasetCache) return this._datasetCache;
        const response = await fetch(this.datasetURL);
        if (!response.ok) throw new Error('Dataset foundation tidak ditemukan.');
        this._datasetCache = await response.json();
        return this._datasetCache;
    }

    _colorDistance(hex1, hex2) {
        const parse = (hex) => {
            const h = hex.replace('#', '');
            return {
                r: parseInt(h.substring(0, 2), 16),
                g: parseInt(h.substring(2, 4), 16),
                b: parseInt(h.substring(4, 6), 16)
            };
        };
        const c1 = parse(hex1);
        const c2 = parse(hex2);
        return Math.sqrt(
            (c1.r - c2.r) ** 2 +
            (c1.g - c2.g) ** 2 +
            (c1.b - c2.b) ** 2
        );
    }

    _distanceToScore(distance) {
        const MAX_DISTANCE = 441.67;
        return Math.round((1 - distance / MAX_DISTANCE) * 100);
    }

    async getShadeRecommendations(hexColor, undertone = null, limit = 5) {
        const dataset = await this._loadDataset();
        const scored = dataset
            .filter(product => {
                if (!undertone) return true;
                return !product.undertone || product.undertone.toLowerCase() === undertone.toLowerCase();
            })
            .map(product => ({
                ...product,
                distance: this._colorDistance(hexColor, product.hex),
                matchScore: 0
            }));
        scored.sort((a, b) => a.distance - b.distance);
        return scored.slice(0, limit).map(p => ({
            ...p,
            matchScore: this._distanceToScore(p.distance)
        }));
    }

    async analyzeImageWithVision(imageFile) {
        const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload  = (e) => resolve(e.target.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(imageFile);
        });

        const response = await fetch('/api/analyze-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image: base64,
                mediaType: imageFile.type || 'image/jpeg'
            })
        });

        if (!response.ok) throw new Error(`Vision API error: ${response.status}`);
        return await response.json();
    }

    async getPopularProducts(limit = 10) {
        const dataset = await this._loadDataset();
        return [...dataset]
            .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
            .slice(0, limit);
    }
}

export default APIClient;