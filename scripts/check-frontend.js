const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { renderLanguage } = require('./localize-html');
const root = path.join(__dirname,'..');
const read = file => fs.readFileSync(path.join(root,file),'utf8');

test('language build removes nested translations, including duplicate IDs', () => {
    const source = '<div><span class="lang-it">Totale <strong id="total">10</strong></span><span class="lang-en">Total <strong id="total">10</strong></span></div>';
    assert.equal(renderLanguage(source,'it'),'<div><span>Totale <strong id="total">10</strong></span></div>');
    assert.equal(renderLanguage(source,'en'),'<div><span>Total <strong id="total">10</strong></span></div>');
});
test('accessible attributes and native select labels work before JavaScript', () => {
    const source='<img alt="La casa" data-alt-en="The apartment"><select><option value="2" data-it="2 ospiti" data-en="2 guests">2 ospiti</option></select>';
    assert.equal(renderLanguage(source,'en'),'<img alt="The apartment"><select><option value="2">2 guests</option></select>');
});
test('broken source markup fails the build instead of dropping content', () => {
    assert.throws(()=>renderLanguage('<div><span class="lang-it">Test</div>','en'),/Unbalanced/);
});
test('legacy Stripe return redirects preserve the session, language and query', () => {
    const script=read('lang-init.js');
    for(const [pathname,lang,q,expected] of [
        ['/success.html','it','en','/en/success.html'],
        ['/success','it','en','/en/success'],
        ['/en/success','en','it','/success'],
        ['/en/success','en','en',null],
        ['/privacy','it','en','/en/privacy'],
    ]) {
        let redirected;
        const search=`?session_id=cs_test_unchanged&lang=${q}`;
        vm.runInNewContext(script,{URLSearchParams,location:{pathname,search,hash:'#details',replace:value=>redirected=value},document:{documentElement:{getAttribute:()=>lang}}});
        assert.equal(redirected,expected?expected+search+'#details':undefined);
    }
});
test('published documents have one language, one h1 and complete metadata', () => {
    const titles=new Set(), descriptions=new Set();
    for(const file of ['index.html','en/index.html','privacy.html','en/privacy.html','success.html','en/success.html','404.html','en/404.html']) {
        const html=read(file), lang=file.startsWith('en/')?'en':'it';
        assert.equal((html.match(/<h1\b/g)||[]).length,1,file);
        assert.doesNotMatch(html,new RegExp(`class="[^"]*\\blang-${lang==='en'?'it':'en'}\\b`),file);
        assert.doesNotMatch(html,/data-(?:alt|aria-label|placeholder)-(?:it|en)=/);
        const title=html.match(/<title>([^<]+)<\/title>/)[1];
        const description=html.match(/name="description" content="([^"]+)"/)[1];
        assert.ok(!titles.has(title)&&!descriptions.has(description),file);
        titles.add(title);descriptions.add(description);
        assert.ok(html.includes(`property="og:title" content="${title}"`)&&html.includes(`property="og:description" content="${description}"`),file);
        const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
        assert.equal(ids.length,new Set(ids).size,file);
    }
});
test('schema describes the apartment and visible FAQs, never a fabricated booking', () => {
    for(const file of ['index.html','en/index.html']) {
        const data=[...read(file).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>JSON.parse(m[1]));
        const rental=data.find(d=>d['@type']==='VacationRental');
        assert.equal(rental.identifier,'IT082027C2YCA7QI4V');
        assert.equal(rental.containsPlace.occupancy.value,2);
        assert.equal(rental['@id'], 'https://mont6cefalu.it/#apartment');
        assert.ok(rental.mainEntityOfPage['@id'].endsWith('#webpage'));
        assert.ok(!rental.aggregateRating&&!rental.review);
        assert.equal(data.find(d=>d['@type']==='FAQPage').mainEntity.length,8);
        assert.ok(!data.some(d=>d['@type']==='LodgingReservation'));
    }
});
test('scroll enhancement is optional with no observer or reduced motion', () => {
    const source=read('app.js');
    const start=source.indexOf('function initScrollReveal()');
    const end=source.indexOf('function initSmoothScroll()',start);
    const fn=source.slice(start,end)+'\ninitScrollReveal();';
    // If either guard fails this throws on constructing an observer or touching a node.
    for(const reduced of [false,true]) vm.runInNewContext(fn,{
        document:{querySelectorAll:()=>[]},
        window:{...(reduced?{IntersectionObserver:function(){}}:{}),matchMedia:()=>({matches:reduced})},
    });
});
