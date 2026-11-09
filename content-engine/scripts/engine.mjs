import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';

const root = process.cwd();
const landing = path.join(root, 'apps/landing-page');
function load(relative) {
  const source = fs.readFileSync(path.join(landing, 'src/lib', relative), 'utf8');
  const js = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText;
  const exports = {};
  vm.runInNewContext(js, {exports}, {filename: relative, timeout: 2000});
  return exports;
}
const posts = load('blog.ts').blogPosts;
const pages = load('public-content.ts').publicContent;
const staticRoutes = ['/','/blog','/guides','/robots.txt','/sitemap.xml'];
function walk(dir, prefix='') {
  for (const e of fs.readdirSync(dir, {withFileTypes:true})) {
    if (e.isDirectory() && !e.name.startsWith('[') && !e.name.startsWith('(') && !e.name.startsWith('@')) walk(path.join(dir,e.name), `${prefix}/${e.name}`);
    else if (e.isFile() && /^page\.(tsx|ts|jsx|js)$/.test(e.name)) staticRoutes.push(prefix || '/');
  }
}
walk(path.join(landing,'src/app'));
const routes = new Set([...staticRoutes, ...pages.map(p=>p.path), ...posts.map(p=>p.path)]);
const clean = s => String(s ?? '').replace(/\|/g,'\\|').replace(/\s+/g,' ').trim();
function inventory() {
 const lines = ['# Inventaire du blog', '', 'Généré depuis le registre ; le sujet et l’intention sont des hypothèses dérivées du titre, à confirmer éditorialement.', '', '| Titre | URL | Sujet / intention probable |', '| --- | --- | --- |'];
 for(const p of posts) lines.push(`| ${clean(p.title)} | ${p.path} | ${clean(p.eyebrow)} — répondre à « ${clean(p.title)} » |`);
 fs.writeFileSync(path.join(root,'content-engine/roadmap/inventory.md'), lines.join('\n')+'\n');
 console.log(`${posts.length} articles inventoriés.`);
}
function validDate(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s+'T00:00:00Z')) && new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s; }
function validateBrief(file) {
 let b; try { b=JSON.parse(fs.readFileSync(file,'utf8')); } catch(e) {return [`${file}: JSON illisible : ${e.message}`];}
 const errors=[]; const need=(key)=>{if(typeof b[key]!=='string'||!b[key].trim()) errors.push(`${key} requis`);};
 for(const k of ['topic','intent','audience','decision','overlap_analysis','outline','cta','review_notes']) need(k);
 if(!['create','update','abandon'].includes(b.decision)) errors.push('decision doit être create, update ou abandon');
 if(!['BLOCKED','NEEDS_EDITS','READY_FOR_HUMAN_REVIEW'].includes(b.status)) errors.push('status invalide');
 if(!Array.isArray(b.sources)||!b.sources.length) errors.push('sources requises');
 else for(const [i,s] of b.sources.entries()) {
   try {if(!['https:','http:'].includes(new URL(s.url).protocol)) throw Error();} catch {errors.push(`sources[${i}].url invalide`);}
   if(!validDate(s.accessed_at)||s.accessed_at>new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Berlin', year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date())) errors.push(`sources[${i}].accessed_at invalide`);
   for(const k of ['claim','evidence']) if(typeof s[k]!=='string'||!s[k].trim()) errors.push(`sources[${i}].${k} requis`);
 }
 if(!Array.isArray(b.checks)||!b.checks.length) errors.push('checks requis');
 else for(const [i,c] of b.checks.entries()) if(!c.item || !['pass','fail','unknown'].includes(c.result) || !c.evidence) errors.push(`checks[${i}] incomplet`);
 if(b.status==='READY_FOR_HUMAN_REVIEW' && (!Array.isArray(b.checks)||b.checks.some(c=>c.result!=='pass'))) errors.push('READY exige uniquement des contrôles passés');
 return errors.map(e=>`${file}: ${e}`);
}
function audit(selected) {
 const errors=[], warnings=[]; const seen=new Set(), titles=new Set();
 for(const p of posts) {
  if(seen.has(p.path)) errors.push(`URL dupliquée ${p.path}`); seen.add(p.path);
  const title=(p.seoTitle||p.title||'').toLowerCase(); if(titles.has(title)) errors.push(`titre SEO dupliqué ${p.path}`); titles.add(title);
 }
 for(const p of selected) {
  const err=m=>errors.push(`${p.path}: ${m}`), warn=m=>warnings.push(`${p.path}: ${m}`);
  if(!/^\/blog\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.path)) err('URL invalide');
  for(const k of ['title','description','intro','author','publishedAt','updatedAt','reviewedAt']) if(!p[k]) err(`${k} manquant`);
  for(const k of ['publishedAt','updatedAt','reviewedAt']) if(!validDate(p[k])) err(`${k} invalide`);
  if(!p.answer) warn('réponse directe absente');
  if(!p.sections?.length || p.sections.some(s=>!s.title || !s.paragraphs?.length)) err('sections incomplètes');
  if(p.image && (!p.imageAlt || !fs.existsSync(path.join(landing,'public',p.image.replace(/^\//,''))))) err('image ou alt manquant');
  if(!p.image) warn('illustration absente');
  if(!p.source?.length) warn('aucune source déclarée : vérifier les affirmations');
  const links=[...(p.related||[]), ...(p.ctaHref?[p.ctaHref]:[])];
  const scan=x=>{if(typeof x==='string') for(const m of x.matchAll(/\]\((\/[^\s)]+)\)/g)) links.push(m[1]); else if(Array.isArray(x)) x.forEach(scan); else if(x&&typeof x==='object') Object.values(x).forEach(scan);};
  scan(p.sections); scan(p.intro); scan(p.answer);
  for(const raw of new Set(links)) {const link=raw.split(/[?#]/)[0] || '/'; if(!routes.has(link) && !fs.existsSync(path.join(landing,'public',link.replace(/^\//,'')))) err(`lien local inconnu ${raw}`);}
  for(const s of p.source||[]) {try {if(!['http:','https:'].includes(new URL(s.href).protocol)) throw Error();} catch {err(`source invalide ${s.href}`);}}
 }
 for(const e of errors) console.error('ERREUR',e);
 for(const w of warnings) console.log('À REVOIR',w);
 console.log(`${selected.length} article(s) : ${errors.length} erreur(s), ${warnings.length} avertissement(s). Vérifications factuelles et humaines non automatisées.`);
 return errors.length;
}
const [command,...args]=process.argv.slice(2);
if(command==='compare-public') {
 try {
  let xml;
  if(args[0]) xml=fs.readFileSync(args[0], 'utf8');
  else { const response=await fetch('https://www.okado.app/sitemap.xml', {signal:AbortSignal.timeout(15000)}); if(!response.ok) throw Error(`HTTP ${response.status}`); xml=await response.text(); }
  const remote=new Set([...xml.matchAll(/<loc>https:\/\/www\.okado\.app(\/blog\/[^<]+)<\/loc>/g)].map(m=>m[1]));
  if(!remote.size) throw Error('Aucune URL de blog dans le sitemap');
  const local=new Set(posts.map(p=>p.path));
  const missing=[...remote].filter(p=>!local.has(p)); const unpublished=[...local].filter(p=>!remote.has(p));
  console.log(`Sitemap : ${remote.size} ; registre : ${local.size}\nPublic seulement : ${missing.join(', ') || 'aucun'}\nLocal seulement : ${unpublished.join(', ') || 'aucun'}`);
  if(missing.length || unpublished.length) process.exitCode=1;
 } catch(e) {console.error(`Comparaison indisponible : ${e.message}`);process.exitCode=2;}
}
else if(command==='inventory') inventory();
else if(command==='audit') {const selected=args.length?posts.filter(p=>args.includes(p.path)):posts; if(args.length && args.length!==selected.length) {console.error('Article introuvable');process.exitCode=1;} else if(audit(selected)) process.exitCode=1;}
else if(command==='briefs') {const files=args.length?args:fs.readdirSync(path.join(root,'content-engine/briefs')).filter(f=>f.endsWith('.json')).map(f=>path.join('content-engine/briefs',f)); let n=0; for(const f of files){const errors=validateBrief(f); errors.forEach(e=>console.error(e));n+=errors.length;} console.log(`${files.length} brief(s), ${n} erreur(s). La présence d’une référence ne prouve pas sa consultation.`); if(n) process.exitCode=1;}
else {console.error('Usage: node content-engine/scripts/engine.mjs inventory|audit [URL...]|briefs [fichier...]');process.exitCode=1;}
