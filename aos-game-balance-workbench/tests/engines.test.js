import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { calculateTtk, calculateBurstRisk, recommendedHp } from '../src/engines/combat.js';
import { calculateFarmingRate } from '../src/engines/farming.js';
import { partyAllocation } from '../src/engines/farming.js';
import { weightedMultiplier, calculateMonsterRewards } from '../src/engines/reward.js';
import { DEFAULT_CONFIG, generateBaseTable, generateJobTables, simulatePlayers } from '../src/engines/progression.js';
import { validateBalance } from '../src/engines/validation.js';
import { autoRebalance } from '../src/engines/progression.js';
import { createStore } from '../src/store.js';

const source=JSON.parse(await readFile(new URL('../public/data/aos-monsters-full.json',import.meta.url)));
const proposal=JSON.parse(await readFile(new URL('../public/data/monster-balance-proposed.json',import.meta.url)));
const monsters=source.monsters.map(m=>{const p=proposal.records[String(m.id)];if(p){for(const g of ['stats','attributes','rewards','metadata'])if(p[g])m[g]={...(m[g]||{}),...p[g]}}return m});

test('source integrity and proposal coverage',()=>{
 assert.equal(source.monsters.length,313);
 assert.equal(new Set(source.monsters.map(m=>String(m.id))).size,313);
 assert.equal(source.monsters.filter(m=>m.boss).length,29);
 assert.equal(source.monsters.filter(m=>!m.boss).length,284);
 assert.equal(Object.keys(proposal.records).length,313);
 assert.equal(proposal.records['10000069'].stats.hp,276000000);
});

test('TTK uses fixed HP and independent party DPS',()=>{
 const solo=calculateTtk({hp:276000000,party:[{effectiveDps:2000000}]});
 const party=calculateTtk({hp:276000000,party:Array.from({length:5},()=>({effectiveDps:6000000}))});
 assert.equal(solo.combatSeconds,138);
 assert.equal(party.combatSeconds,9.2);
 assert.equal(recommendedHp(60,2000000),120000000);
 assert.equal(calculateTtk({hp:10,party:[]}).valid,false);
});

test('burst validation is independent from average TTK',()=>{
 const risk=calculateBurstRisk({hp:1000,maxHit:1001});
 assert.equal(risk.oneShot,true);
 assert.equal(risk.status,'WARNING');
});

test('farming respects spawn cap and manual mode',()=>{
 const monster=monsters.find(m=>!m.boss);
 const profile={effectiveDps:100000};
 const open=calculateFarmingRate({monster,profile,config:{combatOverheadSeconds:0,movementSeconds:0,acquisitionSeconds:0,lootingSeconds:0,farmingUptime:1}});
 const capped=calculateFarmingRate({monster,profile,config:{combatOverheadSeconds:0,movementSeconds:0,acquisitionSeconds:0,lootingSeconds:0,farmingUptime:1,spawnCapacityOverride:12}});
 assert(capped.killsPerHour<=12);
 assert(open.killsPerHour>capped.killsPerHour);
 const manual=calculateFarmingRate({monster,profile,config:{manualMode:true,manualKillsPerMinute:7}});
 assert.equal(manual.killsPerHour,420);
});

test('boost uptime is weighted once and reward rates use active monster rewards',()=>{
 assert.equal(weightedMultiplier(2.1,.5),1.55);
 const m=monsters.find(x=>!x.boss);
 const r=calculateMonsterRewards({monster:m,killsPerHour:60,baseShare:.5});
 assert.equal(r.baseExpPerHour,60*m.rewards.baseExp*.5);
 assert.equal(r.jobExpPerHour,60*m.rewards.jobExp*.5);
});

test('generated tables are integer, cumulative and meet modeled fastest target',()=>{
 const cfg={...DEFAULT_CONFIG,manualMode:true,manualKillsPerMinute:10,minimumModeledHours:96,multiClientEfficiency:1.5,expMultiplier:2.1,expBoostUptime:1};
 const base=generateBaseTable(monsters,cfg);
 const jobs=generateJobTables(monsters,base,cfg);
 assert.equal(base.rows.length,149);
 assert.equal(jobs.class1.rows.length,49);
 assert.equal(jobs.class2.rows.length,69);
 for(const model of [base.rows,jobs.class1.rows,jobs.class2.rows]){
  let cumulative=0;
  for(const r of model){assert(Number.isInteger(r.requiredExp));cumulative+=r.requiredExp;assert.equal(r.cumulativeExp,cumulative)}
 }
 assert.equal(base.totalExp,base.rows.reduce((s,x)=>s+x.requiredExp,0));
 assert(Math.abs(base.fastestHours-96)<.02);
 assert.equal(base.rows.at(-1).nextLevel,150);
 assert(base.rows.every((r,i,a)=>!i||r.requiredExp>=a[i-1].requiredExp));
 assert(base.rows.slice(1).every((r,i)=>r.requiredExp<=base.rows[i].requiredExp*2));
 const scenarios=simulatePlayers(base,jobs,cfg);
 assert(Math.abs(scenarios.at(-1).baseCompletionHours-96)<.02);
 assert.equal(scenarios.at(-1).hoursPerDay,24);
});

test('shared data changes flow through TTK and farming while boss HP stays fixed by party size',()=>{
 const m=monsters.find(x=>!x.boss),p={effectiveDps:100000};
 const before=calculateFarmingRate({monster:m,profile:p,config:{combatOverheadSeconds:1,farmingUptime:1}});
 const changed=structuredClone(m);changed.stats.hp*=2;
 const after=calculateFarmingRate({monster:changed,profile:p,config:{combatOverheadSeconds:1,farmingUptime:1}});
 assert(after.cycleSeconds>before.cycleSeconds);
 assert(after.killsPerHour<before.killsPerHour);
 const expBefore=m.rewards.baseExp;changed.rewards.baseExp=expBefore+50;
 assert.equal(calculateMonsterRewards({monster:changed,killsPerHour:60}).baseExpPerHour,60*(expBefore+50));
 const boss=monsters.find(x=>x.boss),hp=boss.stats.hp;
 assert.equal(calculateTtk({hp,party:[{effectiveDps:1000}]}).totalDps,1000);
 assert.equal(calculateTtk({hp,party:Array.from({length:5},()=>({effectiveDps:1000}))}).totalDps,5000);
 assert.equal(boss.stats.hp,hp);
});

test('explicit party shares disable simplified client efficiency and report per-character allocation',()=>{
 const result=partyAllocation({expPerKill:120,partySize:3,partyBonus:1,shares:[.5,.3,.2],clientEfficiency:3,explicitParty:true});
 assert.deepEqual(result.allocations,[60,36,24]);
 assert.equal(result.fastestCharacterExp,60);
 assert.equal(result.totalGeneratedExp,120);
});

test('auto rebalance previews a bounded integer table and respects locked levels',()=>{
 const base=generateBaseTable(monsters,{...DEFAULT_CONFIG,manualMode:true,manualKillsPerMinute:10});
 const slower={...base,fastestHours:80};
 const preview=autoRebalance(slower,{...DEFAULT_CONFIG,minimumModeledHours:96});
 assert.equal(preview.feasible,true);
 assert.equal(preview.targetHours,96);
 assert(preview.recommended.every(x=>Number.isInteger(x.requiredExp)));
 assert(preview.scale>1);
 const locked=autoRebalance(slower,{...DEFAULT_CONFIG,lockedLevels:[1]});
 assert.equal(locked.feasible,false);
});

test('project versions restore source, config and custom overrides',()=>{
 const project=createStore({original:source,proposal,config:structuredClone(DEFAULT_CONFIG)});
 const id=String(source.monsters[0].id),baseHp=project.activeMonsters().find(m=>String(m.id)===id).stats.hp;
 project.edit(id,['stats','hp'],baseHp+99);
 assert.equal(project.activeMonsters().find(m=>String(m.id)===id).stats.hp,baseHp+99);
 project.undo();
 assert.equal(project.activeMonsters().find(m=>String(m.id)===id).stats.hp,baseHp);
 assert.equal(Object.keys(project.getState().custom).length,0);
 project.updateConfig('dailyHours',9);
 const version=project.saveVersion('test snapshot');
 project.updateConfig('dailyHours',3);
 project.loadVersion(version);
 assert.equal(project.getState().config.dailyHours,9);
 assert.equal(project.getState().original.monsters.length,313);
});

test('validation separates pass and assumed inputs',()=>{
 const cfg={...DEFAULT_CONFIG,manualMode:true,manualKillsPerMinute:10};
 const base=generateBaseTable(monsters,cfg),jobs=generateJobTables(monsters,base,cfg),scenarios=simulatePlayers(base,jobs,cfg);
 const validation=validateBalance({original:source,monsters,base,jobs,scenarios,config:cfg,proposal:proposal.records,profiles:[]});
 assert(validation.some(x=>x.message.includes('Fastest modeled character')));
 assert(validation.some(x=>x.message.includes('spawn capacity is missing')));
 assert(validation.some(x=>x.status==='PASS'&&x.message.includes('unique')));
});
