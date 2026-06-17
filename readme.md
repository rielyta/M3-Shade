# M3-Shade | Multimodal Makeup Matcher

**M3-Shade** adalah aplikasi web berbasis AI yang membantu pengguna menemukan shade makeup (foundation, concealer, bedak) yang sempurna untuk warna dan undertone kulit mereka.

---

## ✨ Fitur Utama

### 1. **Find Your Shade**
- Upload foto wajah untuk analisis warna kulit otomatis
- Ekstraksi warna dominan menggunakan K-Means Clustering
- Rekomendasi top 3 produk makeup terdekat berdasarkan warna

### 2. **Chatbot Assistant**
- AI chatbot berbahasa Indonesia powered by Mistral API
- Menjawab pertanyaan tentang:
  - Cara menentukan undertone kulit (cool/warm/neutral)
  - Rekomendasi shade berdasarkan Fitzpatrick Scale
  - Tips memilih foundation, concealer, dan bedak
- Conversation history untuk konteks yang lebih baik

### 3. **Skin Guide**
- Panduan lengkap tentang undertone kulit
- Penjelasan Fitzpatrick Scale (Type I-VI)
- Database 1000+ produk makeup dari brand ternama
- Filter berdasarkan undertone dan skin type

---

## 🚀 Cara Replikasi

### Prerequisites
- Node.js v16+ 
- npm atau yarn
- Mistral API Key (gratis di https://console.mistral.ai)

### 1. Clone Repository
```bash
git clone https://github.com/rielyta/M3-Shade.git
cd M3-Shade
```

### 2. Setup Backend

```bash
cd backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env

# Edit .env dan tambahkan Mistral API Key Anda
# MISTRAL_API_KEY=your_api_key_here

# Jalankan server
npm start
```

Server akan berjalan di `http://localhost:3000`

### 3. Akses Frontend

Buka browser dan kunjungi salah satu halaman:
- **Home**: `http://localhost:3000/index.html`
- **Find Your Shade**: `http://localhost:3000/frontend/find-your-shade.html`
- **Skin Guide**: `http://localhost:3000/frontend/skin-guide.html`
- **Chatbot**: `http://localhost:3000/frontend/chatbot.html`

---

## 📁 Struktur Project

```
M3-Shade/
├── backend/
│   ├── src/
│   │   ├── server.js                 # Express server + main API endpoint
│   │   ├── controllers/
│   │   │   ├── shadeController.js    # Handle shade matching logic
│   │   │   ├── productController.js  # Product recommendation
│   │   │   └── chatbotController.js  # Chatbot endpoint
│   │   ├── models/
│   │   │   ├── knnModel.js          # KNN classification algorithm
│   │   │   ├── colorMatcher.js      # Color matching logic (MSE, Euclidean)
│   │   │   └── nlpProcessor.js      # NLP preprocessing (tokenization, stopwords)
│   │   ├── routes/
│   │   │   ├── shade.routes.js
│   │   │   ├── products.routes.js
│   │   │   └── chatbot.routes.js
│   │   ├── services/
│   │   │   ├── llmService.js        # Mistral AI integration
│   │   │   └── dataService.js       # Load products & data
│   │   └── utils/
│   │       ├── colorUtils.js        # Hex/RGB conversion
│   │       └── validator.js         # Input validation
│   ├── data/
│   │   ├── foundation-shades.json   # 1000+ makeup products database
│   │   └── stopwords/
│   │       └── indonesian_stopwords.txt
│   ├── .env.example                 # Environment template
│   └── package.json
│
├── frontend/
│   ├── index.html                   # Homepage
│   ├── find-your-shade.html        # Shade matching page
│   ├── skin-guide.html             # Information page
│   ├── chatbot.html                # Chatbot page
│   ├── scripts/
│   │   ├── imageProcessor.js       # Image analysis (K-Means)
│   │   ├── chatbot.js              # Chatbot UI logic
│   │   ├── apiClient.js            # API communication
│   │   └── uiController.js         # UI state management
│   └── style/
│       └── styles.css              # Styling (Pink & Black theme)
│
├── ml-models/
│   ├── scripts/
│   │   ├── train_knn.py           # KNN model training (Python)
│   │   ├── data_preprocessing.py  # Data preparation
│   │   └── evaluate.py            # Model evaluation
│   ├── data/
│   │   └── foundation_shade.csv   # Raw training data from Kaggle
│   └── models/
│       ├── knn_shade_matcher.pkl  # Trained model
│       └── evaluation_report.json
│
├── docs/
│   ├── CPMK_MAPPING.md            # Learning outcome mapping
│   ├── API.md                     # API documentation
│   └── ARCHITECTURE.md            # Technical architecture
│
├── .gitignore
├── readme.md                        # This file
└── index.html                       # Root entry point
```

---

## 🔌 API Endpoints

### Chat
```bash
POST /api/chat
Content-Type: application/json

{
  "message": "Bagaimana cara menentukan undertone kulit saya?",
  "history": []
}

Response:
{
  "message": "Undertone adalah warna dasar di bawah kulit Anda...",
  "keywords": ["undertone", "kulit"]
}
```

### Shade Matching
```bash
POST /api/shade/match?limit=10
Content-Type: application/json

{
  "hex": "#DDB892"
}

Response:
[
  {
    "brand": "Fenty Beauty",
    "product": "Pro Filt'r Foundation",
    "shade": "210N",
    "hex": "#DDC4B0",
    "distance": 12.3
  },
  ...
]
```

### Products
```bash
GET /api/products/popular?limit=5

Response:
[
  {
    "brand": "Fenty Beauty",
    "product": "Pro Filt'r Foundation",
    "count": 45
  },
  ...
]
```

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **Backend** | Node.js, Express.js |
| **ML/AI** | K-Means Clustering, KNN Classification, Mistral API |
| **Database** | JSON (foundation-shades.json) |
| **NLP** | Manual tokenization + Stopwords removal |

---

## 📊 Dataset

- **Makeup Products**: 1000+ shade dari 127 brands ternama (Fenty Beauty, MAC, NARS, dll)
- **Source**: Kaggle Foundation Shade Dataset
- **Features**: Brand, Product Name, Shade, Hex Color, Undertone


---


## 🔗 Links

- **GitHub**: https://github.com/rielyta/M3-Shade
- **Mistral API**: https://console.mistral.ai
- **Dataset Source**: https://www.kaggle.com

---

**Last Updated**: June 2026
