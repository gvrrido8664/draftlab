import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';

export function openStore(path,seed){
 mkdirSync(dirname(path),{recursive:true});
 const db=new DatabaseSync(path);
 db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
 CREATE TABLE IF NOT EXISTS matches(id TEXT PRIMARY KEY,patch TEXT NOT NULL,date INTEGER NOT NULL,data TEXT,reason TEXT,checked_at INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS state(key TEXT PRIMARY KEY,value TEXT NOT NULL);`);
 const insert=db.prepare('INSERT OR IGNORE INTO matches VALUES(?,?,?,?,?,?)');
 for(const game of seed.games)insert.run(game.id,seed.patch,game.date,JSON.stringify(game),null,Date.now());
 return {
  db,
  has:id=>!!db.prepare('SELECT 1 FROM matches WHERE id=?').get(id),
  add:(id,patch,date,data,reason=null)=>insert.run(id,patch,date,data?JSON.stringify(data):null,reason,Date.now()).changes>0,
  get:(key,fallback)=>{const row=db.prepare('SELECT value FROM state WHERE key=?').get(key);return row?JSON.parse(row.value):fallback;},
  set:(key,value)=>db.prepare('INSERT INTO state VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key,JSON.stringify(value)),
  summary:()=>({total:db.prepare('SELECT count(*) AS n FROM matches WHERE data IS NOT NULL').get().n,checked:db.prepare('SELECT count(*) AS n FROM matches').get().n,patches:db.prepare('SELECT patch,count(*) AS count FROM matches WHERE data IS NOT NULL GROUP BY patch ORDER BY max(date) DESC').all()}),
  snapshot:patch=>({...seed,patch,collectedAt:new Date().toISOString(),games:db.prepare('SELECT data FROM matches WHERE patch=? AND data IS NOT NULL ORDER BY date DESC').all(patch).map(r=>JSON.parse(r.data))}),
 };
}

export function normalizeMatch(id,body,champions){
 const info=body?.info;
 if(!info||body.metadata?.matchId!==id||!Array.isArray(info.teams)||!Array.isArray(info.participants)||typeof info.gameVersion!=='string'||!Number.isFinite(info.gameCreation))throw Error('Respuesta de partida inválida de Riot.');
 const patch=info.gameVersion.split('.').slice(0,2).join('.'),date=info.gameCreation;
 const reject=reason=>({patch,date,data:null,reason});
 if(info.queueId!==420)return reject('Otra cola');
 if(!Number.isFinite(info.gameDuration)||info.gameDuration<900)return reject('Menos de 15 minutos');
 const roles={TOP:'TOP',JUNGLE:'JGL',MIDDLE:'MID',BOTTOM:'ADC',UTILITY:'SUP'};
 if(info.teams.length!==2||info.participants.length!==10)return reject('Equipos incompletos');
 const teams=info.teams.map(t=>({win:t.win,bans:(t.bans??[]).map(b=>champions[b.championId]).filter(Boolean),picks:info.participants.filter(p=>p.teamId===t.teamId).map(p=>({champion:champions[p.championId],role:roles[p.teamPosition]}))}));
 if(teams.some(t=>typeof t.win!=='boolean'||t.picks.length!==5||t.picks.some(p=>!p.champion||!p.role)||new Set(t.picks.map(p=>p.role)).size!==5))return reject('Rol o campeón sin identificar');
 return {patch,date,data:{id,date,teams},reason:null};
}
