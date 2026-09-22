/**
 * Only these files are public. Cloudflare's build output directory must be dist;
 * its functions/ directory stays at the repository root for server-side bundling.
 * Keep generated HTML at the root as well for existing previews and checks.
 */
const fs = require('node:fs');
const path = require('node:path');

const PUBLIC_FILES = Object.freeze([
    ...['', 'en/'].flatMap(prefix => ['index', 'privacy', 'success', '404'].map(page => `${prefix}${page}.html`)),
    'it/index.html',
    'app.js', 'booking-status.js', 'lang-init.js', 'cookie-notice.js',
    'style.css', 'home.css', '_headers', 'robots.txt', 'sitemap.xml', 'llms.txt',
    'blocked-dates.json', 'prezzi.json',
    'vendor/leaflet/leaflet.js', 'vendor/leaflet/leaflet.css', 'vendor/leaflet/LICENSE',
    ...['marker-shadow', 'marker-icon', 'marker-icon-2x', 'layers', 'layers-2x'].map(name => `vendor/leaflet/images/${name}.png`),
    'vendor/flatpickr/flatpickr.min.js', 'vendor/flatpickr/flatpickr.min.css',
    'vendor/flatpickr/l10n/it.js', 'vendor/flatpickr/LICENSE.md',
    'vendor/glightbox/glightbox.min.js', 'vendor/glightbox/glightbox.min.css', 'vendor/glightbox/LICENSE.md',
    ...['Inter-400', 'Inter-600', 'CormorantGaramond-500', 'CormorantGaramond-500i'].map(name => `vendor/fonts/${name}.woff2`),
    'vendor/fonts/Inter-OFL.txt', 'vendor/fonts/CormorantGaramond-OFL.txt',
    'vendor/THIRD-PARTY-NOTICES.md',
]);
const IMAGE_EXTENSION = /\.(?:jpe?g|png|webp|gif|avif|svg|ico)$/i;

function sourcePath(root, relative) {
    const parts = relative.split('/');
    let current = root;
    for (const part of parts) {
        if (!part || part === '.' || part === '..') throw new Error(`Invalid public path: ${relative}`);
        current = path.join(current, part);
        if (fs.lstatSync(current).isSymbolicLink()) throw new Error(`Public assets cannot be symbolic links: ${relative}`);
    }
    return current;
}

function collectPublicFiles(root) {
    const files = [...PUBLIC_FILES];
    // Google verification files have a defined name; arbitrary root HTML is private.
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
        if (/^google[a-z0-9]+\.html$/.test(entry.name)) files.push(entry.name);
    }
    function collectImages(relative) {
        const directory = sourcePath(root, relative);
        for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
            if (entry.name.startsWith('.')) continue;
            const file = `${relative}/${entry.name}`;
            const source = sourcePath(root, file);
            if (entry.isDirectory()) collectImages(file);
            else if (IMAGE_EXTENSION.test(entry.name) && fs.statSync(source).isFile()) files.push(file);
        }
    }
    collectImages('img');
    // Validate every source before replacing an existing distribution.
    for (const file of files) {
        if (!fs.statSync(sourcePath(root, file)).isFile()) throw new Error(`Public asset is not a file: ${file}`);
    }
    return files.sort();
}

function buildDistribution(projectRoot) {
    const root = fs.realpathSync(projectRoot);
    const output = path.resolve(root, 'dist');
    // This deletion can target only the real dist child of this project root.
    if (path.dirname(output) !== root || path.basename(output) !== 'dist') throw new Error('Unsafe distribution directory');
    if (fs.existsSync(output) || fs.lstatSync(output, { throwIfNoEntry: false })) {
        const stat = fs.lstatSync(output);
        if (stat.isSymbolicLink() || !stat.isDirectory() || fs.realpathSync(output) !== output) {
            throw new Error('Distribution directory must be a real directory inside the project');
        }
    }
    const files = collectPublicFiles(root);
    fs.rmSync(output, { recursive: true, force: true });
    fs.mkdirSync(output);
    for (const file of files) {
        const destination = path.join(output, file);
        fs.mkdirSync(path.dirname(destination), { recursive: true });
        fs.copyFileSync(path.join(root, file), destination);
    }
    return files;
}

module.exports = { PUBLIC_FILES, buildDistribution };
