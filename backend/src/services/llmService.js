
const axios = require('axios');

class LLMService {
    constructor() {
        this.apiKey = process.env.MISTRAL_API_KEY;
        if (!this.apiKey) {
            throw new Error('MISTRAL_API_KEY is not set in .env file');
        }
        
        this.endpoint = 'https://api.mistral.ai/v1/chat/completions';
        this.model = 'mistral-small-latest';
    }

    async generateResponse(userMessage, history = [], systemPrompt = '') {
        return await this.generateMistralResponse(userMessage, history, systemPrompt);
    }





    async generateMistralResponse(userMessage, history, systemPrompt) {
        try {
            const messages = [];

            if (systemPrompt) {
                messages.push({
                    role: 'system',
                    content: systemPrompt
                });
            }

            history.forEach(msg => {
                messages.push({
                    role: msg.role,
                    content: msg.content
                });
            });

            messages.push({
                role: 'user',
                content: userMessage
            });

            const response = await axios.post(
                this.endpoint,
                {
                    model: this.model,
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 1024
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data && response.data.choices && response.data.choices.length > 0) {
                return response.data.choices[0].message.content;
            } else {
                throw new Error('Invalid response from Mistral API');
            }

        } catch (error) {
            console.error('Mistral API error:', error.response?.data || error.message);
            
            return this.getFallbackResponse(userMessage);
        }
    }

    getFallbackResponse(userMessage) {
        const lowerMessage = userMessage.toLowerCase();

        if (lowerMessage.includes('undertone') || lowerMessage.includes('nada')) {
            return 'Undertone kulit terbagi menjadi 3: Cool (nada pink/kebiruan), Warm (nada kuning/keemasan), dan Neutral (campuran keduanya). Coba lihat warna pembuluh darah di pergelangan tangan Anda - jika biru/ungu berarti cool, hijau berarti warm, sulit dibedakan berarti neutral.';
        }

        if (lowerMessage.includes('foundation') || lowerMessage.includes('bedak')) {
            return 'Untuk memilih foundation yang tepat, pertama tentukan undertone kulit Anda, lalu pilih shade yang paling dekat dengan warna kulit natural Anda. Test di area rahang untuk hasil terbaik.';
        }

        return 'Terima kasih atas pertanyaan Anda. Untuk informasi lebih detail, silakan coba upload foto Anda di halaman Find Your Shade untuk mendapatkan rekomendasi produk yang tepat.';
    }
}

module.exports = LLMService;
