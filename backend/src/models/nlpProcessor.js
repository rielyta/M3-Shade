
'use strict';

const fs   = require('fs');
const path = require('path');

class NLPProcessor {

    constructor(stopwordsPath) {
        this.stopwords     = new Set();
        this.makeupKeywords = this._buildMakeupKeywords();

        if (stopwordsPath) {
            this._loadStopwords(stopwordsPath);
        } else {
            this._loadFallbackStopwords();
        }

        console.log(`[NLP] Loaded ${this.stopwords.size} stopwords, ${this.makeupKeywords.size} makeup keywords`);
    }

    _loadStopwords(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            content
                .split('\n')
                .map(w => w.trim().toLowerCase())
                .filter(w => w.length > 0 && !w.startsWith('#'))
                .forEach(w => this.stopwords.add(w));
        } catch (err) {
            console.warn(`[NLP] Tidak bisa baca stopwords dari ${filePath}: ${err.message}`);
            this._loadFallbackStopwords();
        }
    }

    _loadFallbackStopwords() {
        const fallback = [
            'yang','dan','di','ke','dari','untuk','dengan','adalah','pada',
            'dalam','ada','ini','itu','atau','jika','saya','aku','kamu','anda',
            'kita','mereka','dia','ia','nya','lah','pun','juga','hanya','lebih',
            'sangat','sudah','telah','akan','bisa','dapat','tidak','bukan','belum',
            'agar','supaya','oleh','karena','sehingga','namun','tetapi','tapi',
            'maka','jadi','yaitu','seperti','sama','hal','cara','setiap','semua',
            'the','a','an','is','are','was','were','be','been','being',
            'have','has','had','do','does','did','will','would','could',
            'should','may','might','shall','can','need','dare','ought',
            'i','you','he','she','it','we','they','me','him','her','us','them',
            'my','your','his','its','our','their','what','which','who','how',
            'when','where','why','that','this','these','those','in','on','at',
            'to','for','of','with','by','from','up','about','into','through',
        ];
        fallback.forEach(w => this.stopwords.add(w));
    }

    _buildMakeupKeywords() {
        return new Set([
            'undertone','cool','warm','neutral','dingin','hangat',
            'skintone','skin','tone','warna','kulit','terang','gelap','medium',
            'fair','light','dark','tan','deep','olive','fitzpatrick',
            'foundation','bedak','concealer','blush','contour','highlight',
            'lipstick','lipstik','eyeshadow','mascara','eyeliner','bronzer',
            'primer','setting','powder','cushion','bb','cc','tinted',
            'fenty','mac','nars','maybelline','loreal','estee','bobbi','dior',
            'lancôme','lancome','wardah','makeOver','msGlow','sariayu',
            'shade','shades','match','matching','cocok','sesuai','warna',
            'makeup','mekap','riasan','rias','kosmetik','beauty','kecantikan',
            'berminyak','oily','kering','dry','normal','kombinasi','combination',
            'sensitif','sensitive','acne','jerawat','pori','pores',
            'analisis','analisa','detect','deteksi','klasifikasi','rekomendasi',
            'recommend','suggest','saran','tips',
        ]);
    }

    lowercase(text) {
        return String(text).toLowerCase();
    }

    clean(text) {
        return text
            .replace(/[^\w\s]/g, ' ')
            .replace(/\d+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    tokenize(text) {
        return text
            .split(' ')
            .map(t => t.trim())
            .filter(t => t.length > 1);
    }

    removeStopwords(tokens) {
        return tokens.filter(token => !this.stopwords.has(token));
    }

    extractKeywords(tokens) {
        return tokens.filter(token => this.makeupKeywords.has(token));
    }

    termFrequency(tokens) {
        const tf = {};
        tokens.forEach(token => {
            tf[token] = (tf[token] || 0) + 1;
        });
        return Object.fromEntries(
            Object.entries(tf).sort((a, b) => b[1] - a[1])
        );
    }

    preprocess(text) {
        const original   = String(text);
        const lowercased = this.lowercase(original);
        const cleaned    = this.clean(lowercased);
        const tokens     = this.tokenize(cleaned);
        const withoutSW  = this.removeStopwords(tokens);
        const keywords   = this.extractKeywords(withoutSW);
        const tf         = this.termFrequency(withoutSW);
        const intent     = this.detectIntent(withoutSW, keywords);

        return {
            original,
            lowercased,
            cleaned,
            tokens,
            withoutStopwords: withoutSW,
            keywords,
            termFrequency:    tf,
            intent,
            tokenCount: {
                before: tokens.length,
                after:  withoutSW.length,
                removed: tokens.length - withoutSW.length,
            },
            subCPMK: '256',
        };
    }

    detectIntent(tokens, keywords) {
        const text = tokens.join(' ');

        const intents = [
            {
                label:    'undertone_inquiry',
                patterns: ['undertone','cool','warm','neutral','dingin','hangat','warna kulit'],
            },
            {
                label:    'product_recommendation',
                patterns: ['rekomendasi','recommend','cocok','suggest','saran','pilih','pilihan','merk','brand'],
            },
            {
                label:    'foundation_match',
                patterns: ['foundation','bedak','cushion','bb','cc','match','shade'],
            },
            {
                label:    'skin_type',
                patterns: ['berminyak','oily','kering','dry','kombinasi','sensitif','jerawat','acne'],
            },
            {
                label:    'how_to',
                patterns: ['cara','bagaimana','how','menentukan','mendeteksi','menggunakan','pakai'],
            },
            {
                label:    'fitzpatrick_inquiry',
                patterns: ['fitzpatrick','tipe','type','skala','scale'],
            },
            {
                label:    'greeting',
                patterns: ['halo','hai','hello','hi','selamat','pagi','siang','malam'],
            },
        ];

        for (const intent of intents) {
            const match = intent.patterns.some(p => text.includes(p) || keywords.includes(p));
            if (match) return intent.label;
        }

        return 'general_inquiry';
    }

    buildContext(processed) {
        const lines = [
            `Intent terdeteksi: ${processed.intent}`,
        ];

        if (processed.keywords.length > 0) {
            lines.push(`Keyword makeup: ${processed.keywords.join(', ')}`);
        }

        if (processed.withoutStopwords.length > 0) {
            lines.push(`Topik utama: ${processed.withoutStopwords.slice(0, 5).join(', ')}`);
        }

        return lines.join('\n');
    }

    getProcessorInfo() {
        return {
            stopwordsCount:      this.stopwords.size,
            makeupKeywordsCount: this.makeupKeywords.size,
            pipeline: [
                'lowercase',
                'clean (hapus karakter khusus)',
                'tokenize (split by whitespace)',
                'removeStopwords',
                'extractKeywords',
                'termFrequency',
                'detectIntent',
            ],
            subCPMK: '256',
        };
    }
}

module.exports = NLPProcessor;