import assert from 'node:assert/strict';
import {teamPlan,advanceRival,banSuggestions,synergy,applyChoice,assignments,byId,newDraft,newWorkspace,other,picks,roles,sequence,suggestions,unavailable} from '../lib/draft';
import {meta,count,edge,banSignal,matchesPatch} from '../lib/evidence';
import {workspaceSchema} from '../lib/validation';

for(const first of ['blue','red'] as const){
 let d=newDraft();d.first=first;const order=sequence(first);
 assert.equal(order.length,20);assert.equal(order[6].side,first);assert.equal(order[16].side,other(first));
 for(const side of ['blue','red'] as const){assert.equal(order.filter(t=>t.side===side&&t.kind==='pick').length,5);assert.equal(order.filter(t=>t.side===side&&t.kind==='ban').length,5);}
 const teams={blue:['Ornn','Vi','Ahri','Jinx','Nautilus'],red:['Garen','LeeSin','Orianna','Caitlyn','Leona']};
 const bans=['Aatrox','Akali','Anivia','Annie','Ashe','Azir','Bard','Braum','Brand','Blitzcrank'];let b=0;const counts={blue:0,red:0};
 for(const t of order)d=applyChoice(d,t.kind==='ban'?bans[b++]:teams[t.side][counts[t.side]++]);
 assert.equal(picks(d,'blue').length,5);assert.equal(unavailable(d).size,20);
 assert.throws(()=>applyChoice(d,'Zed'));
 assert(workspaceSchema.safeParse({...newWorkspace(),draft:d}).success);
 const next={...d,game:2,choices:[],previous:[...picks(d,'blue'),...picks(d,'red')].map(p=>p.champion)};
 assert.throws(()=>applyChoice(next,'Jinx'));assert.doesNotThrow(()=>applyChoice(next,'Aatrox'));
 assert(workspaceSchema.safeParse({...newWorkspace(),draft:next}).success);
 assert(!workspaceSchema.safeParse({...newWorkspace(),draft:{...next,choices:[{champion:'Jinx'}]}}).success);
}
assert(assignments([{champion:'Gragas'},{champion:'Ornn',role:'TOP'}]).some(a=>a[0]==='JGL'));
assert.equal(assignments([{champion:'Ornn',role:'TOP'},{champion:'Garen',role:'TOP'}]).length,0);
let w=newWorkspace();w.rosters.blue.MID.pool=['Ahri'];
w.draft.choices=[{champion:'Ahri'}];assert(!suggestions(w,'blue').some(s=>s.champion.id==='Ahri'));
w=newWorkspace();for(const r of roles)w.rosters.blue[r].pool=[{TOP:'Ornn',JGL:'Vi',MID:'Ahri',ADC:'Jinx',SUP:'Leona'}[r]];
assert.deepEqual(new Set(suggestions(w,'blue').map(s=>s.champion.id)),new Set(['Ornn','Vi','Ahri','Jinx','Leona']));
assert.equal(teamPlan(w).length,5);assert(teamPlan(w).every(p=>w.rosters.blue[p.role].pool.includes(p.champion)));
assert(!workspaceSchema.safeParse({...w,draft:{...w.draft,choices:[{champion:'__proto__'}]}}).success);
assert(!workspaceSchema.safeParse({...w,history:Array(101).fill(w.draft)}).success);
assert(!workspaceSchema.safeParse({...w,draft:{...w.draft,choices:[{champion:'Ahri'},{champion:'Ahri'}]}}).success);
assert(Object.hasOwn(byId,'Ahri'));
console.log('PASS: draft order, sides, 20 turns, role matching, pools, Fearless, import validation.');

assert(meta.games.length>0);assert.equal(new Set(meta.games.map(g=>g.id)).size,meta.games.length);
assert(matchesPatch(newDraft().patch));assert(!matchesPatch('1.0'));
const base=newWorkspace(),before=suggestions(base,'blue');
base.history=Array.from({length:20},()=>({...base.draft,id:crypto.randomUUID(),choices:[...Array(6).fill({champion:'Zed'}),{champion:'Amumu'}]}));
assert.deepEqual(suggestions(base,'blue'),before,'Practice drafts must never be statistical evidence');
base.draft.patch='1.0';assert(suggestions(base,'blue').every(r=>r.evidence===0));
assert(synergy('Vi','Ahri'));assert.equal(synergy('Vi','Ahri'),synergy('Ahri','Vi'));
assert.equal(edge('counter','missing','missing').value,0);
const predicted=newWorkspace();predicted.draft.choices=[{champion:'Teemo'},{champion:'Poppy'}];
assert(suggestions(predicted,'red','rival').find(r=>r.champion.id==='Vi')?.reasons.some(r=>r.includes('posible protección')));
const blueprint=teamPlan(newWorkspace());assert.equal(blueprint.length,5);assert.equal(new Set(blueprint.map(p=>p.role)).size,5);
assert(assignments(blueprint).length>0);
const withCarry=newWorkspace();withCarry.draft.choices=['Teemo','Aatrox','Akali','Annie','Ashe','Azir','Jinx'].map(champion=>({champion}));
assert(suggestions(withCarry,'blue').slice(0,3).some(r=>r.champion.id==='Lulu'),'The carry protection synergy must affect the leading recommendations');
for(const first of ['blue','red'] as const){
 const auto=newWorkspace();auto.draft.first=first;
 for(let turn=0;turn<20&&auto.draft.choices.length<20;turn++){
  auto.draft=advanceRival(auto);
  const step=sequence(first)[auto.draft.choices.length];if(!step)break;
  assert.equal(step.side,auto.draft.own);
  const rec=step.kind==='ban'?banSuggestions(auto,auto.draft.own)[0]:suggestions(auto,auto.draft.own)[0];
  assert(rec);auto.draft=applyChoice(auto.draft,rec.champion.id);
 }
 auto.draft=advanceRival(auto);assert.equal(auto.draft.choices.length,20);assert(workspaceSchema.safeParse(auto).success);
}
let conditions=0;
for(const champ of Object.keys(byId))for(const ban of Object.keys(byId)){
 const signal=banSignal(champ,[ban]);
 if(signal.signals.length){conditions++;assert(count(`after:${champ}:${ban}`).n>=5);assert(Number.isFinite(signal.value));}
}
assert(conditions>0,'Real data must provide at least one supported ban/pick association');
console.log(`PASS: real sample (${meta.games.length}), patch isolation, no training on simulations, synergy, automatic rival, ${conditions} supported ban/pick associations.`);
