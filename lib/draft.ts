import raw from '../public/data/champions.json';
import {meta,count,edge,banSignal,matchesPatch} from './evidence';
export const roles = ['TOP', 'JGL', 'MID', 'ADC', 'SUP'] as const;
export type Role = typeof roles[number];
export type Side = 'blue' | 'red';
export const roleNames: Record<Role,string> = { TOP: 'Top', JGL: 'Jungla', MID: 'Mid', ADC: 'ADC', SUP: 'Soporte' };
const lanes: Record<Role,string> = {
 TOP: 'Aatrox Akali Ambessa Aurora Camille Chogath Darius DrMundo Fiora Gangplank Garen Gnar Gragas Gwen Heimerdinger Illaoi Irelia Jax Jayce Kayle Kennen Kled KSante Malphite Maokai Mordekaiser Nasus Olaf Ornn Pantheon Poppy Quinn Renekton Rengar Riven Rumble Sett Shen Singed Sion TahmKench Teemo Trundle Tryndamere Urgot Vayne Vladimir Volibear Warwick MonkeyKing Yasuo Yone Yorick',
 JGL: 'Amumu Belveth Brand Briar Diana DrMundo Ekko Elise Evelynn Fiddlesticks Gragas Graves Gwen Hecarim Ivern JarvanIV Jax Karthus Kayn Khazix Kindred LeeSin Lillia MasterYi Maokai Morgana Naafiri Nidalee Nocturne Nunu Olaf Pantheon Poppy Rammus RekSai Rengar Sejuani Shaco Shyvana Skarner Sylas Taliyah Talon Trundle Udyr Vi Viego Volibear Warwick MonkeyKing XinZhao Zac Zed Zyra',
 MID: 'Ahri Akali Akshan Anivia Annie AurelionSol Aurora Azir Brand Cassiopeia Chogath Corki Diana Ekko Fizz Galio Gragas Heimerdinger Hwei Irelia Jayce Karma Kassadin Katarina Kennen Leblanc Lissandra Lucian Lux Malphite Malzahar Mel Naafiri Neeko Orianna Pantheon Qiyana Ryze Seraphine Smolder Swain Sylas Syndra Taliyah Talon Tristana TwistedFate Veigar Velkoz Vex Viktor Vladimir Xerath Yasuo Yone Zed Ziggs Zoe',
 ADC: 'Aphelios Ashe Caitlyn Corki Draven Ezreal Jhin Jinx Kaisa Kalista KogMaw Lucian MissFortune Nilah Samira Senna Seraphine Sivir Smolder Swain Tristana Twitch Varus Vayne Xayah Yasuo Zeri Ziggs',
 SUP: 'Alistar Amumu Ashe Bard Blitzcrank Braum Brand Galio Heimerdinger Hwei Ivern Janna Karma Leona Lulu Lux Maokai Milio Morgana Nami Nautilus Neeko Pantheon Poppy Pyke Rakan Rell Renata Senna Seraphine Shaco Shen Sona Soraka Swain TahmKench Taric Thresh Velkoz Xerath Yuumi Zilean Zyra',
};
const engage = new Set('Alistar Amumu Annie Ashe Diana Galio Gragas Hecarim JarvanIV Kennen Leona Lissandra Malphite Maokai Nautilus Neeko Nocturne Nunu Ornn Rakan Rell Sejuani Sion Skarner Vi MonkeyKing Zac'.split(' '));
const frontline = new Set('Alistar Amumu Braum Chogath DrMundo Galio Gnar KSante Leona Malphite Maokai Nautilus Nunu Ornn Poppy Rammus Rell Sejuani Sett Shen Sion Skarner TahmKench Taric Udyr Volibear Zac'.split(' '));
const protectedCarry=new Set('Aphelios Jinx KogMaw Smolder Twitch Vayne Zeri'.split(' '));
const peel=new Set('Braum Janna Lulu Milio Renata TahmKench Taric'.split(' '));
const poke=new Set('Caitlyn Ezreal Hwei Jayce Lux Varus Xerath Ziggs Zoe'.split(' '));
const areaFollowup=new Set('Diana Hwei Kennen MissFortune Orianna Rumble Samira Viktor Yasuo Yone'.split(' '));
export type Champion = { id: string; key: string; name: string; roles: Role[]; tags: string[]; engage: boolean; frontline: boolean; magic: boolean; image: string };
export const patch = raw.version;
export const champions: Champion[] = Object.values(raw.data).map(c => ({ id:c.id, key:c.key, name:c.name, tags:c.tags, roles:roles.filter(r=>lanes[r].split(' ').includes(c.id)||(count(`role:${c.id}:${r}`).n>=5&&count(`role:${c.id}:${r}`).n>=count(`pick:${c.id}`).n*0.15)), engage:engage.has(c.id), frontline:frontline.has(c.id), magic:c.tags.includes('Mage'), image:`https://ddragon.leagueoflegends.com/cdn/${patch}/img/champion/${c.image.full}` })).sort((a,b)=>a.name.localeCompare(b.name));
export const byId = Object.fromEntries(champions.map(c=>[c.id,c])) as Record<string,Champion>;
export type Choice = { champion: string; role?: Role };
export type Draft = { id:string; name:string; blue:string; red:string; own:Side; first:Side; format:1|3|5; fearless:boolean; game:number; patch:string; choices:Choice[]; previous:string[]; notes:string };
export type Player = { name:string; riotId:string; pool:string[] };
export type Roster = Record<Role,Player>;
export type Workspace = { draft:Draft; rosters:Record<Side,Roster>; history:Draft[] };
export function newRoster():Roster { const player=()=>({name:'',riotId:'',pool:[] as string[]});return {TOP:player(),JGL:player(),MID:player(),ADC:player(),SUP:player()}; }
export function newDraft():Draft { return {id:crypto.randomUUID(),name:'Preparación de scrim',blue:'Mi equipo',red:'Equipo rival',own:'blue',first:'blue',format:3,fearless:true,game:1,patch,choices:[],previous:[],notes:''}; }
export function newWorkspace():Workspace { return {draft:newDraft(),rosters:{blue:newRoster(),red:newRoster()},history:[]}; }
export function other(side:Side):Side { return side==='blue'?'red':'blue'; }
// Order follows first/second pick, independently of map side.
export function sequence(first:Side) { const second=other(first); return [
 ...[first,second,first,second,first,second].map(side=>({side,kind:'ban' as const})),
 ...[first,second,second,first,first,second].map(side=>({side,kind:'pick' as const})),
 ...[second,first,second,first].map(side=>({side,kind:'ban' as const})),
 ...[second,first,first,second].map(side=>({side,kind:'pick' as const})),
 ]; }
export function picks(draft:Draft,side:Side) { const order=sequence(draft.first); return draft.choices.filter((_,i)=>order[i]?.side===side&&order[i]?.kind==='pick'); }
export function unavailable(draft:Draft) { return new Set([...draft.choices.map(c=>c.champion),...(draft.fearless?draft.previous:[])]); }
// Five slots only: exhaustive matching preserves flex picks without a solver dependency.
export function assignments(choices:Choice[], roster?:Roster):Role[][] {
 const result:Role[][]=[];
 function walk(i:number,used:Role[]) { if(i===choices.length){result.push(used);return;} const choice=choices[i]; const c=byId[choice.champion]; if(!c)return;
 const possible=choice.role?[choice.role]:c.roles.length?c.roles:[...roles];
 for(const r of possible) if(!used.includes(r)&&(!roster||!roster[r].pool.length||roster[r].pool.includes(c.id))) walk(i+1,[...used,r]); }
 walk(0,[]); return result;
}
export function canPick(draft:Draft,id:string,side:Side,role?:Role) { return !!byId[id]&&!unavailable(draft).has(id)&&assignments([...picks(draft,side),{champion:id,role}]).length>0; }
export function applyChoice(draft:Draft,id:string):Draft { const turn=sequence(draft.first)[draft.choices.length]; if(!turn||!byId[id]||unavailable(draft).has(id))throw new Error('Este campeón no está disponible.'); if(turn.kind==='pick'&&!canPick(draft,id,turn.side))throw new Error('No quedan roles compatibles. Revisa las asignaciones.'); return {...draft,choices:[...draft.choices,{champion:id}]}; }
// Named interactions are tactical rules, never presented as measured win rates.
const combos:[string,string,string][]=[
 ['JarvanIV','Orianna','Entrega de la esfera + Cataclismo para la onda de choque'],
 ['Malphite','Yasuo','Derribo en área para habilitar la definitiva de Yasuo'],
 ['Diana','Yasuo','Atracción y derribo para encadenar definitivas'],
 ['MonkeyKing','Yasuo','Ciclón habilita la definitiva de Yasuo'],
 ['Vi','Ahri','Iniciación dirigida y seguimiento para cazar al carry'],
 ['Nocturne','Galio','Acceso a la retaguardia con seguimiento de Galio'],
 ['Camille','Galio','Encierro de Camille y entrada de Galio'],
 ['Lucian','Nami','Empoderamiento y presión coordinada de bot'],
 ['Caitlyn','Lux','Control a distancia y trampas para presionar bot'],
 ['Xayah','Rakan','Iniciación y protección coordinadas en bot'],
 ['KogMaw','Lulu','Protección y velocidad de ataque para el carry'],
 ['Jinx','Lulu','Protección para conseguir el primer reset'],
 ['Zeri','Lulu','Protección y movilidad para extender las peleas'],
 ['Samira','Rell','Control en área para facilitar la entrada de Samira'],
 ['MissFortune','Amumu','Control en área para canalizar la definitiva'],
 ['MissFortune','Leona','Inmovilización para mantener al rival en la definitiva'],
 ['Kalista','Renata','Herramientas coordinadas para iniciar y prolongar peleas'],
 ['Sejuani','Renekton','Aliado cuerpo a cuerpo para acumular el control de Sejuani'],
 ['Sejuani','Yone','Control de Sejuani con seguimiento cuerpo a cuerpo y daño en área de Yone'],
 ['Maokai','Jayce','Control de espacio para conectar poke antes de entrar'],
 ['Varus','Karma','Presión a distancia y control del espacio'],
];
export function synergy(a:string,b:string){return combos.find(([x,y])=>(x===a&&y===b)||(x===b&&y===a))?.[2];}
export function counterReason(counter:string,target:string){
 const rules:[string,string,string][]=[
  ['Poppy','LeeSin Vi JarvanIV Camille Rakan Yasuo Irelia','Puede cortar sus desplazamientos con Presencia inalterable'],
  ['Braum','MissFortune Lucian Ornn','Puede interceptar proyectiles clave con su escudo'],
  ['Janna','Rell Leona Alistar Rakan','Tiene herramientas para interrumpir y separar la iniciación'],
  ['Morgana','Leona Nautilus Blitzcrank Thresh','Escudo negro puede negar el control que abre la pelea'],
  ['Trundle','Sejuani Rammus Ornn Malphite','Su definitiva reduce la resistencia de la primera línea'],
  ['TahmKench','Vi Ashe','Puede rescatar al objetivo de una iniciación dirigida'],
 ];
 return rules.find(([id,targets])=>id===counter&&targets.split(' ').includes(target))?.[2];
}
export function bans(d:Draft,side:Side){const order=sequence(d.first);return d.choices.filter((_,i)=>order[i]?.side===side&&order[i]?.kind==='ban').map(c=>c.champion);}
export type Suggestion = {champion:Champion; score:number; reasons:string[]; evidence:number; possibleRoles:Role[]};
export function suggestions(w:Workspace,side:Side,mode:'pick'|'rival'='pick',planned?:Choice[]):Suggestion[] {
 const chosen=planned??picks(w.draft,side),roster=w.rosters[side],current=chosen.map(x=>byId[x.champion]);
 const real=matchesPatch(w.draft.patch),enemy=picks(w.draft,other(side));
 return champions.filter(c=>!unavailable(w.draft).has(c.id)&&!chosen.some(p=>p.champion===c.id)&&assignments([...chosen,{champion:c.id}]).length>0).map(c=>{
 const valid=assignments([...chosen,{champion:c.id}],roster),possibleRoles=[...new Set(valid.map(a=>a[a.length-1]))];
 const inPool=possibleRoles.some(r=>roster[r].pool.includes(c.id));
 const sample=real?count(`pick:${c.id}`):{n:0,wins:0};
 const evidence=sample.n,reasons:string[]=[];let score=0;
 if(inPool){score+=25;reasons.push('En el pool confirmado de un rol disponible');}
 if(real&&evidence){
  const roleSamples=possibleRoles.reduce((n,r)=>n+count(`role:${c.id}:${r}`).n,0);
  const bestRoleSamples=Math.max(0,...possibleRoles.map(r=>count(`role:${c.id}:${r}`).n));
  score+=100*bestRoleSamples/Math.max(1,meta.games.length)+20*(sample.wins-evidence/2)/(evidence+40);
  score+=10*roleSamples/(evidence+10);
  reasons.push(`${evidence} picks reales · ${sample.wins} victorias · ${roleSamples} en roles disponibles (muestra LAS)`);
 }
 for(const ally of current){
  const combo=synergy(c.id,ally.id);if(combo){score+=20;reasons.unshift(`Sinergia táctica con ${ally.name}: ${combo}`);}
  if(real){const pair=edge('pair',c.id,ally.id);score+=70*pair.value;if(pair.n>=5)reasons.push(`${pair.n} partidas junto a ${ally.name}: asociación ${pair.value>0?'favorable':'neutra o desfavorable'} ajustada por muestra`);}
 }
 if(current.length&&c.frontline&&!current.some(x=>x.frontline)){score+=8;reasons.push('Cubre la primera línea que falta');}
 if(current.length&&c.engage&&!current.some(x=>x.engage)){score+=8;reasons.push('Añade una forma de iniciar');}
 if(c.magic&&current.length&&!current.some(x=>x.magic)){score+=6;reasons.push('Diversifica el daño con perfil mágico');}
 if(current.filter(x=>x.frontline).length>=2&&c.frontline)score-=12;
 if(current.some(x=>x.engage)&&areaFollowup.has(c.id)){score+=10;reasons.unshift('Plan de equipo: seguir la iniciación aliada con daño en área');}
 if(current.some(x=>areaFollowup.has(x.id))&&c.engage&&!current.some(x=>x.engage)){score+=10;reasons.unshift('Prepara la entrada para el daño en área de tus aliados');}
 if(current.some(x=>protectedCarry.has(x.id))&&peel.has(c.id)){score+=10;reasons.unshift('Plan de equipo: proteger al carry y extender la pelea');}
 if(current.some(x=>poke.has(x.id))&&poke.has(c.id)){score+=6;reasons.push('Plan de equipo: desgastar antes de disputar el objetivo');}
 if(current.some(x=>poke.has(x.id))&&peel.has(c.id)){score+=6;reasons.push('Protección para mantener distancia mientras desgastan');}
 for(const rival of enemy){const counter=counterReason(c.id,rival.champion);if(counter){score+=9;reasons.unshift(`Respuesta táctica a ${byId[rival.champion].name}: ${counter}`);}}
 if(real)for(const rival of enemy){const matchup=edge('counter',c.id,rival.champion);score+=60*matchup.value;if(matchup.n>=5)reasons.push(`${matchup.n} cruces de línea contra ${byId[rival.champion].name}: señal ${matchup.value>0?'favorable':'neutra o desfavorable'}`);}
 if(mode==='rival'&&real){
  const signal=banSignal(c.id,bans(w.draft,side));score+=100*signal.value;
  for(const s of signal.signals)reasons.unshift(`Tras banear ${byId[s.ban].name}: ${s.n} equipos lo eligieron; señal ${s.value>0?'positiva':'negativa'} (Solo/Duo)`);
  // A ban can remove a difficult lane opponent; this remains an inference.
  for(const ban of bans(w.draft,side)){const protection=edge('counter',ban,c.id);if(protection.value>0){score+=40*protection.value;reasons.push(`Su ban de ${byId[ban].name} puede proteger este pick (${protection.n} cruces)`);}}
 }
 if(mode==='rival')for(const ban of bans(w.draft,side)){const protection=counterReason(ban,c.id);if(protection){score+=7;reasons.unshift(`Su ban de ${byId[ban].name} elimina una respuesta táctica a ${c.name}; posible protección, no intención confirmada`);}}
 if(!reasons.length)reasons.push('Compatible por roles; sin evidencia suficiente en esta muestra');
 return {champion:c,score,reasons,evidence,possibleRoles};
 }).filter(s=>s.possibleRoles.length>0).sort((a,b)=>b.score-a.score||a.champion.name.localeCompare(b.champion.name));
}
export function banSuggestions(w:Workspace,side:Side):Suggestion[]{
 const enemy=other(side),real=matchesPatch(w.draft.patch);
 const core=picks(w.draft,side).map(p=>p.champion);
 const planned=core.length?core:suggestions(w,side).slice(0,3).map(r=>r.champion.id);
 return suggestions(w,enemy,'rival').map(r=>{
  const reasons=[...r.reasons];let score=r.score;
  for(const id of planned){const counter=counterReason(r.champion.id,id);if(counter){score+=18;reasons.unshift(`Ban de protección contra ${byId[id].name}${core.length?'':' (opción prevista)'}: ${counter} (criterio táctico)`);}}
  if(real){const n=count(`ban:${r.champion.id}`).n;score+=45*n/Math.max(1,meta.games.length*2);if(n)reasons.unshift(`${n} bans reales en ${meta.games.length} partidas de la muestra`);
   for(const id of planned){const threat=edge('counter',r.champion.id,id);if(threat.value>0){score+=100*threat.value;reasons.unshift(`Posible counter de ${byId[id].name}${core.length?'':' (opción prevista)'}: ${threat.n} cruces de línea`);}}
  }
  if(roles.some(role=>w.rosters[side][role].pool.includes(r.champion.id))){score-=15;reasons.push('También está en tu pool: el ban tiene un coste para tu equipo');}
  return {...r,score,reasons};
 }).sort((a,b)=>b.score-a.score||a.champion.name.localeCompare(b.champion.name));
}
export function advanceRival(w:Workspace):Draft{
 let draft=w.draft;
 // At most 20 decisions; simulated choices never become training evidence.
 for(let i=0;i<20;i++){
  const turn=sequence(draft.first)[draft.choices.length];if(!turn||turn.side===draft.own)break;
  const next=turn.kind==='ban'?banSuggestions({...w,draft},turn.side)[0]:suggestions({...w,draft},turn.side,'rival')[0];
  if(!next)break;draft=applyChoice(draft,next.champion.id);
 }
 return draft;
}
export function compositionPlan(draft:Draft,side:Side){
 const cs=picks(draft,side).map(p=>p.champion),lines:string[]=[];
 for(let i=0;i<cs.length;i++)for(let j=i+1;j<cs.length;j++){const s=synergy(cs[i],cs[j]);if(s)lines.push(`${byId[cs[i]].name} + ${byId[cs[j]].name}: ${s}`);}
 if(cs.some(c=>protectedCarry.has(c)))lines.push(cs.some(c=>peel.has(c))?'Plan: conservar recursos de protección para el carry y jugar peleas prolongadas.':'Necesidad: añadir protección para que el carry pueda mantener el daño.');
 if(cs.filter(c=>poke.has(c)).length>=2)lines.push('Plan: controlar visión y desgastar antes de iniciar; evitar entrar con el rival a vida completa.');
 if(!lines.length)lines.push('Aún no hay una combinación específica identificada. Busca un núcleo de dos campeones que compartan plan.');
 return lines;
}
export function teamPlan(w:Workspace){
 const selected=[...picks(w.draft,w.draft.own)];
 for(let i=selected.length;i<5;i++){const best=suggestions(w,w.draft.own,'pick',selected)[0];if(!best)break;const role=[...best.possibleRoles].sort((a,b)=>matchesPatch(w.draft.patch)?count(`role:${best.champion.id}:${b}`).n-count(`role:${best.champion.id}:${a}`).n:0)[0];selected.push({champion:best.champion.id,role});}
 const matching=assignments(selected,w.rosters[w.draft.own]).sort((a,b)=>matchesPatch(w.draft.patch)?selected.reduce((total,p,i)=>total+count(`role:${p.champion}:${b[i]}`).n-count(`role:${p.champion}:${a[i]}`).n,0):0)[0];
 return matching?selected.map((p,i)=>({...p,role:matching[i],confirmed:i<picks(w.draft,w.draft.own).length})):[];
}
export function composition(draft:Draft,side:Side) {const cs=picks(draft,side).map(p=>byId[p.champion]); return [{name:'Primera línea',value:cs.filter(c=>c.frontline).length},{name:'Iniciación',value:cs.filter(c=>c.engage).length},{name:'Perfil mágico',value:cs.filter(c=>c.magic).length}];}

