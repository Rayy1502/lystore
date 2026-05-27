const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const { pool, getSettings } = require('./db');
const Digiflazz = require('./digiflazz');

require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Helper for generating custom order IDs
function generateOrderId() {
    const date = new Date();
    const dateStr = date.getFullYear() +
                    String(date.getMonth() + 1).padStart(2, '0') +
                    String(date.getDate()).padStart(2, '0');
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `RS-${dateStr}-${rand}`;
}

function generateRefId() {
    return 'ref' + crypto.randomBytes(16).toString('hex');
}

// ============================================================
// API ENDPOINTS
// ============================================================

// 1. Fetch Categories
app.get('/api/categories', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order ASC');
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 2. Fetch Games List
app.get('/api/games', async (req, res) => {
    try {
        const catSlug = req.query.category || 'all';
        let query = 'SELECT * FROM games WHERE is_active = 1';
        let params = [];

        if (catSlug !== 'all') {
            const [cats] = await pool.query('SELECT id FROM categories WHERE slug = ? LIMIT 1', [catSlug]);
            if (cats.length > 0) {
                query += ' AND category_id = ?';
                params.push(cats[0].id);
            }
        }
        query += ' ORDER BY sort_order ASC';
        
        const [rows] = await pool.query(query, params);
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 3. Fetch Game Detail & Nominal Products
app.get('/api/games/:slug', async (req, res) => {
    try {
        const { slug } = req.params;
        const [games] = await pool.query('SELECT * FROM games WHERE slug = ? AND is_active = 1 LIMIT 1', [slug]);
        
        if (games.length === 0) {
            return res.status(404).json({ success: false, message: 'Game not found.' });
        }

        const game = games[0];
        
        // Fetch linked products synced from Digiflazz
        const [products] = await pool.query(
            'SELECT * FROM products WHERE brand = ? AND is_active = 1 ORDER BY price ASC',
            [game.brand]
        );

        res.json({ success: true, game, products });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 4. Create New Order (Checkout)
app.post('/api/orders', async (req, res) => {
    try {
        const { game_slug, product_sku, payment_method, whatsapp, email, fields } = req.body;

        if (!game_slug || !product_sku || !payment_method || !whatsapp) {
            return res.status(400).json({ success: false, message: 'Parameter tidak lengkap.' });
        }

        // Validate game
        const [games] = await pool.query('SELECT * FROM games WHERE slug = ? AND is_active = 1 LIMIT 1', [game_slug]);
        if (games.length === 0) return res.status(404).json({ success: false, message: 'Game tidak ditemukan.' });
        const game = games[0];

        // Validate product
        const [products] = await pool.query('SELECT * FROM products WHERE buyer_sku_code = ? AND is_active = 1 LIMIT 1', [product_sku]);
        if (products.length === 0) return res.status(404).json({ success: false, message: 'Produk tidak ditemukan.' });
        const product = products[0];

        // Validate payment
        const [payments] = await pool.query('SELECT * FROM payment_methods WHERE code = ? AND is_active = 1 LIMIT 1', [payment_method]);
        if (payments.length === 0) return res.status(404).json({ success: false, message: 'Metode pembayaran tidak valid.' });
        const payment = payments[0];

        // Parse Target Player ID
        let targetAccountNo = '';
        if (fields && typeof fields === 'object') {
            if (fields.user_id && fields.server_id) {
                targetAccountNo = `${fields.user_id} (${fields.server_id})`;
            } else if (fields.user_id) {
                targetAccountNo = fields.user_id;
            } else {
                targetAccountNo = Object.values(fields).join(' - ');
            }
        } else {
            targetAccountNo = fields || '';
        }

        const sellingPrice = Number(product.selling_price) + Number(payment.fee);
        const orderId = generateOrderId();
        const refId = generateRefId();
        const paymentNumber = payment.account_number || '8800' + Math.floor(100000 + Math.random() * 900000);

        // Insert order into MySQL
        await pool.query(
            `INSERT INTO orders (order_id, ref_id, buyer_sku_code, product_name, customer_no, selling_price, price, payment_method, payment_number, status, whatsapp, email)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
            [orderId, refId, product_sku, product.product_name, targetAccountNo, sellingPrice, product.price, payment.name, paymentNumber, whatsapp, email || '']
        );

        // Realtime broadcast of new pending activity to homepage ticker
        io.emit('new_transaction', {
            order_id: orderId,
            product_name: product.product_name,
            status: 'pending',
            time: 'Baru saja'
        });

        res.json({ success: true, orderId });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 5. Get Order Invoice Detail & Status Tracker
app.get('/api/orders/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        const [orders] = await pool.query('SELECT * FROM orders WHERE order_id = ? LIMIT 1', [orderId]);

        if (orders.length === 0) {
            return res.status(404).json({ success: false, message: 'Order tidak ditemukan.' });
        }

        res.json({ success: true, order: orders[0] });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 6. Confirm Manual Payment Receipt
app.post('/api/orders/:orderId/confirm', async (req, res) => {
    try {
        const { orderId } = req.params;
        const [orders] = await pool.query('SELECT * FROM orders WHERE order_id = ? LIMIT 1', [orderId]);

        if (orders.length === 0) {
            return res.status(404).json({ success: false, message: 'Order tidak ditemukan.' });
        }

        const order = orders[0];
        if (order.status !== 'pending') {
            return res.json({ success: false, message: 'Pembayaran sudah dikonfirmasi sebelumnya.' });
        }

        // Set status to 'process'
        await pool.query(
            "UPDATE orders SET payment_status = 'paid', status = 'process', paid_at = CURRENT_TIMESTAMP, processed_at = CURRENT_TIMESTAMP WHERE order_id = ?",
            [orderId]
        );

        // Emit real-time status update to client-side invoice page
        io.to(`order_${orderId}`).emit('status_updated', { status: 'process' });

        // Trigger Auto Digiflazz transaction if active in configurations
        const settings = await getSettings();
        if ((settings.auto_process || '1') === '1') {
            const digi = new Digiflazz(
                settings.digiflazz_username || '',
                settings.digiflazz_api_key || '',
                settings.digiflazz_production_key || '',
                settings.digiflazz_mode || 'sandbox'
            );

            const resDigi = await digi.transaction(order.buyer_sku_code, order.customer_no, order.ref_id);
            
            if (resDigi && resDigi.data) {
                const d = resDigi.data;
                const mappedStatus = Digiflazz.mapStatus(d.status);
                const sn = d.sn || '';
                const msg = d.message || '';
                const raw = JSON.stringify(resDigi);

                await pool.query(
                    "UPDATE orders SET status = ?, digiflazz_status = ?, digiflazz_message = ?, digiflazz_sn = ?, digiflazz_raw = ? WHERE order_id = ?",
                    [mappedStatus, d.status, msg, sn, raw, orderId]
                );

                // Notify client realtime of success/failure
                io.to(`order_${orderId}`).emit('status_updated', { status: mappedStatus, sn });
                
                // Broadcast successful transaction to public home marquee ticker
                if (mappedStatus === 'success') {
                    io.emit('new_transaction', {
                        order_id: orderId,
                        product_name: order.product_name,
                        status: 'success',
                        time: 'Baru saja'
                    });
                }
            }
        }

        res.json({ success: true, message: 'Pembayaran berhasil dikonfirmasi! Pesanan sedang diproses.' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 7. Refresh/Recheck order status from Digiflazz
app.post('/api/orders/:orderId/refresh', async (req, res) => {
    try {
        const { orderId } = req.params;
        const [orders] = await pool.query('SELECT * FROM orders WHERE order_id = ? LIMIT 1', [orderId]);

        if (orders.length === 0) return res.status(404).json({ success: false, message: 'Order tidak ditemukan.' });
        const order = orders[0];

        if (order.status === 'process') {
            const settings = await getSettings();
            const digi = new Digiflazz(
                settings.digiflazz_username || '',
                settings.digiflazz_api_key || '',
                settings.digiflazz_production_key || '',
                settings.digiflazz_mode || 'sandbox'
            );

            const resDigi = await digi.cekTransaksi(order.ref_id);

            if (resDigi && resDigi.data) {
                const d = resDigi.data;
                const mappedStatus = Digiflazz.mapStatus(d.status);
                const sn = d.sn || '';
                const msg = d.message || '';
                const raw = JSON.stringify(resDigi);

                await pool.query(
                    "UPDATE orders SET status = ?, digiflazz_status = ?, digiflazz_message = ?, digiflazz_sn = ?, digiflazz_raw = ? WHERE order_id = ?",
                    [mappedStatus, d.status, msg, sn, raw, orderId]
                );

                io.to(`order_${orderId}`).emit('status_updated', { status: mappedStatus, sn });
                return res.json({ success: true, status: mappedStatus, sn });
            }
        }

        res.json({ success: true, status: order.status, sn: order.digiflazz_sn });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 8. Fetch Payment Channels
app.get('/api/payment-methods', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM payment_methods WHERE is_active = 1 ORDER BY sort_order ASC');
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// ============================================================
// ADMIN PANEL API ENDPOINTS
// ============================================================

// Admin: Get summary dashboard metrics
app.get('/api/admin/stats', async (req, res) => {
    try {
        const [users] = await pool.query('SELECT COUNT(id) as total FROM users');
        const [orders] = await pool.query('SELECT COUNT(id) as total FROM orders');
        const [revenue] = await pool.query("SELECT SUM(selling_price) as total FROM orders WHERE status = 'success'");
        const [pending] = await pool.query("SELECT COUNT(id) as total FROM orders WHERE status = 'pending'");
        
        const settings = await getSettings();
        const digi = new Digiflazz(
            settings.digiflazz_username || '',
            settings.digiflazz_api_key || '',
            settings.digiflazz_production_key || '',
            settings.digiflazz_mode || 'sandbox'
        );
        const resDigi = await digi.cekSaldo();
        const digiBalance = resDigi.data ? resDigi.data.deposit : 0;

        res.json({
            success: true,
            stats: {
                users: users[0].total,
                orders: orders[0].total,
                revenue: revenue[0].total || 0,
                pending: pending[0].total,
                digiBalance: digiBalance,
                mode: settings.digiflazz_mode || 'sandbox'
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Admin: Sync Digiflazz prepaid products catalog
app.post('/api/admin/sync', async (req, res) => {
    try {
        const settings = await getSettings();
        const markup = Number(settings.markup_default || 500);

        const digi = new Digiflazz(
            settings.digiflazz_username || '',
            settings.digiflazz_api_key || '',
            settings.digiflazz_production_key || '',
            settings.digiflazz_mode || 'sandbox'
        );

        const resDigi = await digi.priceList();

        if (resDigi.error || !resDigi.data) {
            return res.json({ success: false, message: resDigi.message || 'Gagal sync dari Digiflazz.' });
        }

        // Fetch brand mapped games
        const [games] = await pool.query('SELECT id, brand FROM games WHERE is_active = 1');
        const gameMap = {};
        games.forEach(g => { gameMap[g.brand.toLowerCase()] = g.id; });

        let count = 0;
        for (const item of resDigi.data) {
            const cat = (item.category || '').toLowerCase();
            const isValid = cat.includes('game') || cat.includes('voucher') || cat.includes('e-money') || cat.includes('streaming');
            
            if (!isValid) continue;

            const sku = item.buyer_sku_code;
            const name = item.product_name;
            const brand = item.brand;
            const price = Number(item.price);
            const sellingPrice = price + markup;
            const gameId = gameMap[brand.toLowerCase()] || null;
            const buyerStatus = (item.buyer_product_status === true || item.buyer_product_status == 1) ? 1 : 0;
            const sellerStatus = (item.seller_product_status === true || item.seller_product_status == 1) ? 1 : 0;

            // Simple Upsert logic
            const [exist] = await pool.query('SELECT id FROM products WHERE buyer_sku_code = ? LIMIT 1', [sku]);
            if (exist.length > 0) {
                await pool.query(
                    `UPDATE products SET game_id = ?, product_name = ?, category = ?, brand = ?, price = ?, selling_price = ?, buyer_product_status = ?, seller_product_status = ?
                     WHERE buyer_sku_code = ?`,
                    [gameId, name, item.category, brand, price, sellingPrice, buyerStatus, sellerStatus, sku]
                );
            } else {
                await pool.query(
                    `INSERT INTO products (game_id, buyer_sku_code, product_name, category, brand, price, markup, selling_price, buyer_product_status, seller_product_status)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [gameId, sku, name, item.category, brand, price, markup, sellingPrice, buyerStatus, sellerStatus]
                );
            }
            count++;
        }

        res.json({ success: true, message: `Berhasil sinkronisasi ${count} produk Digiflazz!` });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Admin: Get all transactions list
app.get('/api/admin/orders', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM orders ORDER BY id DESC');
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Admin: Save core configurations
app.post('/api/admin/settings', async (req, res) => {
    try {
        const configMap = req.body;
        for (const [key, val] of Object.entries(configMap)) {
            await pool.query(
                'INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?',
                [key, String(val), String(val)]
            );
        }
        res.json({ success: true, message: 'Konfigurasi berhasil disimpan!' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Admin: Fetch settings
app.get('/api/admin/settings', async (req, res) => {
    try {
        const settings = await getSettings();
        res.json({ success: true, settings });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Admin: Update order status manually
app.post('/api/admin/orders/:id/update', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, sn } = req.body;

        await pool.query(
            "UPDATE orders SET status = ?, digiflazz_sn = ?, completed_at = " + (status === 'success' ? 'CURRENT_TIMESTAMP' : 'NULL') + " WHERE id = ?",
            [status, sn || null, id]
        );

        // Fetch internal order code to push changes to invoice page
        const [orders] = await pool.query('SELECT order_id FROM orders WHERE id = ? LIMIT 1', [id]);
        if (orders.length > 0) {
            const orderId = orders[0].order_id;
            io.to(`order_${orderId}`).emit('status_updated', { status, sn });
        }

        res.json({ success: true, message: 'Status order berhasil diupdate!' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Admin: Get all products list
app.get('/api/admin/products', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM products ORDER BY brand ASC, price ASC');
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Admin: Edit individual product markup
app.post('/api/admin/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { markup, is_active } = req.body;

        const [prods] = await pool.query('SELECT price FROM products WHERE id = ? LIMIT 1', [id]);
        if (prods.length === 0) return res.status(404).json({ success: false, message: 'Produk tidak ada.' });
        const prod = prods[0];

        const sellingPrice = Number(prod.price) + Number(markup);
        await pool.query(
            'UPDATE products SET markup = ?, selling_price = ?, is_active = ? WHERE id = ?',
            [markup, sellingPrice, is_active ? 1 : 0, id]
        );

        res.json({ success: true, message: 'Produk berhasil diupdate!' });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// Fallback all non-API routing to public index.html (AngularJS handles routing)
app.get('/{*splat}', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================================
// SOCKET.IO REALTIME EVENTS HANDLER
// ============================================================
io.on('connection', (socket) => {
    console.log('Realtime client connected:', socket.id);

    // Client joins invoice status room
    socket.on('join_order', (orderId) => {
        socket.join(`order_${orderId}`);
        console.log(`Socket ${socket.id} joined invoice room: order_${orderId}`);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Start Server listening
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`⚡ Ray Store Node Server listening on port ${PORT}`);
    console.log(`🌐 Web Portal URL: http://localhost:${PORT}`);
    console.log(`====================================================`);
});
