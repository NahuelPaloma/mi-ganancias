import http from 'node:http';
import {readFile,copyFile,mkdir,open,unlink} from 'node:fs/promises';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Store,ConflictError} from './lib/store.mjs';
import {ValidationError} from './lib/validation.mjs';
const root=dirname(fileURLToPath(import.meta.url));
const publicDir=join(root,'public');
export async function createApp({dataDir=resolve(process.env.DATA_DIR||join(root,'data'))}={}){
 const store=new Store(dataDir);await store.init();
 try{await copyFile(join(root,'audit.example.json'),join(dataDir,'audit.json'),1);}catch(e){if(e.code!=='EEXIST')throw e;}
 const json=(res,status,payload)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(payload));};
 const handler=async(req,res)=>{try{
  const host=req.headers.host||'';const allowedHosts=new Set(['localhost','127.0.0.1','[::1]']);const configured=process.env.HOST||'127.0.0.1';if(configured!=='0.0.0.0'&&configured!=='::')allowedHosts.add(configured);
  const hostname=host.startsWith('[')?host.slice(0,host.indexOf(']')+1):host.split(':')[0];
  if(!allowedHosts.has(hostname))return json(res,403,{error:'Host no permitido.'});
  const url=new URL(req.url,'http://'+host);
  // All reads and writes stay same-origin; no CORS or remote ARCA requests.
  if(req.headers.origin&&req.headers.origin!==url.origin)return json(res,403,{error:'Origen no permitido.'});
  if(url.pathname==='/api/audit'&&req.method==='GET'){
   const audit=JSON.parse(await readFile(join(dataDir,'audit.json'),'utf8'));
   if(!Array.isArray(audit.months)||audit.months.length!==12)throw Error('Base auditada no válida.');
   return json(res,200,audit);
  }
  if(url.pathname==='/api/tracker'){
   if(req.method==='GET')return json(res,200,await store.read());
   if(req.method==='PUT'){
    if(req.headers.origin!==url.origin)return json(res,403,{error:'El guardado requiere el mismo origen.'});
    if(!req.headers['content-type']?.startsWith('application/json'))return json(res,415,{error:'Se requiere JSON.'});
    const chunks=[];let bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>2000000)return json(res,413,{error:'Respaldo demasiado grande.'});chunks.push(chunk);}const body=Buffer.concat(chunks).toString('utf8');
    let p;try{p=JSON.parse(body);}catch{return json(res,400,{error:'JSON no válido.'});}
    if(!p||typeof p!=='object')return json(res,400,{error:'Solicitud no válida.'});
    return json(res,200,await store.save(p.data,p.version??null));
   }
   return json(res,405,{error:'Método no permitido.'});
  }
  if(url.pathname==='/health'&&req.method==='GET')return json(res,200,{ok:true});
  if(req.method!=='GET'&&req.method!=='HEAD')return json(res,405,{error:'Método no permitido.'});
  const files={'/':['index.html','text/html; charset=utf-8'],'/app.js':['app.js','text/javascript; charset=utf-8'],'/styles.css':['styles.css','text/css; charset=utf-8']};
  const file=files[url.pathname];if(!file)return json(res,404,{error:'No encontrado.'});
  const body=await readFile(join(publicDir,file[0]));res.writeHead(200,{'Content-Type':file[1],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"});res.end(req.method==='HEAD'?undefined:body);
 }catch(e){if(e instanceof ConflictError)return json(res,409,{error:e.message});if(e instanceof ValidationError)return json(res,400,{error:e.message});console.error('No se pudo completar la operación:',e.name);json(res,500,{error:'No se pudo leer o guardar el archivo local. Los datos existentes no se reemplazaron.'});}};
 return {handler,store,dataDir};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const app=await createApp();const host=process.env.HOST||'127.0.0.1';const port=Number(process.env.PORT||4321);
 if(!Number.isInteger(port)||port<1||port>65535)throw Error('PORT debe ser un puerto válido.');
 // A single writer owns a data directory. A second process exits instead of risking data races.
 const lockPath=join(app.dataDir,'.server.lock');let lock;
 try{lock=await open(lockPath,'wx',0o600);await lock.writeFile(String(process.pid));}catch(e){if(e.code==='EEXIST'){console.error('Ya existe un proceso o un bloqueo en el directorio de datos. Verificá el proceso antes de retirar data/.server.lock.');process.exit(1);}throw e;}
 const server=http.createServer(app.handler);
 let closing=false;const close=()=>{if(closing)return;closing=true;server.close(async()=>{await lock.close();await unlink(lockPath).catch(()=>{});process.exit(0)});};
 server.on('error',async e=>{console.error('No se pudo iniciar el servidor:',e.code);await lock.close();await unlink(lockPath).catch(()=>{});process.exit(1)});
 process.on('SIGINT',close);process.on('SIGTERM',close);
 server.listen(port,host,()=>console.log('Mi Ganancias disponible en http://'+host+':'+port+'\nDatos locales: '+app.dataDir));
}
