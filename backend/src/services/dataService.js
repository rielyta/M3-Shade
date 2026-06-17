
const fs = require('fs');
const path = require('path');

class DataService {
    constructor() {
        this.productsCache = null;
        this.dataPath = path.join(__dirname, '../../data/processed/cleaned_shades.json');
    }

    async loadProducts() {
        if (this.productsCache) {
            return this.productsCache;
        }

        try {
            if (!fs.existsSync(this.dataPath)) {
                console.warn('Dataset file not found, using sample data');
                return this.getSampleData();
            }

            const data = fs.readFileSync(this.dataPath, 'utf-8');
            this.productsCache = JSON.parse(data);

            console.log(`Loaded ${this.productsCache.length} products from dataset`);
            return this.productsCache;

        } catch (error) {
            console.error('Error loading products:', error);
            return this.getSampleData();
        }
    }

    getSampleData() {
        return [
            {
                brand: 'Fenty Beauty',
                product: 'Pro Filt\'r Soft Matte Foundation',
                shade: '110',
                hex: '#F3D3B6',
                undertone: 'neutral'
            },
            {
                brand: 'Maybelline',
                product: 'Fit Me Matte + Poreless Foundation',
                shade: '120 Classic Ivory',
                hex: '#F0C9A8',
                undertone: 'warm'
            },
            {
                brand: 'MAC',
                product: 'Studio Fix Fluid SPF 15',
                shade: 'NC25',
                hex: '#E8BA9A',
                undertone: 'warm'
            },
            {
                brand: 'NARS',
                product: 'Natural Radiant Longwear Foundation',
                shade: 'Stromboli',
                hex: '#DDB892',
                undertone: 'neutral'
            },
            {
                brand: 'Estée Lauder',
                product: 'Double Wear Stay-in-Place Makeup',
                shade: '2W1 Dawn',
                hex: '#E6C2A3',
                undertone: 'warm'
            }
        ];
    }

    async getProductsByBrand(brandName) {
        const products = await this.loadProducts();
        return products.filter(p => 
            p.brand.toLowerCase().includes(brandName.toLowerCase())
        );
    }

    async getProductsByUndertone(undertone) {
        const products = await this.loadProducts();
        return products.filter(p => 
            p.undertone && p.undertone.toLowerCase() === undertone.toLowerCase()
        );
    }

    async getUniqueBrands() {
        const products = await this.loadProducts();
        const brands = [...new Set(products.map(p => p.brand))];
        return brands.sort();
    }

    clearCache() {
        this.productsCache = null;
    }
}

module.exports = DataService;
