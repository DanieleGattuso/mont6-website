const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { PUBLIC_FILES, buildDistribution } = require('./distribution');

function fixture(t) {
    const parent = fs.realpathSync(os.tmpdir());
    const root = fs.mkdtempSync(path.join(parent, 'mont6-distribution-'));
    const put = (file, content = `Public fixture: ${file}`) => {
        const target = path.join(root, file);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, content);
    };
    for (const file of PUBLIC_FILES) put(file);
    put('img/opt/room.webp');
    put('google123456.html');
    t.after(() => {
        // Remove only the freshly created fixture, never a supplied directory.
        assert.equal(path.dirname(root), parent);
        assert.match(path.basename(root), /^mont6-distribution-[a-zA-Z0-9]+$/);
        assert.equal(fs.realpathSync(root), root);
        fs.rmSync(root, { recursive: true, force: true });
    });
    return { root, put, read: file => fs.readFileSync(path.join(root, file), 'utf8') };
}

test('distribution publishes runtime assets and licenses while excluding source, secrets and backups', t => {
    const { root, put, read } = fixture(t);
    const privateFiles = [
        '.env', '.dev.vars', '.wrangler/state/db.sqlite', 'BACKEND-SETUP.md', 'CODE-REVIEW.md',
        'schema.sql', 'migrations/0001.sql', 'functions/api/payment.js', 'worker-emails/worker.js',
        'worker-emails/wrangler.toml', 'scripts/build-en.js', 'templates/index.html',
        'node_modules/internal.js', 'private.html', 'en/private.html',
        'img/.private.jpg', 'img/room.webp.bak', 'img/credentials.txt',
        'vendor/fonts/private.txt', 'vendor/leaflet/leaflet.js.bak',
    ];
    for (const file of privateFiles) put(file, 'PRIVATE SENTINEL');
    const files = buildDistribution(root);
    assert.deepEqual(files, [...PUBLIC_FILES, 'img/opt/room.webp', 'google123456.html'].sort());
    for (const file of files) assert.equal(read(`dist/${file}`), read(file), file);
    for (const file of privateFiles) {
        assert.ok(!fs.existsSync(path.join(root, 'dist', file)), file);
        assert.equal(read(file), 'PRIVATE SENTINEL', `source preserved: ${file}`);
    }
});

test('rebuilding removes stale output without deleting or changing project sources', t => {
    const { root, put, read } = fixture(t);
    buildDistribution(root);
    put('dist/old-private.sql', 'OLD PRIVATE OUTPUT');
    put('dist/img/old-photo.jpg', 'STALE PHOTO');
    put('schema.sql', 'PRIVATE SOURCE');
    put('index.html', 'Updated public page');
    buildDistribution(root);
    assert.ok(!fs.existsSync(path.join(root, 'dist/old-private.sql')));
    assert.ok(!fs.existsSync(path.join(root, 'dist/img/old-photo.jpg')));
    assert.equal(read('schema.sql'), 'PRIVATE SOURCE');
    assert.equal(read('index.html'), 'Updated public page');
    assert.equal(read('dist/index.html'), 'Updated public page');
});

test('missing required runtime asset fails before replacing the existing distribution', t => {
    const { root, read } = fixture(t);
    buildDistribution(root);
    fs.unlinkSync(path.join(root, 'app.js'));
    assert.throws(() => buildDistribution(root), /ENOENT/);
    assert.equal(read('dist/app.js'), 'Public fixture: app.js');
});

test('distribution refuses output or image junctions that could cross the public boundary', t => {
    const { root, put, read } = fixture(t);
    put('private-assets/secret.jpg', 'PRIVATE SENTINEL');
    const output = path.join(root, 'dist');
    const sourceLink = path.join(root, 'img/external');
    const privateDirectory = path.join(root, 'private-assets');
    const type = process.platform === 'win32' ? 'junction' : 'dir';
    fs.symlinkSync(privateDirectory, output, type);
    assert.throws(() => buildDistribution(root), /Distribution directory must be a real directory/);
    assert.equal(read('private-assets/secret.jpg'), 'PRIVATE SENTINEL');
    fs.unlinkSync(output);
    fs.symlinkSync(privateDirectory, sourceLink, type);
    assert.throws(() => buildDistribution(root), /Public assets cannot be symbolic links/);
    assert.ok(!fs.existsSync(output));
    fs.unlinkSync(sourceLink);
});
