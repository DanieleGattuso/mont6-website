/**
 * Genera versioni WebP responsive di tutte le foto in img/
 * Output: img/opt/{nome}-{larghezza}.webp
 * Uso: node scripts/optimize-images.js
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const WIDTHS = [480, 1024, 1600];
const CARDS = ['cefalu-rocca', 'cefalu-lavatoio', 'cefalu-tramonto', 'cefalu-duomo'];
const CARD = { w: 1000, h: 570 };
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
    // Cartoline di Cefalù: stanno in un riquadro di 210px d'altezza, ritagliato
    // da CSS. Due sono verticali 1024x1536, cioè un milione e mezzo di pixel per
    // mostrarne centomila. Qui il ritaglio si fa una volta sola, a monte.
    for (const name of CARDS) {
        const src = path.join(INPUT_DIR, `${name}.jpg`);
        if (!fs.existsSync(src)) { console.log(`salto ${name}: manca il jpg`); continue; }
        await sharp(src)
            .rotate()
            .resize(CARD.w, CARD.h, { fit: 'cover', position: 'centre' })
            .webp({ quality: 75 })
            .toFile(path.join(OUTPUT_DIR, `${name}-card.webp`));
        console.log(`ok ${name}-card`);
    }
    console.log(`Done: ${files.length} images x ${WIDTHS.length} sizes`);
})();
