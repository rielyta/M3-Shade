import ImageProcessor from './imageProcessor.js';

const processor = new ImageProcessor();
const BACKEND_URL = 'http://localhost:3000';

const imageInput        = document.getElementById('image-input');
const previewImage      = document.getElementById('preview-image');
const cameraPlaceholder = document.getElementById('camera-placeholder');
const cameraBox         = document.getElementById('camera-box');
const resultContent     = document.getElementById('result-content');

const style = document.createElement('style');
style.textContent = `
    .result-row {
        display: flex;
        gap: 1rem;
        align-items: flex-start;
        padding: 0.5rem 0;
        border-bottom: 1px solid #e8e0d0;
    }
    .result-label {
        min-width: 6.5rem;
        font-weight: 700;
        color: #6b4f2a;
        font-size: 0.9rem;
        flex-shrink: 0;
    }
    .result-value {
        color: #040404;
        font-size: 0.95rem;
        flex: 1;
    }
    .result-analyzing {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        padding: 2rem 0;
        color: #6b4f2a;
    }
    .spinner {
        width: 2rem;
        height: 2rem;
        border: 3px solid #d6cfc0;
        border-top-color: #E9026E;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    #camera-box { cursor: pointer; transition: opacity 0.2s; }
    #camera-box:hover { opacity: 0.88; }
    .product-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.5rem 0;
        border-bottom: 1px solid #e8e0d0;
    }
    .product-swatch {
        width: 2rem;
        height: 2rem;
        border-radius: 50%;
        border: 2px solid #8B6F3A;
        flex-shrink: 0;
    }
    .product-info { flex: 1; font-size: 0.9rem; color: #040404; }
    .product-info small { display: block; color: #888; font-size: 0.78rem; }
    .reco-title {
        font-weight: 700;
        color: #6b4f2a;
        font-size: 0.9rem;
        margin: 1.2rem 0 0.5rem;
    }
`;
document.head.appendChild(style);

if (cameraBox) {
    cameraBox.addEventListener('click', () => imageInput?.click());
}

if (imageInput) {
    imageInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        showPreview(file);
        showAnalyzing();
        await analyzeImage(file);
    });
}

function showPreview(file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
        if (previewImage) {
            previewImage.src = ev.target.result;
            previewImage.style.display = 'block';
        }
        if (cameraPlaceholder) cameraPlaceholder.style.display = 'none';
    };
    reader.readAsDataURL(file);
}

function showAnalyzing() {
    if (!resultContent) return;
    resultContent.innerHTML = `
        <div class="result-analyzing">
            <div class="spinner"></div>
            <p style="margin:0; font-size:0.95rem;">Menganalisis warna kulit...</p>
        </div>
    `;
}

async function analyzeImage(file) {
    try {
        const imageData = await processor.extractPixelData(file);
        const result    = processor.kMeansClustering(imageData, 5, 50);

        let recommendations = [];
        try {
            const res = await fetch(`${BACKEND_URL}/api/shade/match?limit=3`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ hex: result.dominantColor })
            });
            if (res.ok) {
                const data = await res.json();
                recommendations = data.matches || [];
            }
        } catch {
            recommendations = [];
        }

        renderResult(result, recommendations);
    } catch {
        if (resultContent) {
            resultContent.innerHTML = `<p style="color:#E9026E; font-size:0.95rem; padding:1rem 0;">Terjadi kesalahan saat menganalisis gambar. Coba lagi dengan foto yang berbeda.</p>`;
        }
    }
}

function renderResult(result, recommendations = []) {
    if (!resultContent) return;

    let recoHTML = '';
    if (recommendations.length > 0) {
        const items = recommendations.map(p => `
            <div class="product-item">
                <div class="product-swatch" style="background-color:${p.hex};"></div>
                <div class="product-info">
                    <strong>${p.brand}</strong> — ${p.product}, Shade ${p.shade}
                </div>
            </div>
        `).join('');
        recoHTML = `<p class="reco-title">Produk yang Cocok</p>${items}`;
    } else {
        recoHTML = `<p style="margin-top:1rem; font-size:0.85rem; color:#999;">Rekomendasi produk tidak tersedia. Pastikan backend server sudah berjalan.</p>`;
    }

    resultContent.innerHTML = processor.buildResultHTML(result) + recoHTML;
}