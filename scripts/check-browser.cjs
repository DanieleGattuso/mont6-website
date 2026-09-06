/** Browser regressions with simulated availability and payment status. No real checkout. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.MONT6_PLAYWRIGHT_PATH || 'playwright');
const ROOT = path.join(__dirname, '..');
const TYPES = {'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg'};
const day = n => { const d=new Date(); d.setHours(0,0,0,0);d.setDate(d.getDate()+n);return d; };
const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const fixture=[{from:iso(day(10)),to:iso(day(12))},{from:iso(day(15)),to:iso(day(17))}];
const server=http.createServer((req,res)=>{
    let pathname=new URL(req.url,'http://localhost').pathname;
    if(pathname.endsWith('/'))pathname+='index.html';
    const file=path.resolve(ROOT,'.'+pathname);
    if(!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end();}
    res.writeHead(200,{'Content-Type':TYPES[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
});
let checks=0;
function check(name, condition){assert.ok(condition,name);checks++;console.log('ok '+name);}
(async()=>{
    await new Promise(r=>server.listen(0,'127.0.0.1',r));
    const base=`http://127.0.0.1:${server.address().port}`;
    const browser=await chromium.launch({headless:true,...(process.env.MONT6_BROWSER_CHANNEL ? {channel:process.env.MONT6_BROWSER_CHANNEL} : {})});
    try {
        for(const lang of ['it','en']) for(const width of [390,1280]) {
            const page=await browser.newPage({viewport:{width,height:900}});
            const errors=[];page.on('pageerror',e=>errors.push(e.message));
            let incomplete=false, checkoutBody;
            await page.route('**/api/get-booked-dates*',route=>route.fulfill({json:{ranges:fixture,partial:incomplete}}));
            await page.route('**/api/create-checkout-session',route=>{
                checkoutBody=route.request().postDataJSON();return route.fulfill({status:503,json:{error:'Simulated interruption'}});
            });
            await page.goto(base+(lang==='en'?'/en/':'/'),{waitUntil:'networkidle'});
            await page.locator('#cookieAccept').click();
            await page.waitForTimeout(1600);
            check(`${lang}/${width}: cookie notice stays dismissed`,!(await page.locator('#cookieBanner').getAttribute('class')).includes('visible'));
            const select = async (start,end) => page.evaluate(({start,end})=>{
                const fp=document.getElementById('date-range')._flatpickr;
                fp.clear();fp.setDate(start,true,'Y-m-d');fp.setDate([start,end],true,'Y-m-d');
            },{start:iso(day(start)),end:iso(day(end))});
            await select(13,15);
            check(`${lang}/${width}: two-night gap can be booked`,await page.locator('#dynamicPriceBox').evaluate(el=>el.classList.contains('visible')));
            check(`${lang}/${width}: city tax for two guests and two nights`,(await page.locator(lang==='en'?'#taxAmountEn':'#taxAmount').textContent())==='€8');
            await page.locator('#btn-request-stripe').click();
            await page.waitForFunction(()=>document.getElementById('form-msg').textContent==='Simulated interruption');
            check(`${lang}/${width}: server error keeps form usable`,!await page.locator('#btn-request-stripe').isDisabled());
            check(`${lang}/${width}: checkout request includes retry ID and language`,checkoutBody?.requestId?.length===36&&checkoutBody.lang===lang);
            const firstId=checkoutBody.requestId;await page.locator('#btn-request-stripe').click();
            await page.waitForFunction(()=>!document.getElementById('btn-request-stripe').disabled);
            check(`${lang}/${width}: retry uses the same identifier`,checkoutBody.requestId===firstId);
            await select(13,14);await page.locator('#btn-request-stripe').click();
            check(`${lang}/${width}: one-night stay rejected`,(await page.locator('#form-msg').textContent()).includes(lang==='en'?'minimum':'minimo'));
            incomplete=true;await page.reload({waitUntil:'networkidle'});
            check(`${lang}/${width}: partial calendar disables payment`,await page.locator('#btn-request-stripe').isDisabled());
            check(`${lang}/${width}: no JS exceptions`,errors.length===0);
            await page.goto(base+'/success.html'+(lang==='en'?'?lang=en':''));
            check(`${lang}/${width}: direct success URL never confirms a booking`,!await page.locator('#confirmed-icon').isVisible());
            await page.route('**/api/booking-status*',route=>route.fulfill({json:{status:'confirmed',checkIn:'2030-09-10',checkOut:'2030-09-12',guests:2,amount:25400,currency:'eur'}}));
            await page.goto(base+`/success.html?session_id=cs_test_browser00000001&lang=${lang}`);
            await page.locator('#confirmed-icon').waitFor({state:'visible'});
            check(`${lang}/${width}: verified confirmation shows total`,(await page.locator('#booking-status-details').textContent()).includes('254'));
            check(`${lang}/${width}: confirmation returns to the same language`,(await page.locator('#booking-home').getAttribute('href'))===(lang==='en'?'/en/':'/?lang=it'));
            await page.close();
        }
        console.log(`${checks} browser checks passed`);
    } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
