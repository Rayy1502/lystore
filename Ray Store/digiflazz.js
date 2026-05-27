const axios = require('axios');
const crypto = require('crypto');

class Digiflazz {
    constructor(username, apiKey, productionKey, mode = 'sandbox') {
        this.username = username;
        this.apiKey = apiKey;
        this.productionKey = productionKey;
        this.mode = mode;
        this.baseUrl = 'https://api.digiflazz.com/v1';
    }

    getActiveKey() {
        return this.mode === 'production' ? this.productionKey : this.apiKey;
    }

    generateSignature(postfix = '') {
        const key = this.getActiveKey();
        const str = this.username + key + postfix;
        return crypto.createHash('md5').update(str).digest('hex');
    }

    async postRequest(endpoint, payload) {
        try {
            const url = `${this.baseUrl}${endpoint}`;
            const res = await axios.post(url, payload, {
                headers: { 'Content-Type': 'application/json' }
            });
            return res.data;
        } catch (error) {
            console.error(`Digiflazz API Error (${endpoint}):`, error.response ? error.response.data : error.message);
            return {
                error: true,
                message: error.response ? JSON.stringify(error.response.data) : error.message
            };
        }
    }

    async cekSaldo() {
        const sign = this.generateSignature('depo');
        const payload = {
            username: this.username,
            sign: sign
        };
        return this.postRequest('/depo', payload);
    }

    async priceList() {
        const sign = this.generateSignature('pricelist');
        const payload = {
            cmd: 'prepaid',
            username: this.username,
            sign: sign
        };
        return this.postRequest('/price-list', payload);
    }

    async transaction(sku, customerNo, refId) {
        const sign = this.generateSignature(refId);
        const payload = {
            username: this.username,
            buyer_sku_code: sku,
            customer_no: customerNo,
            ref_id: refId,
            sign: sign
        };
        return this.postRequest('/transaction', payload);
    }

    async cekTransaksi(refId) {
        const sign = this.generateSignature(refId);
        const payload = {
            username: this.username,
            ref_id: refId,
            sign: sign
        };
        // Digiflazz uses /transaction with same signature rules to check status
        return this.postRequest('/transaction', payload);
    }

    static mapStatus(status) {
        switch (status.toLowerCase()) {
            case 'sukses':
                return 'success';
            case 'gagal':
                return 'failed';
            case 'pending':
                return 'process';
            default:
                return 'pending';
        }
    }
}

module.exports = Digiflazz;
