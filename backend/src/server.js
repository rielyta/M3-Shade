'use strict';

require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const path     = require('path');

const shadeRoutes   = require('./routes/shade.routes');
const productRoutes = require('./routes/products.routes');
const chatbotRoutes = require('./routes/chatbot.routes');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '../../frontend')));

if (process.env.NODE_ENV !== 'production') {
    app.use((req, _res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
        next();
    });
}

app.use('/api/shade',    shadeRoutes);
app.use('/api/products', productRoutes);
app.use('/api/chatbot',  chatbotRoutes);

app.post('/api/chat', async (req, res) => {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ error: 'Message tidak boleh kosong.' });
    }

    try {
        const NLPProcessor  = require('./models/nlpProcessor');
        const STOPWORDS_PATH = path.join(__dirname, '../data/stopwords/indonesian_stopwords.txt');
        const nlp = new NLPProcessor(STOPWORDS_PATH);

        const processed = nlp.preprocess(message);
        const context   = nlp.buildContext(processed);

        const botResponse = await callLLM(message, history, context);

        res.json({
            message:  botResponse,
            keywords: processed.keywords || []
        });

    } catch (err) {
        console.error('[/api/chat]', err.message);
        res.status(500).json({ error: err.message });
    }
});

const SYSTEM_PROMPT = `Kamu adalah M3-Shade Assistant, konsultan kecantikan AI yang ramah dan berpengetahuan luas.
Spesialisasi kamu:
- Undertone kulit (cool, warm, neutral) dan cara mendeteksinya
- Fitzpatrick Scale (Type I–VI)
- Rekomendasi shade foundation, concealer, dan bedak
- Tips makeup berdasarkan warna kulit dan undertone

Aturan:
- Jawab dalam Bahasa Indonesia yang ramah dan profesional
- Maksimal 3 paragraf per jawaban
- Berikan saran konkret, bukan hanya teori`;

async function callLLM(message, history, context) {
    return await callMistral(message, history, context);
}

async function callMistral(message, history, context) {
    const axios  = require('axios');
    const apiKey = process.env.MISTRAL_API_KEY;
    const url    = 'https://api.mistral.ai/v1/chat/completions';

    if (!apiKey) {
        throw new Error('MISTRAL_API_KEY is not set in .env file');
    }

    const messages = [
        {
            role: 'system',
            content: `${SYSTEM_PROMPT}\n\nKonteks dari NLP:\n${context}`
        },
        ...history.map(h => ({ role: h.role, content: h.content })),
        { role: 'user', content: message },
    ];

    try {
        const response = await axios.post(url, {
            model: 'mistral-small-latest',
            messages: messages,
            temperature: 0.7,
            max_tokens: 1000,
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 15000,
        });

        return response.data.choices?.[0]?.message?.content ?? getFallbackResponse(message);
    } catch (error) {
        console.error('Mistral API error:', error.response?.data || error.message);
        return getFallbackResponse(message);
    }
}

function getFallbackResponse(message) {
    const msg = message.toLowerCase();
    if (msg.includes('undertone'))
        return 'Undertone adalah warna dasar di bawah kulit Anda — cool (kebiruan/pink), warm (kekuningan/peach), atau neutral (campuran keduanya). Cara mudah mendeteksinya: lihat warna urat nadi di pergelangan tangan Anda di bawah cahaya natural.';
    if (msg.includes('foundation') || msg.includes('shade'))
        return 'Untuk memilih shade foundation yang tepat, kenali dulu undertone kulit Anda. Undertone warm cocok dengan shade bernuansa kuning/golden, undertone cool cocok dengan shade bernuansa pink/rosy, dan undertone neutral bisa pakai keduanya.';
    return 'Maaf, saya sedang tidak dapat terhubung ke layanan AI. Silakan coba lagi nanti, atau gunakan fitur Find Your Shade untuk analisis warna kulit Anda secara langsung.';
}

app.get('/api/health', (_req, res) => {
    res.json({
        status:    'OK',
        timestamp: new Date().toISOString(),
        version:   '1.0.0',
        llm: {
            anthropic: !!process.env.ANTHROPIC_API_KEY,
            gemini:    !!process.env.GEMINI_API_KEY,
        },
        cpmk: {
            '229': 'Data Preprocessing — data_preprocessing.py',
            '230': 'KNN Manual — knnModel.js',
            '231': 'MSE Evaluation — colorMatcher.js',
            '249': 'K-Means Clustering — imageProcessor.js',
            '250': 'Noise Filter — imageProcessor.js',
            '256': 'NLP Tokenisasi — nlpProcessor.js',
            '259': 'LLM Integration — chatbotController.js',
            '261': 'Chatbot UI — chatbot.html',
        },
    });
});

app.use((_req, res) => {
    res.status(404).json({ success: false, error: 'Endpoint tidak ditemukan.' });
});

app.use((err, _req, res, _next) => {
    console.error('[Server Error]', err.message);
    res.status(500).json({ success: false, error: err.message });
});

app.listen(PORT, () => {
    console.log(`\n🚀 M3-Shade Backend running on http://localhost:${PORT}`);
    console.log(`   Health  : http://localhost:${PORT}/api/health`);
    console.log(`   Chat    : POST http://localhost:${PORT}/api/chat`);
    console.log(`   ENV     : ${process.env.NODE_ENV || 'development'}\n`);
    if (!process.env.MISTRAL_API_KEY) {
        console.warn('⚠️  MISTRAL_API_KEY tidak ditemukan di .env — chatbot akan pakai fallback response.');
        console.warn('   Set MISTRAL_API_KEY di backend/.env\n');
    } else {
        console.log('✅ Mistral API configured successfully\n');
    }
});

module.exports = app;