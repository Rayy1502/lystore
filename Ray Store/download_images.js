const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const https = require('https');

const IMAGES_DIR = path.join(__dirname, 'public', 'images', 'games');

// Pastikan direktori folder tujuan ada
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Fungsi pembantu untuk mengunduh file dengan User-Agent browser
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    };

    https.get(options, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'raystore'
  });

  console.log('Terhubung ke database raystore.');

  const [games] = await connection.query('SELECT id, name, slug, image, banner FROM games');
  console.log(`Ditemukan ${games.length} data game.`);

  for (const game of games) {
    console.log(`-----------------------------------------------`);
    console.log(`Memproses game: ${game.name} (${game.slug})`);

    let localImagePath = game.image;
    let localBannerPath = game.banner;

    // 1. Download logo game
    if (game.image && game.image.startsWith('http')) {
      const ext = game.image.includes('.png') ? '.png' : (game.image.includes('.svg') ? '.svg' : '.webp');
      const filename = `${game.slug}${ext}`;
      const dest = path.join(IMAGES_DIR, filename);

      try {
        console.log(`Mengunduh logo dari: ${game.image}`);
        await downloadFile(game.image, dest);
        localImagePath = `/images/games/${filename}`;
        console.log(`Logo berhasil disimpan ke: ${localImagePath}`);
      } catch (err) {
        console.error(`Gagal mengunduh logo untuk ${game.name}:`, err.message);
      }
    }

    // 2. Download banner game
    if (game.banner && game.banner.startsWith('http')) {
      // Jika url dari unsplash, gunakan .jpg
      const ext = game.banner.includes('unsplash.com') ? '.jpg' : '.webp';
      const filename = `${game.slug}-banner${ext}`;
      const dest = path.join(IMAGES_DIR, filename);

      try {
        console.log(`Mengunduh banner dari: ${game.banner}`);
        await downloadFile(game.banner, dest);
        localBannerPath = `/images/games/${filename}`;
        console.log(`Banner berhasil disimpan ke: ${localBannerPath}`);
      } catch (err) {
        console.error(`Gagal mengunduh banner untuk ${game.name}:`, err.message);
      }
    }

    // 3. Update database
    if (localImagePath !== game.image || localBannerPath !== game.banner) {
      await connection.query(
        'UPDATE games SET image = ?, banner = ? WHERE id = ?',
        [localImagePath, localBannerPath, game.id]
      );
      console.log(`Database diperbarui untuk game ${game.name}.`);
    }
  }

  console.log('===============================================');
  console.log('Selesai mengunduh semua asset gambar secara lokal!');
  await connection.end();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
