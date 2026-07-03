/**
 * Genera versioni WebP responsive di tutte le foto in img/
 * Output: img/opt/{nome}-{larghezza}.webp
 * Uso: node scripts/optimize-images.js
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const WIDTHS = [480, 1024, 1600];
const INPUT_DIR = path.join(__dirname, '..', 'img');
const OUTPUT_DIR = path.join(INPUT_DIR, 'opt');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const files = fs.readdirSync(INPUT_DIR).filter(f => /\.(jpe?g)$/i.test(f));

(async () => {
    for (const file of files) {
        const name = path.parse(file).name;
        for (const w of WIDTHS) {
            const out = path.join(OUTPUT_DIR, `${name}-${w}.webp`);
            if (fs.existsSync(out)) continue;
            await sharp(path.join(INPUT_DIR, file))
                .rotate() // rispetta EXIF orientation
                .resize(w, null, { withoutEnlargement: true })
                .webp({ quality: 78 })
                .toFile(out);
        }
        console.log(`ok ${name}`);
    }
    console.log(`Done: ${files.length} images x ${WIDTHS.length} sizes`);
})();
