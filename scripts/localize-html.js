/** Render one language at build time, including nested markup and attributes.
 * Source templates use lang-it/lang-en; published pages contain one language.
 * No runtime parser or dependency is shipped to visitors.
 */
const VOID = new Set('area base br col embed hr img input link meta param source track wbr'.split(' '));

function localizeHtml(html, lang) {
    const other = lang === 'en' ? 'it' : 'en';
    const tokens = html.match(/<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>|<[^>]+>|[^<]+/gi) || [];
    const stack = [];
    let output = '';
    for (let token of tokens) {
        const opening = token.match(/^<([a-z][\w-]*)\b/i);
        const closing = token.match(/^<\/([\w-]+)\s*>/);
        const parentHidden = stack.some(item => item.hidden);
        if (closing) {
            const item = stack.pop();
            if (!item || item.tag !== closing[1].toLowerCase()) {
                throw new Error(`Unbalanced HTML near ${token}`);
            }
            if (!parentHidden) output += token;
        } else if (opening && !/^(script|style)$/i.test(opening[1])) {
            const tag = opening[1].toLowerCase();
            const classes = token.match(/\bclass="([^"]*)"/)?.[1].split(/\s+/) || [];
            const hidden = parentHidden || classes.includes(`lang-${other}`);
            if (!VOID.has(tag) && !/\/\s*>$/.test(token)) stack.push({ tag, hidden });
            if (hidden) continue;
            // Accessible names, alt text and placeholders are localized too.
            token = token.replace(/\sdata-(alt|aria-label|placeholder)-(it|en)="[^"]*"/g, '');
            output += token;
        } else if (!parentHidden) {
            output += token;
        }
    }
    if (stack.length) throw new Error('Unclosed HTML tags in template');
    return output;
}

// Attribute translation precedes filtering; option values remain unchanged.
function renderLanguage(html, lang) {
    html = html.replace(/<[^>]+>/g, tag => {
        for (const attr of ['alt', 'aria-label', 'placeholder']) {
            const translated = tag.match(new RegExp(`data-${attr}-${lang}="([^"]*)"`));
            if (translated) tag = tag.replace(new RegExp(`(?<![\\w-])${attr}="[^"]*"`), `${attr}="${translated[1]}"`);
        }
        return tag;
    });
    html = html.replace(/<option\b([^>]*)>([^<]*)<\/option>/g, (_, attrs, text) => {
        const label = attrs.match(new RegExp(`data-${lang}="([^"]*)"`))?.[1] || text;
        return `<option${attrs.replace(/\sdata-(it|en)="[^"]*"/g, '')}>${label}</option>`;
    });
    return localizeHtml(html, lang)
        .replace(/\sclass="(lang-it|lang-en)"/g, '')
        .replace(/[ \t]+$/gm, '')
        .replace(/\n[ \t]*\n[ \t]*\n/g, '\n\n');
}

module.exports = { renderLanguage };
