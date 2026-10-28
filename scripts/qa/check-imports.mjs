import {readdir,readFile,access} from 'node:fs/promises';
import path from 'node:path';
import {parseAst} from 'rollup/parseAst';
const files=[],errors=[];let imports=0;
async function walk(folder){for(const entry of await readdir(folder,{withFileTypes:true})){const file=path.join(folder,entry.name);if(entry.isDirectory())await walk(file);else if(/\.(m?js)$/.test(entry.name))files.push(file)}}
for(const folder of ['frontend/src','shared','data','backend','scripts','tests'])await walk(folder);
for(const file of files){
 let ast;try{ast=parseAst(await readFile(file,'utf8'))}catch(error){errors.push({file,error:error.message});continue}
 const visit=async node=>{
  if(!node||typeof node!=='object')return;
  if(['ImportDeclaration','ExportNamedDeclaration','ExportAllDeclaration','ImportExpression'].includes(node.type)&&node.source?.value?.startsWith('.')){
   const target=node.source.value.split('?')[0];imports++;
   try{await access(path.resolve(path.dirname(file),target))}catch{errors.push({file,target})}
  }
  for(const value of Object.values(node))if(Array.isArray(value)){for(const child of value)await visit(child)}else if(value&&typeof value==='object')await visit(value);
 };
 await visit(ast);
}
console.log(JSON.stringify({modules:files.length,relativeImports:imports,errors}));if(errors.length)process.exitCode=1;
