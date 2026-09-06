/** Offline integration tests: real SQLite statements, mocked Stripe/Resend. No network or charges. */
const { test, before, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const ROOT = path.join(__dirname, '..');
let checkout, payment, booked, webhook, status, calendar, cron, middleware;
before(async () => {
    const read = file => import(pathToFileURL(path.join(ROOT, file)).href);
    [checkout, payment, booked, webhook, status, calendar, cron, middleware] = await Promise.all([
        'functions/api/create-checkout-session.js', 'functions/_lib/payment.js', 'functions/_lib/booked.js',
        'functions/api/stripe-webhook.js', 'functions/api/booking-status.js', 'functions/api/calendar.ics.js', 'worker-emails/worker.js',
        'functions/_middleware.js',
    ].map(read));
});
class D1 {
    constructor() {
        this.db = new DatabaseSync(':memory:');
        this.db.exec(fs.readFileSync(path.join(ROOT, 'schema.sql'), 'utf8'));
        this.db.exec(fs.readFileSync(path.join(ROOT, 'migrations/0001_payment_safety.sql'), 'utf8'));
    }
    prepare(sql) {
        const db = this.db;
        const statement = { sql, values: [],
            bind(...values) { this.values = values; return this; },
            async first() { return db.prepare(sql).get(...this.values) || null; },
            async all() { return { results: db.prepare(sql).all(...this.values) }; },
            async run() { return { meta: { changes: Number(db.prepare(sql).run(...this.values).changes) } }; },
        };
        return statement;
    }
    async batch(statements) {
        this.db.exec('BEGIN IMMEDIATE');
        try {
            const result = statements.map(s => ({ meta: { changes: Number(this.db.prepare(s.sql).run(...s.values).changes) } }));
            this.db.exec('COMMIT'); return result;
        } catch (e) { this.db.exec('ROLLBACK'); throw e; }
    }
}
let env, sessions, requests, mails, stripeFailure, mailFailure, externalBody, blockedData, realFetch;
beforeEach(() => {
    realFetch = global.fetch;
    sessions = new Map(); requests = []; mails = []; stripeFailure = null; mailFailure = false;
    externalBody = 'BEGIN:VCALENDAR\r\nEND:VCALENDAR'; blockedData = [];
    env = { DB: new D1(), STRIPE_SECRET_KEY: 'sk_test_offline', STRIPE_WEBHOOK_SECRET: 'whsec_offline',
        RESEND_API_KEY: 're_offline', BOOKING_FROM_EMAIL: 'bookings@example.test', BOOKING_HOST_EMAIL: 'host@example.test',
        ASSETS: { async fetch(request) {
            return Response.json(new URL(request.url).pathname === '/prezzi.json' ? JSON.parse(fs.readFileSync(path.join(ROOT, 'prezzi.json'))) : blockedData);
        } },
    };
    global.fetch = async (input, options = {}) => {
        const url = String(input.url || input);
        if (url.startsWith('https://api.stripe.com/')) {
            if (stripeFailure) {
                if (stripeFailure === 'timeout') throw new Error('Simulated network timeout');
                return Response.json({error:{message:'Internal secret diagnostics'}},{status:stripeFailure});
            }
            if (options.method === 'POST') {
                const p = options.body;
                requests.push(p);
                const id = `cs_test_offline${String(requests.length).padStart(8,'0')}`;
                const s = { id, mode:'payment', payment_status:'unpaid', status:'open', url:`https://checkout.stripe.com/c/pay/${id}`,
                    amount_total:Number(p.get('line_items[0][price_data][unit_amount]')), currency:'eur',
                    customer_details:{name:'Test Guest',email:'guest@example.test'},
                    metadata:Object.fromEntries(['checkIn','checkOut','guests','holdId','lang'].map(k=>[k,p.get(`metadata[${k}]`)])) };
                sessions.set(id,s); return Response.json(s);
            }
            if (url.includes('?payment_intent=')) return Response.json({data:[...sessions.values()]});
            const id = url.split('/').pop();
            return sessions.has(id) ? Response.json(sessions.get(id)) : Response.json({}, {status:404});
        }
        if (url === 'https://api.resend.com/emails') {
            const payload=JSON.parse(options.body);
            mails.push({...payload,key:options.headers['Idempotency-Key']});
            return Response.json({}, {status:mailFailure && payload.to==='guest@example.test' ? 503 : 200});
        }
        if (url === 'https://calendar.example.test/feed') return new Response(externalBody);
        throw new Error(`Unexpected network request: ${url}`);
    };
});
afterEach(() => { global.fetch = realFetch; env.DB?.db?.close(); });
const request = data => new Request('https://mont6cefalu.it/api/create-checkout-session', {method:'POST',headers:{'Content-Type':'application/json',Origin:'https://mont6cefalu.it'},body:JSON.stringify(data)});
const choice = (extra={}) => ({checkIn:'10/09/2030',checkOut:'12/09/2030',guests:'2',lang:'it',requestId:crypto.randomUUID(),...extra});
const pay = data => checkout.onRequestPost({request:request(data),env});
async function createPaid(extra={}) {
    assert.equal((await pay(choice(extra))).status,200);
    const s=[...sessions.values()].at(-1);s.payment_status='paid';s.status='complete';return s;
}
async function event(type, object, id='evt_offline') {
    const payload=JSON.stringify({id,type,data:{object}}), t=Math.floor(Date.now()/1000);
    const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.STRIPE_WEBHOOK_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
    const mac=Buffer.from(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`${t}.${payload}`))).toString('hex');
    return webhook.onRequestPost({env,request:new Request('https://mont6cefalu.it/api/stripe-webhook',{method:'POST',headers:{'stripe-signature':`t=${t},v1=${'0'.repeat(64)},v1=${mac}`},body:payload})});
}
test('strict real dates and leap years',()=>{
    for(const d of ['31/02/2030','29/02/2030','2027-13-01','junk',{},'1/9/2030']) assert.equal(payment.parseDate(d),null);
    assert.equal(payment.isoDate(payment.parseDate('29/02/2032')),'2032-02-29');
});
test('past dates, short stays and malformed guests cannot reach Stripe',async()=>{
    for(const data of [choice({checkIn:'01/01/2020',checkOut:'03/01/2020'}),choice({checkOut:'11/09/2030'}),choice({checkIn:'31/02/2030'}),choice({guests:'2<script>'}),choice({guests:1.9}),choice({guests:true})]) assert.equal((await pay(data)).status,400);
    assert.equal(requests.length,0);
});
test('missing DB or webhook secret prevents charging',async()=>{
    const db=env.DB;delete env.DB;assert.equal((await pay(choice())).status,503);env.DB=db;
    delete env.STRIPE_WEBHOOK_SECRET;assert.equal((await pay(choice())).status,503);assert.equal(requests.length,0);
});
test('malformed JSON and cross-origin requests are rejected',async()=>{
    assert.equal((await checkout.onRequestPost({env,request:new Request('https://mont6cefalu.it/api/create-checkout-session',{method:'POST',body:'{'})})).status,400);
    const req=request(choice());req.headers.set('Origin','https://unrelated.example');assert.equal((await checkout.onRequestPost({env,request:req})).status,403);
});
test('server calculates the total and sets a bounded card Checkout',async()=>{
    assert.equal((await pay(choice({checkIn:'30/09/2030',checkOut:'02/10/2030',amount:1}))).status,200);
    assert.equal(requests[0].get('line_items[0][price_data][unit_amount]'),'21800');
    assert.equal(requests[0].get('payment_method_types[0]'),'card');
    assert.ok(Number(requests[0].get('expires_at'))>Date.now()/1000+1800);
});
test('concurrent overlapping checkouts create only one payable session',async()=>{
    const responses=await Promise.all([pay(choice()),pay(choice())]);
    assert.deepEqual(responses.map(r=>r.status).sort(),[200,409]);assert.equal(requests.length,1);
});
test('changed quote is rejected before a hold or charge is created',async()=>{
    assert.equal((await pay(choice({expectedAmount:1}))).status,409);assert.equal(requests.length,0);
    assert.equal((await env.DB.prepare('SELECT count(*) AS n FROM checkout_holds').first()).n,0);
});
test('middleware never executes a failed payment handler twice',async()=>{
    let executions=0;
    const response=await middleware.onRequest({request:request(choice()),next:async()=>{executions++;throw new Error('Simulated handler failure')}});
    assert.equal(response.status,503);assert.equal(executions,1);
});
test('prearrival cron catches last-minute stays, uses Rome dates and does not resend',async()=>{
    const today=payment.todayInRome(), end=payment.parseDate(today);end.setUTCDate(end.getUTCDate()+2);
    await env.DB.prepare(`INSERT INTO bookings (stripe_session_id,check_in,check_out,guest_email,guest_name,status) VALUES (?,?,?,?,?,'confirmed')`)
        .bind('cs_test_cron00000001',today,payment.isoDate(end),'guest@example.test','<b>Guest</b>').run();
    assert.equal((await cron.runDailyEmails(env)).prearrival,1);
    assert.equal((await cron.runDailyEmails(env)).prearrival,0);
    assert.equal(mails.length,1);assert.ok(mails[0].html.includes('&lt;b&gt;Guest&lt;/b&gt;'));
});
test('a repeated request resumes the same session',async()=>{
    const selection=choice();const a=await(await pay(selection)).json();const b=await(await pay(selection)).json();
    assert.equal(a.url,b.url);assert.equal(requests.length,1);
});
test('adjacent stays are allowed but occupied nights are not',async()=>{
    const s=await createPaid();await payment.recordPaidSession(env,s);
    assert.equal((await pay(choice({checkIn:'12/09/2030',checkOut:'14/09/2030'}))).status,200);
    assert.equal((await pay(choice({checkIn:'11/09/2030',checkOut:'13/09/2030'}))).status,409);
});
test('unknown Stripe timeout keeps the dates held',async()=>{
    stripeFailure='timeout';assert.equal((await pay(choice())).status,503);
    const row=await env.DB.prepare('SELECT status FROM checkout_holds').first();assert.equal(row.status,'active');
    stripeFailure=null;assert.equal((await pay(choice())).status,409);
});
test('definitive Stripe rejection releases the hold without exposing details',async()=>{
    stripeFailure=400;const r=await pay(choice());assert.equal(r.status,503);assert.ok(!(await r.text()).includes('secret'));
    assert.equal((await env.DB.prepare('SELECT status FROM checkout_holds').first()).status,'released');
});
test('expired holds remain locked until Stripe confirms expiration',async()=>{
    await pay(choice());const s=[...sessions.values()][0];
    await env.DB.prepare('UPDATE checkout_holds SET expires_at = 1').run();
    assert.equal((await pay(choice())).status,409);
    s.status='expired';assert.equal((await pay(choice())).status,200);
});
test('paid-at-expiry is recorded rather than resold',async()=>{
    const s=await createPaid();await env.DB.prepare('UPDATE checkout_holds SET expires_at = 1').run();
    assert.equal((await pay(choice())).status,409);
    assert.equal((await env.DB.prepare('SELECT status FROM bookings WHERE stripe_session_id = ?').bind(s.id).first()).status,'confirmed');
});
test('idempotent fulfillment and amount mismatch detection',async()=>{
    const s=await createPaid();await payment.recordPaidSession(env,s);await payment.recordPaidSession(env,s);
    assert.equal((await env.DB.prepare('SELECT count(*) AS n FROM bookings').first()).n,1);
    await assert.rejects(payment.recordPaidSession(env,{...s,amount_total:1}),/does not match/);
});
test('legacy overlapping paid sessions cannot both be confirmed',async()=>{
    const base={id:'cs_test_legacy00000001',mode:'payment',payment_status:'paid',amount_total:25400,currency:'eur',metadata:{checkIn:'10/09/2030',checkOut:'12/09/2030',guests:'2'}};
    await payment.recordPaidSession(env,base);
    await assert.rejects(payment.recordPaidSession(env,{...base,id:'cs_test_legacy00000002'}),/conflicts/);
});
test('a refund before completion cannot revive a cancelled booking',async()=>{
    const s=await createPaid();await payment.cancelSession(env,s);
    assert.equal((await payment.recordPaidSession(env,s)).status,'cancelled');
    assert.equal((await env.DB.prepare('SELECT count(*) AS n FROM bookings').first()).n,0);
    assert.equal((await pay(choice())).status,200);
});
test('partial refund keeps dates; full refund releases them',async()=>{
    const s=await createPaid();await payment.recordPaidSession(env,s);
    assert.equal((await event('charge.refunded',{id:'ch_test',payment_intent:'pi_test',amount:25400,amount_refunded:12700},'evt_partial')).status,200);
    assert.equal((await pay(choice())).status,409);
    assert.equal((await event('charge.refunded',{id:'ch_test',payment_intent:'pi_test',amount:25400,amount_refunded:25400},'evt_full')).status,200);
    assert.equal((await pay(choice())).status,200);
});
test('webhook signature rejects forgeries and stale timestamps',async()=>{
    assert.equal(await webhook.verifyStripeSignature('{}','t=NaN,v1='+'0'.repeat(64),'secret'),false);
    assert.equal(await webhook.verifyStripeSignature('{}','t=1,v1='+'0'.repeat(64),'secret'),false);
    assert.equal(await webhook.verifyStripeSignature('{}',null,'secret'),false);
    const s=await createPaid();assert.equal((await event('checkout.session.completed',s)).status,200);
});
test('asynchronous success and repeated events are handled once',async()=>{
    const s=await createPaid({lang:'en'});
    assert.equal((await event('checkout.session.async_payment_succeeded',s)).status,200);
    assert.equal((await event('checkout.session.completed',s)).status,200);
    assert.equal(mails.filter(m=>m.to==='guest@example.test').length,1);
    assert.equal(mails.filter(m=>m.key===`mont6-host-${s.id}`).length,1);
    assert.ok(mails.find(m=>m.to==='guest@example.test').subject.includes('confirmed'));
});
test('email failure requests a retry and does not lose the booking',async()=>{
    const s=await createPaid();mailFailure=true;
    assert.equal((await event('checkout.session.completed',s)).status,503);
    assert.equal((await env.DB.prepare('SELECT status FROM bookings').first()).status,'confirmed');
    mailFailure=false;assert.equal((await event('checkout.session.completed',s)).status,200);
    assert.equal(mails.filter(m=>m.key===`mont6-host-${s.id}`).length,1);
    assert.ok((await env.DB.prepare('SELECT sent_confirmation_at FROM bookings').first()).sent_confirmation_at);
});
test('malformed manual/external calendars fail closed',async()=>{
    blockedData=[{from:'2030-02-31',to:'2030-03-04'}];assert.equal((await pay(choice())).status,503);
    blockedData=[];env.AIRBNB_ICAL_URL='https://calendar.example.test/feed';externalBody='<html>Error</html>';
    assert.equal((await pay(choice())).status,503);assert.equal(requests.length,0);
});
test('iCal uses exclusive checkout, ignores cancelled events, rejects truncation',()=>{
    const text='BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20300910\r\nDTEND;VALUE=DATE:20300912\r\nEND:VEVENT\r\nEND:VCALENDAR';
    assert.deepEqual(booked.parseCalendar(text),[{from:'2030-09-10',to:'2030-09-11'}]);
    assert.deepEqual(booked.parseCalendar(text.replace('DTSTART','STATUS:CANCELLED\r\nDTSTART')),[]);
    assert.throws(()=>booked.parseCalendar(text.replace('END:VEVENT','')));
});
test('D1 failure never exports an empty successful iCal',async()=>{
    assert.equal((await calendar.onRequestGet({env:{}})).status,503);
    assert.equal((await calendar.onRequestGet({env:{DB:{prepare(){throw new Error('offline')}}}})).status,503);
});
test('return page verifies paid and registered status without exposing guest data',async()=>{
    const call=id=>status.onRequestGet({env,request:new Request(`https://mont6cefalu.it/api/booking-status?session_id=${id}`)});
    assert.equal((await call('fake')).status,400);
    await pay(choice());const s=[...sessions.values()][0];assert.equal((await(await call(s.id)).json()).status,'pending');
    s.payment_status='paid';s.status='complete';const r=await call(s.id), data=await r.json();
    assert.equal(data.status,'confirmed');assert.equal(data.amount,25400);assert.equal(data.email,undefined);assert.equal(data.name,undefined);
    assert.equal(r.headers.get('Cache-Control'),'no-store');
    await payment.cancelSession(env,s);assert.equal((await(await call(s.id)).json()).status,'cancelled');
});
test('automatic email escapes guest HTML and unsafe review URLs',()=>{
    const content=cron.emailContent('review',{guest_name:'<img src=x onerror=alert(1)>',lang:'en'},{REVIEW_URL:'javascript:alert(1)'});
    assert.ok(content.html.includes('&lt;img'));assert.ok(!content.html.includes('href="javascript:'));assert.ok(!content.html.includes('<img'));
});
