-- Ray Store Database Schema
-- Created: 2026

CREATE DATABASE IF NOT EXISTS `raystore` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `raystore`;

-- Users table
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `role` ENUM('user','admin') DEFAULT 'user',
  `avatar` VARCHAR(255) DEFAULT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Categories table
CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `slug` VARCHAR(100) NOT NULL UNIQUE,
  `icon` VARCHAR(50) DEFAULT '🎮',
  `color` VARCHAR(20) DEFAULT '#7c3aed',
  `image` VARCHAR(255) DEFAULT NULL,
  `description` TEXT,
  `sort_order` INT DEFAULT 0,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Games / Brands table
CREATE TABLE IF NOT EXISTS `games` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `category_id` INT DEFAULT NULL,
  `name` VARCHAR(150) NOT NULL,
  `slug` VARCHAR(150) NOT NULL UNIQUE,
  `brand` VARCHAR(100) NOT NULL,
  `description` TEXT,
  `image` VARCHAR(255) DEFAULT NULL,
  `banner` VARCHAR(255) DEFAULT NULL,
  `instruction` TEXT COMMENT 'Cara top-up / panduan isi ID',
  `fields` JSON COMMENT 'Form fields yang dibutuhkan (user_id, server_id, dll)',
  `is_popular` TINYINT(1) DEFAULT 0,
  `is_featured` TINYINT(1) DEFAULT 0,
  `sort_order` INT DEFAULT 0,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Products table (synced from Digiflazz)
CREATE TABLE IF NOT EXISTS `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `game_id` INT DEFAULT NULL,
  `buyer_sku_code` VARCHAR(100) NOT NULL UNIQUE,
  `product_name` VARCHAR(200) NOT NULL,
  `category` VARCHAR(100) DEFAULT NULL,
  `brand` VARCHAR(100) DEFAULT NULL,
  `type` VARCHAR(50) DEFAULT 'Prepaid',
  `seller_name` VARCHAR(100) DEFAULT NULL,
  `price` BIGINT NOT NULL DEFAULT 0 COMMENT 'Harga beli dari Digiflazz',
  `markup` INT DEFAULT 0 COMMENT 'Markup dalam rupiah',
  `selling_price` BIGINT NOT NULL DEFAULT 0 COMMENT 'Harga jual ke customer',
  `buyer_product_status` TINYINT(1) DEFAULT 1,
  `seller_product_status` TINYINT(1) DEFAULT 1,
  `unlimited_stock` TINYINT(1) DEFAULT 0,
  `stock` INT DEFAULT 999,
  `multi` TINYINT(1) DEFAULT 0,
  `start_cut_off` VARCHAR(10) DEFAULT NULL,
  `end_cut_off` VARCHAR(10) DEFAULT NULL,
  `desc` TEXT,
  `is_active` TINYINT(1) DEFAULT 1,
  `synced_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`game_id`) REFERENCES `games`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Orders / Transactions table
CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` VARCHAR(50) NOT NULL UNIQUE COMMENT 'ID Order internal (format: RS-YYYYMMDD-XXXXX)',
  `ref_id` VARCHAR(100) NOT NULL UNIQUE COMMENT 'ref_id untuk Digiflazz',
  `user_id` INT DEFAULT NULL,
  `buyer_sku_code` VARCHAR(100) NOT NULL,
  `product_name` VARCHAR(200) NOT NULL,
  `customer_no` VARCHAR(100) NOT NULL COMMENT 'ID Game / nomor tujuan',
  `customer_name` VARCHAR(150) DEFAULT NULL,
  `buyer_last_saldo` BIGINT DEFAULT NULL,
  `fcparam` VARCHAR(100) DEFAULT NULL,
  `selling_price` BIGINT NOT NULL,
  `price` BIGINT NOT NULL,
  `payment_method` VARCHAR(50) DEFAULT 'transfer',
  `payment_number` VARCHAR(100) DEFAULT NULL,
  `payment_status` ENUM('pending','paid','expired') DEFAULT 'pending',
  `status` ENUM('pending','process','success','failed','refund') DEFAULT 'pending',
  `digiflazz_status` VARCHAR(50) DEFAULT NULL,
  `digiflazz_message` TEXT DEFAULT NULL,
  `digiflazz_sn` VARCHAR(255) DEFAULT NULL COMMENT 'Serial number / kode voucher',
  `digiflazz_raw` JSON DEFAULT NULL,
  `whatsapp` VARCHAR(20) DEFAULT NULL,
  `email` VARCHAR(150) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,
  `paid_at` TIMESTAMP NULL DEFAULT NULL,
  `processed_at` TIMESTAMP NULL DEFAULT NULL,
  `completed_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Payment Methods table
CREATE TABLE IF NOT EXISTS `payment_methods` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `type` ENUM('bank_transfer','ewallet','retail') DEFAULT 'bank_transfer',
  `account_number` VARCHAR(100) DEFAULT NULL,
  `account_name` VARCHAR(100) DEFAULT NULL,
  `logo` VARCHAR(255) DEFAULT NULL,
  `instructions` TEXT DEFAULT NULL,
  `fee` INT DEFAULT 0,
  `min_amount` BIGINT DEFAULT 0,
  `is_active` TINYINT(1) DEFAULT 1,
  `sort_order` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Banners table
CREATE TABLE IF NOT EXISTS `banners` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(200) DEFAULT NULL,
  `subtitle` VARCHAR(300) DEFAULT NULL,
  `image` VARCHAR(255) NOT NULL,
  `link` VARCHAR(500) DEFAULT NULL,
  `sort_order` INT DEFAULT 0,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Settings table
CREATE TABLE IF NOT EXISTS `settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `key` VARCHAR(100) NOT NULL UNIQUE,
  `value` TEXT DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Sync logs table
CREATE TABLE IF NOT EXISTS `sync_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `type` VARCHAR(50) DEFAULT NULL,
  `status` ENUM('success','failed') DEFAULT 'success',
  `total_synced` INT DEFAULT 0,
  `message` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- DEFAULT DATA
-- ============================================================

-- Default admin
INSERT INTO `users` (`name`, `email`, `password`, `role`) VALUES
('Administrator', 'admin@raystore.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');
-- password: password

-- Categories
INSERT INTO `categories` (`name`, `slug`, `icon`, `color`, `description`, `sort_order`) VALUES
('Mobile Games', 'mobile-games', '📱', '#7c3aed', 'Top-up game mobile populer', 1),
('PC Games', 'pc-games', '💻', '#0891b2', 'Voucher dan item untuk game PC', 2),
('Console Games', 'console-games', '🎮', '#059669', 'Game PlayStation, Xbox, Nintendo', 3),
('E-Money', 'e-money', '💳', '#d97706', 'Saldo dompet digital & e-money', 4),
('Streaming', 'streaming', '🎬', '#dc2626', 'Voucher streaming music & video', 5),
('Social Media', 'social-media', '📲', '#7c3aed', 'Coin & kredit media sosial', 6);

-- Games (Images from Codashop CDN & Wikipedia Commons)
INSERT INTO `games` (`category_id`, `name`, `slug`, `brand`, `description`, `image`, `banner`, `instruction`, `fields`, `is_popular`, `is_featured`, `sort_order`) VALUES
(1, 'Mobile Legends', 'mobile-legends', 'Mobile Legends', 'Game MOBA paling populer di Indonesia. Top-up Diamond untuk hero, skin, dan item eksklusif.', 'https://cdn1.codashop.com/S/content/mobile/images/product-image/MLBB/MLBB-300x300.webp', 'https://cdn1.codashop.com/S/content/mobile/images/product-image/MLBB/MLBB-Banner.webp', 'Masukkan User ID dan Server ID Mobile Legends kamu. Bisa ditemukan di profil game.', '[{"name":"user_id","label":"User ID","placeholder":"Contoh: 123456789","type":"number","required":true},{"name":"server_id","label":"Server ID","placeholder":"Contoh: 1234","type":"number","required":true}]', 1, 1, 1),
(1, 'Free Fire', 'free-fire', 'Free Fire', 'Battle Royale terpopuler. Top-up Diamond FF untuk skin, karakter, dan bundle spesial.', 'https://cdn1.codashop.com/S/content/mobile/images/product-image/FreeFire/FF-300x300.webp', 'https://cdn1.codashop.com/S/content/mobile/images/product-image/FreeFire/FF-Banner.webp', 'Masukkan ID Free Fire kamu. Bisa ditemukan di pojok kiri atas layar game.', '[{"name":"user_id","label":"ID Free Fire","placeholder":"Contoh: 123456789","type":"number","required":true}]', 1, 1, 2),
(1, 'PUBG Mobile', 'pubg-mobile', 'PUBG Mobile', 'Battle Royale premium dengan grafis terbaik. Top-up UC untuk outfit dan item premium.', 'https://cdn1.codashop.com/S/content/mobile/images/product-image/PUBGM/PUBGM-300x300.webp', 'https://cdn1.codashop.com/S/content/mobile/images/product-image/PUBGM/PUBGM-Banner.webp', 'Masukkan ID Player PUBG Mobile kamu.', '[{"name":"user_id","label":"Player ID","placeholder":"Contoh: 5123456789","type":"number","required":true}]', 1, 0, 3),
(1, 'Genshin Impact', 'genshin-impact', 'Genshin Impact', 'RPG open-world dengan karakter gacha. Top-up Genesis Crystal untuk primogem dan item.', 'https://cdn1.codashop.com/S/content/mobile/images/product-image/GenshinImpact/GI-300x300.webp', 'https://cdn1.codashop.com/S/content/mobile/images/product-image/GenshinImpact/GI-Banner.webp', 'Masukkan UID Genshin Impact kamu. Bisa ditemukan di menu Paimon.', '[{"name":"user_id","label":"UID Genshin","placeholder":"Contoh: 812345678","type":"number","required":true},{"name":"server_id","label":"Server","placeholder":"os_asia","type":"select","options":["os_asia","os_usa","os_euro","os_cht"],"required":true}]', 1, 1, 4),
(1, 'Valorant', 'valorant', 'Valorant', 'FPS taktis dari Riot Games. Top-up VP untuk skin senjata dan agent.', 'https://cdn1.codashop.com/S/content/mobile/images/product-image/Valorant/Valorant-300x300.webp', 'https://cdn1.codashop.com/S/content/mobile/images/product-image/Valorant/Valorant-Banner.webp', 'Masukkan Riot ID kamu (username#tag).', '[{"name":"user_id","label":"Riot ID","placeholder":"Contoh: PlayerName#1234","type":"text","required":true}]', 0, 0, 5),
(1, 'Call of Duty Mobile', 'cod-mobile', 'Call of Duty', 'FPS mobile terbaik. Top-up CP untuk bundle, weapon blueprint, dan operator.', 'https://cdn1.codashop.com/S/content/mobile/images/product-image/CODM/CODM-300x300.webp', 'https://cdn1.codashop.com/S/content/mobile/images/product-image/CODM/CODM-Banner.webp', 'Masukkan UID COD Mobile kamu.', '[{"name":"user_id","label":"Player ID","placeholder":"Masukkan Player ID","type":"number","required":true}]', 1, 0, 6),
(1, 'Arena of Valor', 'arena-of-valor', 'Arena of Valor', 'MOBA legendaris Garena. Top-up Voucher untuk hero dan skin.', 'https://cdn1.codashop.com/S/content/mobile/images/product-image/AOV/AOV-300x300.webp', 'https://cdn1.codashop.com/S/content/mobile/images/product-image/AOV/AOV-Banner.webp', 'Masukkan ID AOV kamu.', '[{"name":"user_id","label":"Player ID","placeholder":"Masukkan ID AOV","type":"number","required":true}]', 0, 0, 7),
(1, 'Honkai Star Rail', 'honkai-star-rail', 'Honkai Star Rail', 'RPG sci-fi terbaru HoYoverse. Top-up Oneiric Shard untuk Express Pass dan item.', 'https://cdn1.codashop.com/S/content/mobile/images/product-image/HSR/HSR-300x300.webp', 'https://cdn1.codashop.com/S/content/mobile/images/product-image/HSR/HSR-Banner.webp', 'Masukkan UID Honkai Star Rail kamu.', '[{"name":"user_id","label":"UID","placeholder":"Contoh: 712345678","type":"number","required":true},{"name":"server_id","label":"Server","placeholder":"Pilih server","type":"select","options":["Asia","America","Europe","TW-HK-MO"],"required":true}]', 1, 1, 8),
(2, 'Steam Wallet', 'steam-wallet', 'Steam', 'Platform gaming PC terbesar. Top-up Steam Wallet untuk beli game dan DLC.', 'https://cdn1.codashop.com/S/content/mobile/images/product-image/SteamWallet/Steam-300x300.webp', 'https://cdn1.codashop.com/S/content/mobile/images/product-image/SteamWallet/Steam-Banner.webp', 'Masukkan email akun Steam kamu.', '[{"name":"user_id","label":"Email Steam","placeholder":"email@steam.com","type":"email","required":true}]', 1, 0, 9),
(1, 'Roblox', 'roblox', 'Roblox', 'Temukan jutaan dunia 3D kreasi pengguna. Top-up Roblox Robux Gift Card untuk item premium.', 'https://cdn1.codashop.com/S/content/mobile/images/product-image/Roblox/Roblox-300x300.webp', 'https://cdn1.codashop.com/S/content/mobile/images/product-image/Roblox/Roblox-Banner.webp', 'Masukkan Username Roblox Anda.', '[{"name":"user_id","label":"Username Roblox","placeholder":"Contoh: PlayerName","type":"text","required":true}]', 1, 1, 10),
(1, 'Clash of Clans', 'clash-of-clans', 'Clash of Clans', 'Pimpin klanmu menuju kemenangan! Top-up CoC Gems & Gold Pass untuk mempercepat upgrade.', 'https://cdn1.codashop.com/S/content/mobile/images/product-image/CoC/CoC-300x300.webp', 'https://cdn1.codashop.com/S/content/mobile/images/product-image/CoC/CoC-Banner.webp', 'Masukkan Player Tag Clash of Clans Anda (tanpa tanda #).', '[{"name":"user_id","label":"Player Tag","placeholder":"Contoh: 9P28YLUUY","type":"text","required":true}]', 1, 0, 11),
(1, 'Clash Royale', 'clash-royale', 'Clash Royale', 'Masuki Arena! Kumpulkan kartu dan kalahkan lawan. Top-up Gems & Diamond Pass untuk berduel.', 'https://cdn1.codashop.com/S/content/mobile/images/product-image/ClashRoyale/CR-300x300.webp', 'https://cdn1.codashop.com/S/content/mobile/images/product-image/ClashRoyale/CR-Banner.webp', 'Masukkan Player Tag Clash Royale Anda (tanpa tanda #).', '[{"name":"user_id","label":"Player Tag","placeholder":"Contoh: 9P28YLUUY","type":"text","required":true}]', 0, 0, 12),
(1, 'League of Legends: Wild Rift', 'wild-rift', 'Wild Rift', 'MOBA 5v5 taktis penuh strategi. Top-up Wild Cores untuk skin champions impian.', 'https://cdn1.codashop.com/S/content/mobile/images/product-image/WildRift/WildRift-300x300.webp', 'https://cdn1.codashop.com/S/content/mobile/images/product-image/WildRift/WildRift-Banner.webp', 'Masukkan Riot ID Anda (username#tag).', '[{"name":"user_id","label":"Riot ID","placeholder":"Contoh: PlayerName#1234","type":"text","required":true}]', 0, 0, 13),
(2, 'Point Blank', 'point-blank', 'Point Blank', 'FPS legendaris PC dari Zepetto. Top-up PB Cash untuk senjata, karakter, dan item premium.', 'https://cdn1.codashop.com/S/content/mobile/images/product-image/PointBlank/PB-300x300.webp', 'https://cdn1.codashop.com/S/content/mobile/images/product-image/PointBlank/PB-Banner.webp', 'Masukkan ID Point Blank (Zepetto) Anda.', '[{"name":"user_id","label":"ID Zepetto","placeholder":"Contoh: pb_player123","type":"text","required":true}]', 0, 0, 14),
(1, 'EA Sports FC Mobile', 'ea-sports-fc', 'EA Sports FC', 'Bangun tim impianmu dengan bintang dunia. Top-up FC Points & Silver untuk dapatkan pemain terbaik.', 'https://cdn1.codashop.com/S/content/mobile/images/product-image/EASportsFCMobile/FC-Mobile-300x300.webp', 'https://cdn1.codashop.com/S/content/mobile/images/product-image/EASportsFCMobile/FC-Mobile-Banner.webp', 'Masukkan ID Pengguna EA Sports FC Mobile Anda.', '[{"name":"user_id","label":"ID Pengguna","placeholder":"Contoh: 123456789","type":"number","required":true}]', 1, 1, 15),
(1, 'Brawl Stars', 'brawl-stars', 'Brawl Stars', 'Shooter 3v3 seru & multiplayer serba cepat. Top-up Gems untuk unlock brawler baru.', 'https://cdn1.codashop.com/S/content/mobile/images/product-image/BrawlStars/BS-300x300.webp', 'https://cdn1.codashop.com/S/content/mobile/images/product-image/BrawlStars/BS-Banner.webp', 'Masukkan Tag Pemain Brawl Stars Anda (tanpa tanda #).', '[{"name":"user_id","label":"Tag Pemain","placeholder":"Contoh: 9P28YLUUY","type":"text","required":true}]', 0, 0, 16),
(1, 'Hay Day', 'hay-day', 'Hay Day', 'Bangun pertanian tersukses Anda! Top-up Diamond & Farm Pass untuk panen melimpah.', 'https://cdn1.codashop.com/S/content/mobile/images/product-image/HayDay/HD-300x300.webp', 'https://cdn1.codashop.com/S/content/mobile/images/product-image/HayDay/HD-Banner.webp', 'Masukkan Tag Pertanian Hay Day Anda (tanpa tanda #).', '[{"name":"user_id","label":"Tag Pertanian","placeholder":"Contoh: 9P28YLUUY","type":"text","required":true}]', 0, 0, 17),
(1, 'Undawn', 'undawn', 'Undawn', 'Open-world survival game bertema zombie. Top-up RC Garena untuk memperkuat pertahanan.', 'https://cdn1.codashop.com/S/content/mobile/images/product-image/Undawn/Undawn-300x300.webp', 'https://cdn1.codashop.com/S/content/mobile/images/product-image/Undawn/Undawn-Banner.webp', 'Masukkan ID Player Undawn Garena Anda.', '[{"name":"user_id","label":"Player ID","placeholder":"Contoh: 123456789","type":"number","required":true}]', 0, 0, 18),
(1, 'Ragnarok Origin', 'ragnarok-origin', 'Ragnarok Origin', 'RPG anime klasik kembali dengan grafis HD. Top-up Nyan Berry untuk kostum dan mount keren.', 'https://cdn1.codashop.com/S/content/mobile/images/product-image/RagnarokOrigin/RO-300x300.webp', 'https://cdn1.codashop.com/S/content/mobile/images/product-image/RagnarokOrigin/RO-Banner.webp', 'Masukkan Character ID (UIN) dan pilih Server Ragnarok Origin Anda.', '[{"name":"user_id","label":"Character ID","placeholder":"Contoh: 123456789012345","type":"number","required":true},{"name":"server_id","label":"Server","placeholder":"Pilih server","type":"select","options":["Loki-1","Thor-1","Odin-1","Freya-1"],"required":true}]', 0, 0, 19),
(4, 'GoPay', 'gopay', 'GoPay', 'Isi saldo GoPay untuk berbagai kebutuhan.', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Gopay_logo.svg/300px-Gopay_logo.svg.png', 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=1200', 'Masukkan nomor HP yang terdaftar di GoPay.', '[{"name":"user_id","label":"Nomor HP","placeholder":"08xxxxxxxxxx","type":"tel","required":true}]', 0, 0, 20),
(4, 'OVO', 'ovo', 'OVO', 'Isi saldo OVO dengan mudah dan cepat.', 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/eb/Logo_ovo_purple.svg/300px-Logo_ovo_purple.svg.png', 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=1200', 'Masukkan nomor HP yang terdaftar di OVO.', '[{"name":"user_id","label":"Nomor HP","placeholder":"08xxxxxxxxxx","type":"tel","required":true}]', 0, 0, 21),
(5, 'Spotify', 'spotify', 'Spotify', 'Voucher Premium Spotify untuk nikmati musik tanpa iklan.', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Spotify_icon.svg/300px-Spotify_icon.svg.png', 'https://images.unsplash.com/photo-1614680376593-902f74cf0d41?auto=format&fit=crop&q=80&w=1200', 'Masukkan email akun Spotify kamu.', '[{"name":"user_id","label":"Email Spotify","placeholder":"email@spotify.com","type":"email","required":true}]', 0, 0, 22);

-- Payment Methods
INSERT INTO `payment_methods` (`name`, `code`, `type`, `account_number`, `account_name`, `fee`, `is_active`, `sort_order`) VALUES
('BCA Transfer', 'bca', 'bank_transfer', '1234567890', 'Ray Store', 0, 1, 1),
('BRI Transfer', 'bri', 'bank_transfer', '0987654321', 'Ray Store', 0, 1, 2),
('BNI Transfer', 'bni', 'bank_transfer', '1122334455', 'Ray Store', 0, 1, 3),
('Mandiri Transfer', 'mandiri', 'bank_transfer', '5544332211', 'Ray Store', 0, 1, 4),
('GoPay', 'gopay', 'ewallet', '081234567890', 'Ray Store', 0, 1, 5),
('OVO', 'ovo', 'ewallet', '081234567890', 'Ray Store', 0, 1, 6),
('Dana', 'dana', 'ewallet', '081234567890', 'Ray Store', 0, 1, 7),
('ShopeePay', 'shopeepay', 'ewallet', '081234567890', 'Ray Store', 0, 1, 8);

-- Settings
INSERT INTO `settings` (`key`, `value`) VALUES
('site_name', 'Ray Store'),
('site_tagline', 'Top-Up Game Terpercaya & Tercepat'),
('site_email', 'cs@raystore.com'),
('site_whatsapp', '081234567890'),
('digiflazz_username', ''),
('digiflazz_api_key', ''),
('digiflazz_production_key', ''),
('digiflazz_mode', 'sandbox'),
('maintenance_mode', '0'),
('auto_process', '1'),
('markup_default', '500'),
('currency', 'IDR');
