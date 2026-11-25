import {mkdir,readFile,writeFile,rename,copyFile,chmod} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {validateState} from './validation.mjs';
export class ConflictError extends Error {}
export class Store {
 constructor(dir){this.dir=dir;this.file=join(dir,'tracking.json');this.queue=Promise.resolve();}
 async init(){await mkdir(this.dir,{recursive:true,mode:0o700});await chmod(this.dir,0o700);await mkdir(join(this.dir,'backups'),{recursive:true,mode:0o700});}
 async read(){try{const text=await readFile(this.file,'utf8');return {data:validateState(JSON.parse(text)),version:createHash('sha256').update(text).digest('hex')};}catch(e){if(e.code==='ENOENT')return {data:{invoices:[],months:{}},version:null};throw e;}}
 async save(data,version){
  const run=async()=>{const cleaned=validateState(data);const current=await this.read();if(current.version!==version)throw new ConflictError('El registro cambió en otra pestaña. Recargá antes de volver a editar.');
   const id=randomUUID();if(current.version)await copyFile(this.file,join(this.dir,'backups',Date.now()+'-'+id+'.json'));
   const text=JSON.stringify(cleaned,null,2)+'\n';const temp=join(this.dir,'.tracking-'+id+'.tmp');await writeFile(temp,text,{mode:0o600});await rename(temp,this.file);return {version:createHash('sha256').update(text).digest('hex')};};
  const result=this.queue.then(run);this.queue=result.catch(()=>{});return result;
 }
}
