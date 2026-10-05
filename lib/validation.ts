import {z} from 'zod';
import {byId, roles, sequence, assignments, picks} from './draft';
const champion=z.string().refine(v=>Object.hasOwn(byId,v),'Campeón desconocido');
const role=z.enum(roles);
const player=z.object({name:z.string().max(60),riotId:z.string().max(100),pool:z.array(champion).max(50).refine(a=>new Set(a).size===a.length)}).strict();
const roster=z.object({TOP:player,JGL:player,MID:player,ADC:player,SUP:player}).strict();
export const draftSchema=z.object({id:z.string().uuid(),name:z.string().min(1).max(100),blue:z.string().min(1).max(60),red:z.string().min(1).max(60),own:z.enum(['blue','red']),first:z.enum(['blue','red']),format:z.union([z.literal(1),z.literal(3),z.literal(5)]),fearless:z.boolean(),game:z.number().int().min(1).max(5),patch:z.string().regex(/^\d{1,2}\.\d{1,2}(?:\.\d{1,2})?$/),choices:z.array(z.object({champion,role:role.optional()}).strict()).max(20),previous:z.array(champion).max(40),notes:z.string().max(4000)}).strict().superRefine((d,ctx)=>{
 if(d.game>d.format||d.previous.length>(d.game-1)*10||new Set(d.previous).size!==d.previous.length)ctx.addIssue({code:'custom',message:'Serie inválida'});
 if(new Set(d.choices.map(c=>c.champion)).size!==d.choices.length)ctx.addIssue({code:'custom',message:'Campeón repetido'});
 if(d.fearless&&d.choices.some(c=>d.previous.includes(c.champion)))ctx.addIssue({code:'custom',message:'Campeón restringido por Fearless'});
 if(d.choices.some((c,i)=>c.role&&sequence(d.first)[i].kind==='ban'))ctx.addIssue({code:'custom',message:'Un ban no tiene rol'});
 for(const side of ['blue','red'] as const)if(!assignments(picks(d,side)).length)ctx.addIssue({code:'custom',message:'Roles incompatibles'});
});
export const workspaceSchema=z.object({draft:draftSchema,rosters:z.object({blue:roster,red:roster}).strict(),history:z.array(draftSchema).max(100)}).strict();
