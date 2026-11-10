import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
const source=fs.readFileSync('apps/landing-page/src/lib/blog.ts','utf8');
const exports={}; vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports, process: {env: {NODE_ENV: "development"}}});
const post=exports.blogPosts.find(p=>p.path===process.argv[2]);
if(!post){console.error('Article introuvable');process.exit(1)}
const out=[`# ${post.title}`, '', `**Titre SEO :** ${post.seoTitle||post.title}`, '', `**Meta description :** ${post.description}`, '', `**URL locale :** http://localhost:3000${post.path}`, '', post.intro, '', `**Réponse :** ${post.answer}`, ''];
for(const s of post.sections){out.push(`## ${s.title}`, '', ...s.paragraphs.flatMap(p=>[p,'']));if(s.items)out.push(...s.items.map(i=>`- ${i}`),'');if(s.table){out.push(`**${s.table.caption}**`,'',`| ${s.table.headers.join(' | ')} |`,`| ${s.table.headers.map(()=> '---').join(' | ')} |`,...s.table.rows.map(r=>`| ${r.join(' | ')} |`),'');}}
out.push(`## ${post.takeaway.title}`,'',post.takeaway.text,'',`[${post.ctaLabel || "Essayer Okado"}](${post.ctaHref || "https://app.okado.app/inscription"})`,'','## Sources', '',...post.source.map(s=>`- [${s.label}](${s.href})`),'','## Lectures associées','',...post.related.map(r=>`- ${r}`),'');
const file=process.argv[3]; if(file)fs.writeFileSync(file,out.join('\n'));else console.log(out.join('\n'));
