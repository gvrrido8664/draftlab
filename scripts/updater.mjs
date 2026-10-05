import {createServer} from 'node:http';
import {readFile,writeFile,rename} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
import {parseEnv} from 'node:util';
import {setTimeout as delay} from 'node:timers/promises';
import {openStore,normalizeMatch} from './match-store.mjs';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const seed=JSON.parse(await readFile(resolve(root,'public/data/meta.json'),'utf8'));
const catalog=JSON.parse(await readFile(resolve(root,'public/data/champions.json'),'utf8'));
const champions=Object.fromEntries(Object.values(catalog.data).map(c=>[Number(c.key),c.id]));
const store=openStore(resolve(root,'.local-data/matches.sqlite'),seed);
const defaults={auto:true,hours:6,nextRun:Date.now()};
let settings=store.get('settings',defaults);
let job=store.get('job',{status:'idle',stage:'discover',completed:0,total:0,added:0,rejected:0,duplicates:0,message:'Listo para actualizar.'});
if(['running','waiting'].includes(job.status)){job.status='paused';job.message='Descarga interrumpida. Puedes reanudarla.';store.set('job',job);}
let controller=null,running=false;
function save(){store.set('job',job);}
function status(){const safe={...job,playerCount:job.players?.length??30};delete safe.players;delete safe.queue;return {app:'draftlab-updater',job:safe,settings,...store.summary(),catalogPatch:seed.patch,storage:'.local-data/matches.sqlite'};}
async function persistSnapshot(){const snapshot=store.snapshot(seed.patch);if(!snapshot.games.length)return;const path=resolve(root,'public/data/meta.json');await writeFile(`${path}.tmp`,JSON.stringify(snapshot));await rename(`${path}.tmp`,path);}
async function start(){
 if(running)return;
 running=true;controller=new AbortController();const signal=controller.signal;
 try{
  if(!Array.isArray(job.queue)||(job.status!=='paused'&&job.status!=='error'))job={status:'running',stage:'discover',players:null,queue:[],discovered:0,completed:0,total:0,added:0,rejected:0,duplicates:0,startedAt:Date.now(),message:'Buscando partidas de cuentas Challenger LAS…'};
  job.status='running';job.error=null;save();
  const env=parseEnv(await readFile(resolve(root,'.env.local'),'utf8'));
  if(!env.RIOT_API_KEY)throw Error('Falta RIOT_API_KEY en .env.local.');
  async function riot(host,path){
   for(let retry=0;retry<4;retry++){
    await delay(1400,undefined,{signal});
    const response=await fetch(`https://${host}.api.riotgames.com${path}`,{headers:{'X-Riot-Token':env.RIOT_API_KEY},signal:AbortSignal.any([signal,AbortSignal.timeout(20000)])});
    if(response.status===429||response.status>=500){
     const seconds=response.status===429?Math.max(2,Number(response.headers.get('retry-after'))||120):5*(retry+1);
     job.status='waiting';job.retryAt=Date.now()+seconds*1000;job.message=response.status===429?'Esperando el límite de Riot. Se reanuda automáticamente.':'Riot no está disponible. Reintentando…';save();
     await delay(seconds*1000,undefined,{signal});job.status='running';job.retryAt=null;save();continue;
    }
    if(!response.ok)throw Error(response.status===403||response.status===401?'La clave Riot expiró o fue rechazada. Actualiza .env.local y pulsa Reanudar.':`Riot respondió HTTP ${response.status}. Puedes reintentar.`);
    return response.json();
   }
   throw Error('Riot sigue limitando las consultas. Reanuda más tarde.');
  }
  if(!job.players){const league=await riot('la2','/lol/league/v4/challengerleagues/by-queue/RANKED_SOLO_5x5');if(!Array.isArray(league.entries))throw Error('Riot devolvió una lista inválida.');job.players=league.entries.filter(p=>typeof p.puuid==='string').sort((a,b)=>b.leaguePoints-a.leaguePoints).slice(0,30).map(p=>p.puuid);if(!job.players.length)throw Error('Riot no devolvió cuentas para consultar.');save();}
  if(job.stage==='discover'){
   for(let i=job.discovered??0;i<job.players.length;i++){
    job.message=`Buscando partidas · cuenta ${i+1} de ${job.players.length}`;save();
    const list=await riot('americas',`/lol/match/v5/matches/by-puuid/${encodeURIComponent(job.players[i])}/ids?queue=420&count=20`);
    if(!Array.isArray(list)||list.some(id=>typeof id!=='string'||!/^LA2_\d+$/.test(id)))throw Error('Riot devolvió identificadores inválidos.');
    job.queue=[...new Set([...job.queue,...list])];job.discovered=i+1;save();
   }
   const unseen=job.queue.filter(id=>!store.has(id));job.duplicates=job.queue.length-unseen.length;
   job.queue=unseen.slice(0,300);job.total=job.queue.length;job.stage='download';save();
  }
  for(let i=job.completed;i<job.queue.length;i++){
   const id=job.queue[i];job.message=`Descargando partida ${i+1} de ${job.total}`;save();
   if(store.has(id)){job.duplicates++;}else{
    const result=normalizeMatch(id,await riot('americas',`/lol/match/v5/matches/${id}`),champions);
    store.db.exec('BEGIN IMMEDIATE');
    try{if(store.add(id,result.patch,result.date,result.data,result.reason)){if(result.data)job.added++;else job.rejected++;}job.completed=i+1;save();store.db.exec('COMMIT');}catch(e){store.db.exec('ROLLBACK');throw e;}
   }
   job.completed=i+1;save();
  }
  await persistSnapshot();job.status='complete';job.finishedAt=Date.now();job.message=`Actualización terminada: ${job.added} partidas nuevas.`;save();
 }catch(e){
  job.status=signal.aborted?'paused':'error';job.error=signal.aborted?null:(e instanceof Error?e.message:'No se pudo descargar.');job.message=signal.aborted?'Pausado. Las partidas descargadas están guardadas.':job.error;save();
  await persistSnapshot().catch(()=>{});
 }finally{running=false;controller=null;settings.nextRun=Date.now()+settings.hours*3600000;store.set('settings',settings);}
}

const files={'/':'updater-panel.html','/panel.js':'updater-panel.js','/panel.css':'updater-panel.css'};
const server=createServer(async(req,res)=>{
 const host=req.headers.host;if(!['127.0.0.1:5180','localhost:5180'].includes(host)){res.writeHead(403);res.end();return;}
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
 const url=new URL(req.url,`http://${host}`);
 function json(value,code=200){res.writeHead(code,{'Content-Type':'application/json'});res.end(JSON.stringify(value));}
 if(req.method==='POST'&&req.headers.origin!==`http://${host}`){json({error:'Origen no permitido'},403);return;}
 try{
  if(req.method==='GET'&&url.pathname==='/api/status'){json(status());return;}
  if(req.method==='GET'&&url.pathname==='/api/export'){
   const patch=url.searchParams.get('patch')||seed.patch;if(!/^\d{1,2}\.\d{1,2}$/.test(patch)){json({error:'Parche inválido'},400);return;}
   res.setHeader('Content-Disposition',`attachment; filename="draftlab-${patch}.json"`);json(store.snapshot(patch));return;
  }
  if(req.method==='POST'&&url.pathname==='/api/start'){void start();json({ok:true});return;}
  if(req.method==='POST'&&url.pathname==='/api/pause'){controller?.abort();settings.auto=false;store.set('settings',settings);json({ok:true});return;}
  if(req.method==='POST'&&url.pathname==='/api/settings'){
   let body='';for await(const chunk of req){body+=chunk;if(body.length>1000){json({error:'Solicitud demasiado grande'},413);return;}}
   const value=JSON.parse(body);if(typeof value.auto!=='boolean'||![6,12,24].includes(value.hours)){json({error:'Configuración inválida'},400);return;}
   settings={auto:value.auto,hours:value.hours,nextRun:Date.now()+value.hours*3600000};store.set('settings',settings);json({ok:true});return;
  }
  if(req.method==='GET'&&Object.hasOwn(files,url.pathname)){const file=files[url.pathname];res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.js')?'text/javascript; charset=utf-8':'text/css; charset=utf-8'});res.end(await readFile(resolve(root,'scripts',file)));return;}
  json({error:'No encontrado'},404);
 }catch{json({error:'No se pudo completar la operación. Los datos guardados se conservan.'},500);}
});
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'El actualizador ya está abierto en http://127.0.0.1:5180':e.message);process.exitCode=1;store.db.close();});
server.listen(5180,'127.0.0.1',()=>{
 console.log('Draftlab · http://127.0.0.1:5180');
 setInterval(()=>{if(settings.auto&&!running&&Date.now()>=settings.nextRun)void start();},5000).unref();
});
