import {readdir,readFile,access} from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd(),files=['README.md','AGENTS.md'];
async function walk(folder){for(const entry of await readdir(path.join(root,folder),{withFileTypes:true})){const file=path.join(folder,entry.name);if(entry.isDirectory())await walk(file);else if(entry.name.endsWith('.md'))files.push(file)}}
await walk('docs');
try{await access('CHANGELOG.md');files.push('CHANGELOG.md')}catch{}
let links=0;const errors=[];
for(const file of files){
 const source=await readFile(path.join(root,file),'utf8');
 for(const match of source.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)){
  let target=match[1].trim();target=target.startsWith('<')?target.slice(1,target.indexOf('>')):target.split(/\s+["']/)[0];
  if(/^(?:https?:|mailto:|app:|plugin:|#)/.test(target))continue;
  target=decodeURIComponent(target.split('#')[0]);if(!target)continue;links++;
  try{await access(path.resolve(root,path.dirname(file),target))}catch{errors.push({file,target})}
 }
}
console.log(JSON.stringify({markdownFiles:files.length,localLinks:links,errors}));if(errors.length)process.exitCode=1;
