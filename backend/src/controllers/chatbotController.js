'use strict';

const path         = require('path');
const axios        = require('axios');
const NLPProcessor = require('../models/nlpProcessor');

const STOPWORDS_PATH = path.join(__dirname, '../../data/stopwords/indonesian_stopwords.txt');
const nlp = new NLPProcessor(STOPWORDS_PATH);

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

exports.sendMessage = async (req, res) => {
    try {
        const { message, history = [] } = req.body;

        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return res.status(400).json({ success: false, error: 'Message tidak boleh kosong.' });
        }

        const processed = nlp.preprocess(message);
        const context   = nlp.buildContext(processed);

        const botResponse = await callLLM(message, history, context);

        res.json({
            success: true,
            userMessage: message,
            nlp: {
                tokens:           processed.tokens,
                withoutStopwords: processed.withoutStopwords,
                keywords:         processed.keywords,
                intent:           processed.intent,
                tokenCount:       processed.tokenCount,
                termFrequency:    processed.termFrequency,
            },
            botResponse,
            subCPMK: '256 (NLP) + 259 (LLM)',
        });

    } catch (err) {
        console.error('[sendMessage]', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getProcessorInfo = (req, res) => {
    res.json({
        success: true,
        nlpInfo: nlp.getProcessorInfo(),
    });
};

async function callLLM(message, history, context) {
    if (process.env.ANTHROPIC_API_KEY) {
        return await callAnthropic(message, history, context);
    }
    if (process.env.GEMINI_API_KEY) {
        return await callGemini(message, history, context);
    }
    return getFallbackResponse(message);
}

async function callAnthropic(message, history, context) {
    const messages = [
        ...history.map(h => ({ role: h.role, content: h.content })),
        { role: 'user', content: message },
    ];

    const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
            model:      'claude-sonnet-4-20250514',
            max_tokens: 1000,
            system:     `${SYSTEM_PROMPT}\n\nKonteks dari NLP:\n${context}`,
            messages,
        },
        {
            headers: {
                'Content-Type':      'application/json',
                'x-api-key':         process.env.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
            },
            timeout: 15000,
        }
    );

    return response.data.content?.[0]?.text ?? getFallbackResponse(message);
}

async function callGemini(message, history, context) {
    const apiKey = process.env.GEMINI_API_KEY;
    const url    = `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`;

    let fullPrompt = `${SYSTEM_PROMPT}\n\nKonteks NLP:\n${context}\n\n`;
    history.forEach(h => {
        fullPrompt += `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}\n`;
    });
    fullPrompt += `User: ${message}\nAssistant:`;

    const response = await axios.post(url, {
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1000 },
    }, { timeout: 15000 });

    return response.data.candidates?.[0]?.content?.parts?.[0]?.text
        ?? getFallbackResponse(message);
}

function getFallbackResponse(message) {
    const msg = message.toLowerCase();
    if (msg.includes('undertone'))
        return 'Undertone adalah warna dasar di bawah kulit Anda — cool (kebiruan/pink), warm (kekuningan/peach), atau neutral (campuran keduanya). Cara mudah mendeteksinya: lihat warna urat nadi di pergelangan tangan Anda di bawah cahaya natural.';
    if (msg.includes('foundation') || msg.includes('shade'))
        return 'Untuk memilih shade foundation yang tepat, kenali dulu undertone kulit Anda. Undertone warm cocok dengan shade bernuansa kuning/golden, undertone cool cocok dengan shade bernuansa pink/rosy, dan undertone neutral bisa pakai keduanya.';
    return 'Maaf, saya sedang tidak dapat terhubung ke layanan AI. Silakan coba lagi nanti, atau gunakan fitur Find Your Shade untuk analisis warna kulit Anda secara langsung.';
}