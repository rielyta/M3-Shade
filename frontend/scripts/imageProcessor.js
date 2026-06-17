class ImageProcessor {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
    }

    async extractPixelData(imageFile) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const reader = new FileReader();

            reader.onload = (e) => {
                img.onload = () => {
                    const MAX_SIZE = 400;
                    const scale = Math.min(MAX_SIZE / img.width, MAX_SIZE / img.height, 1);
                    this.canvas.width  = Math.round(img.width  * scale);
                    this.canvas.height = Math.round(img.height * scale);
                    this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
                    resolve(this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height));
                };
                img.onerror = reject;
                img.src = e.target.result;
            };

            reader.onerror = reject;
            reader.readAsDataURL(imageFile);
        });
    }

    kMeansClustering(imageData, k = 5, maxIterations = 50) {
        const pixels = this.extractRGBPixels(imageData);

        if (pixels.length === 0) {
            return { error: 'Tidak ada piksel kulit yang terdeteksi. Coba foto dengan pencahayaan lebih baik.' };
        }

        const skinPixels = this.filterSkinTones(pixels);

        if (skinPixels.length < k) {
            return { error: 'Terlalu sedikit piksel kulit terdeteksi. Pastikan wajah terlihat jelas di foto.' };
        }

        let centroids = this.initializeCentroids(skinPixels, k);
        let clusters  = [];
        let iterations = 0;

        while (iterations < maxIterations) {
            clusters = this.assignToClusters(skinPixels, centroids);
            const newCentroids = this.calculateNewCentroids(clusters, k);
            if (this.hasConverged(centroids, newCentroids)) break;
            centroids = newCentroids;
            iterations++;
        }

        const dominantCluster = this.findDominantCluster(clusters);
        const dominantColor   = this.calculateClusterAverage(dominantCluster);

        return {
            dominantColor: this.rgbToHex(dominantColor),
            rgb:           dominantColor,
            skinTone:      this.classifySkinTone(dominantColor),
            undertone:     this.classifyUndertone(dominantColor),
            fitzpatrick:   this.getFitzpatrickScale(dominantColor),
            clusters:      clusters.length,
            iterations
        };
    }

    extractRGBPixels(imageData) {
        const pixels = [];
        const data   = imageData.data;
        for (let i = 0; i < data.length; i += 40) {
            const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
            if (a > 200) pixels.push({ r, g, b });
        }
        return pixels;
    }

    filterSkinTones(pixels) {
        return pixels.filter(({ r, g, b }) => {
            const maxRGB = Math.max(r, g, b);
            const minRGB = Math.min(r, g, b);
            return (
                r > 95 && g > 40 && b > 20 &&
                maxRGB - minRGB > 15 &&
                Math.abs(r - g) > 15 &&
                r > g && r > b
            );
        });
    }

    initializeCentroids(pixels, k) {
        const centroids = [];
        const used      = new Set();
        while (centroids.length < k) {
            const idx = Math.floor(Math.random() * pixels.length);
            if (!used.has(idx)) { centroids.push({ ...pixels[idx] }); used.add(idx); }
        }
        return centroids;
    }

    assignToClusters(pixels, centroids) {
        const clusters = Array(centroids.length).fill(null).map(() => []);
        pixels.forEach(pixel => {
            let minDist = Infinity, closest = 0;
            centroids.forEach((centroid, i) => {
                const d = this.euclideanDistance(pixel, centroid);
                if (d < minDist) { minDist = d; closest = i; }
            });
            clusters[closest].push(pixel);
        });
        return clusters;
    }

    euclideanDistance(c1, c2) {
        return Math.sqrt((c1.r - c2.r) ** 2 + (c1.g - c2.g) ** 2 + (c1.b - c2.b) ** 2);
    }

    calculateNewCentroids(clusters) {
        return clusters.map(cluster =>
            cluster.length === 0 ? { r: 0, g: 0, b: 0 } : this.calculateClusterAverage(cluster)
        );
    }

    calculateClusterAverage(cluster) {
        const sum = cluster.reduce((acc, p) => ({ r: acc.r + p.r, g: acc.g + p.g, b: acc.b + p.b }), { r: 0, g: 0, b: 0 });
        const n = cluster.length;
        return { r: Math.round(sum.r / n), g: Math.round(sum.g / n), b: Math.round(sum.b / n) };
    }

    hasConverged(oldC, newC, threshold = 1) {
        return oldC.every((oc, i) => this.euclideanDistance(oc, newC[i]) < threshold);
    }

    findDominantCluster(clusters) {
        return clusters.reduce((max, c) => c.length > max.length ? c : max, clusters[0]);
    }

    rgbToHex({ r, g, b }) {
        return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
    }

    classifySkinTone({ r, g, b }) {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (lum > 200) return { label: 'Very Fair',    hex: '#FDDBB4' };
        if (lum > 170) return { label: 'Fair',          hex: '#F4C2A0' };
        if (lum > 140) return { label: 'Light Medium',  hex: '#D4A574' };
        if (lum > 110) return { label: 'Medium',        hex: '#C68642' };
        if (lum > 80)  return { label: 'Tan',           hex: '#8B6F47' };
        if (lum > 55)  return { label: 'Deep',          hex: '#704214' };
        return                { label: 'Very Deep',     hex: '#3D2817' };
    }

    classifyUndertone({ r, g, b }) {
        const warmScore = r - b;
        const coolScore = b - g;
        if (warmScore > 30) return { label: 'Warm',    description: 'Keemasan, peachy, atau kekuningan' };
        if (coolScore > 10) return { label: 'Cool',    description: 'Kemerahan, merah muda, atau kebiruan' };
        return                     { label: 'Neutral', description: 'Campuran warm dan cool' };
    }

    getFitzpatrickScale({ r, g, b }) {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        if (lum > 210) return { scale: 'I',   description: 'Sangat terang, selalu terbakar, tidak pernah tanning' };
        if (lum > 175) return { scale: 'II',  description: 'Terang, biasanya terbakar, kadang tanning' };
        if (lum > 140) return { scale: 'III', description: 'Medium, kadang terbakar, selalu tanning' };
        if (lum > 105) return { scale: 'IV',  description: 'Olive/Medium gelap, jarang terbakar, selalu tanning' };
        if (lum > 70)  return { scale: 'V',   description: 'Gelap, sangat jarang terbakar' };
        return                { scale: 'VI',  description: 'Sangat gelap, tidak pernah terbakar' };
    }

    buildResultHTML(result) {
        if (result.error) {
            return `<p style="color:#E9026E; font-size:1rem;">${result.error}</p>`;
        }

        const { skinTone, undertone } = result;

        return `
            <div class="result-row">
                <span class="result-label">Skin Tone</span>
                <span class="result-value">${skinTone.label}</span>
            </div>
            <div class="result-row">
                <span class="result-label">Undertone</span>
                <span class="result-value">
                    ${undertone.label}
                    <small style="display:block; color:#666; font-size:0.8rem;">${undertone.description}</small>
                </span>
            </div>
        `;
    }
}

export default ImageProcessor;