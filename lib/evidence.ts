import snapshot from '../public/data/meta.json';

type Pick={champion:string;role:string};
type Team={win:boolean;bans:string[];picks:Pick[]};
type Game={id:string;date:number;teams:Team[]};
export const meta=snapshot as {source:string;url:string;region:string;queue:string;sampling:string;patch:string;collectedAt:string;games:Game[]};
type Count={n:number;wins:number};
const counts=new Map<string,Count>();
function add(key:string,win:boolean){const x=counts.get(key)??{n:0,wins:0};x.n++;x.wins+=Number(win);counts.set(key,x);}
export function count(key:string):Count{return counts.get(key)??{n:0,wins:0};}
export function matchesPatch(patch:string){return patch.split('.').slice(0,2).join('.')===meta.patch;}
for(const game of meta.games){
 for(const [index,team] of game.teams.entries()){
  const enemy=game.teams[1-index];
  for(const ban of new Set(team.bans))add(`ban:${ban}`,team.win);
  for(const p of team.picks){
   add(`pick:${p.champion}`,team.win);add(`role:${p.champion}:${p.role}`,team.win);
   for(const ally of team.picks)if(ally!==p)add(`pair:${p.champion}:${ally.champion}`,team.win);
   for(const rival of enemy.picks)if(rival.role===p.role)add(`counter:${p.champion}:${rival.champion}`,team.win);
   for(const ban of new Set(team.bans))add(`after:${p.champion}:${ban}`,team.win);
  }
 }
}
// Shrink small samples toward each champion's baseline; association is not causation.
export function edge(kind:'pair'|'counter',a:string,b:string){
 const x=count(`${kind}:${a}:${b}`);
 if(x.n<5)return {n:x.n,value:0};
 const aBase=count(`pick:${a}`),bBase=count(`pick:${b}`);
 const aw=(aBase.wins+20)/(aBase.n+40),bw=(bBase.wins+20)/(bBase.n+40);
 const expected=kind==='pair'?(aw+bw)/2:0.5+(aw-bw)/2;
 return {n:x.n,value:(x.wins-x.n*expected)/(x.n+30)};
}
export function banSignal(champion:string,bans:string[]){
 let value=0;const signals:{ban:string;n:number;value:number}[]=[];
 for(const ban of bans){
  const joint=count(`after:${champion}:${ban}`).n,total=count(`ban:${ban}`).n;
  if(joint<5||total<10)continue;
  const prior=count(`pick:${champion}`).n/Math.max(1,meta.games.length*2);
  const delta=(joint-total*prior)/(total+40);
  signals.push({ban,n:joint,value:delta});value+=delta;
 }
 return {value:Math.max(-0.2,Math.min(0.2,value)),signals};
}
