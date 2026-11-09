#!/usr/bin/env node
// llms-txt-generator : lit un sitemap, visite les pages, écrit un llms.txt au format llmstxt.org.
// Aucune dépendance. Node 18 ou plus.
import { writeFile } from 'node:fs/promises';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i > -1 ? args[i + 1] : def; };
const sitemapUrl = args.find((a) => /^https?:\/\//.test(a));
if (!sitemapUrl || args.includes('--help')) {
  console.log(`Usage : llms-txt-generator <url-du-sitemap> [options]

  --out <fichier>      fichier de sortie (défaut : llms.txt ; « - » pour la sortie standard)
  --limit <n>          nombre maximum de pages lues (défaut : 200)
  --concurrency <n>    pages lues en parallèle (défaut : 4)
  --title <texte>      titre du site (défaut : titre de la page d'accueil)
  --summary <texte>    résumé du site (défaut : description de la page d'accueil)
  --exclude <regex>    ignore les URL qui correspondent`);
  process.exit(sitemapUrl ? 0 : 1);
}
const out = opt('out', 'llms.txt');
const limit = Number(opt('limit', 200));
const concurrency = Math.max(1, Number(opt('concurrency', 4)));
const exclude = opt('exclude') ? new RegExp(opt('exclude')) : null;
const UA = 'llms-txt-generator/1.0 (+https://github.com/YanisZedira/llms-txt-generator)';

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#0?39;|&apos;|&rsquo;/g, "'").replace(/&quot;/g, '"')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/\s+/g, ' ').trim();

async function get(url) {
  const res = await fetch(url, { headers: { 'user-agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// Un sitemap peut être un index de sitemaps : on descend d'un niveau.
async function readSitemap(url, depth = 0) {
  const xml = await get(url);
  const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => decode(m[1]));
  if (/<sitemapindex/i.test(xml) && depth < 2) {
    const nested = [];
    for (const loc of locs) nested.push(...(await readSitemap(loc, depth + 1)));
    return nested;
  }
  return locs;
}

function meta(html) {
  const pick = (re) => { const m = html.match(re); return m ? decode(m[1]) : ''; };
  const title = pick(/<title[^>]*>([\s\S]*?)<\/title>/i) || pick(/<h1[^>]*>([\s\S]*?)<\/h1>/i).replace(/<[^>]+>/g, '');
  const description = pick(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i)
    || pick(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i)
    || pick(/<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']*)["']/i);
  const noindex = /<meta[^>]+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html);
  return { title, description, noindex };
}

const sectionName = (segment) => segment ? segment.replace(/[-_]/g, ' ').replace(/^./, (c) => c.toUpperCase()) : 'Pages principales';

let urls = [...new Set(await readSitemap(sitemapUrl))];
if (exclude) urls = urls.filter((u) => !exclude.test(u));
const total = urls.length;
urls = urls.slice(0, limit);
console.error(`${total} URL dans le sitemap, ${urls.length} lues.`);

const pages = [];
let cursor = 0, failed = 0;
await Promise.all(Array.from({ length: concurrency }, async () => {
  while (cursor < urls.length) {
    const url = urls[cursor++];
    try {
      const m = meta(await get(url));
      if (!m.noindex && m.title) pages.push({ url, ...m });
    } catch (e) { failed++; console.error(`  ignorée : ${url} (${e.message})`); }
  }
}));
if (!pages.length) { console.error('Aucune page lisible.'); process.exit(1); }

const origin = new URL(pages[0].url).origin;
const home = pages.find((p) => new URL(p.url).pathname === '/') || pages[0];
const groups = new Map();
for (const p of pages.sort((a, b) => a.url.localeCompare(b.url))) {
  const parts = new URL(p.url).pathname.split('/').filter(Boolean);
  const key = parts.length > 1 ? sectionName(parts[0]) : 'Pages principales';
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(p);
}
const order = [...groups.keys()].sort((a, b) => (a === 'Pages principales' ? -1 : b === 'Pages principales' ? 1 : a.localeCompare(b)));

let text = `# ${opt('title', home.title)}\n\n> ${opt('summary', home.description || `Contenu de ${origin}`)}\n`;
for (const key of order) {
  text += `\n## ${key}\n\n`;
  for (const p of groups.get(key)) text += `- [${p.title}](${p.url})${p.description ? `: ${p.description}` : ''}\n`;
}
if (out === '-') process.stdout.write(text); else await writeFile(out, text, 'utf8');
console.error(`${out === '-' ? 'llms.txt' : out} écrit : ${pages.length} pages, ${order.length} sections${failed ? `, ${failed} en erreur` : ''}.`);
