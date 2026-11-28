import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createStore, defaultProfiles } from '../src/store.js';
import { DEFAULT_CONFIG, generateBaseTable, generateJobTables, simulatePlayers } from '../src/engines/progression.js';
import { validateBalance } from '../src/engines/validation.js';
import { renderDashboard } from '../src/pages/dashboard.js';
import { renderMonsters } from '../src/pages/monsters.js';
import { renderCombat } from '../src/pages/combat.js';
import { renderEconomy } from '../src/pages/economy.js';
import { renderProgression } from '../src/pages/progression.js';
import { renderAdmin } from '../src/pages/admin.js';

globalThis.requestAnimationFrame=()=>{};
const original=JSON.parse(await readFile(new URL('../public/data/aos-monsters-full.json',import.meta.url)));
const proposal=JSON.parse(await readFile(new URL('../public/data/monster-balance-proposed.json',import.meta.url)));
const store=createStore({original,proposal,config:structuredClone(DEFAULT_CONFIG)});
const monsters=store.activeMonsters(),base=generateBaseTable(monsters),jobs=generateJobTables(monsters,base),scenarios=simulatePlayers(base,jobs,DEFAULT_CONFIG);
const ctx={store,ui:{monsterId:'',profileId:'normal-f2p',partySize:1,partyDps:[],damageMode:'direct',encounterOverhead:0,physicalMitigation:0,magicalMitigation:0,minimumWindow:0,farmMode:'theoretical',farmDps:0,manualKpm:10,spawnModel:'uncapped',spawnCapacity:0,farmingUptime:null,aoeEnabled:false,bossOps:{travel:60,respawn:3600,competition:.5,eligible:1,share:.2},testMaxHit:0,testBurst3:0,testBurst5:0,testBurst10:0},original,proposal,monsters,config:DEFAULT_CONFIG,base,recommendedBase:base,jobs,scenarios,validation:validateBalance({original,monsters,base,jobs,scenarios,config:DEFAULT_CONFIG,proposal:proposal.records,profiles:defaultProfiles().combat})};

test('every major workbench page renders from the shared active model',()=>{
 const pages=[
  renderDashboard(ctx),renderMonsters(ctx,'all'),renderMonsters(ctx,'normal'),renderMonsters(ctx,'mvp'),renderMonsters(ctx,'abyss'),
  ...['power','profiles','ttk','stress','impact','impact-analysis'].map(x=>renderCombat(ctx,x)),
  ...['rewards','farming','maps','boss-rewards','gold'].map(x=>renderEconomy(ctx,x)),
  ...['base-exp','class1-exp','class2-exp','multi-client','comparison','battlepass'].map(x=>renderProgression(ctx,x)),
  ...['configuration','versions','validation','database','import-export','history','handoff'].map(x=>renderAdmin(ctx,x))
 ];
 assert.equal(pages.length,29);
 for(const html of pages)assert(typeof html==='string'&&html.length>300);
});
