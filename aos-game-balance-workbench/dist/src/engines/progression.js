import { calculateFarmingRate } from './farming.js';
import { calculateMonsterRewards, weightedMultiplier } from './reward.js';

export const TARGET_BRACKETS = [
  { from: 1, to: 11, hours: 1 }, { from: 11, to: 26, hours: 2 }, { from: 26, to: 51, hours: 6 },
  { from: 51, to: 76, hours: 12 }, { from: 76, to: 101, hours: 19 }, { from: 101, to: 121, hours: 25 },
  { from: 121, to: 131, hours: 20 }, { from: 131, to: 141, hours: 30 }, { from: 141, to: 150, hours: 35 }
];
export const POWER_CURVE = [
  { min: 1, max: 10, normal: 100, optimized: 200, fullBuff: 300 }, { min: 11, max: 25, normal: 600, optimized: 1200, fullBuff: 1800 },
  { min: 26, max: 50, normal: 2500, optimized: 5000, fullBuff: 7500 }, { min: 51, max: 75, normal: 10000, optimized: 20000, fullBuff: 30000 },
  { min: 76, max: 100, normal: 30000, optimized: 60000, fullBuff: 90000 }, { min: 101, max: 120, normal: 80000, optimized: 160000, fullBuff: 240000 },
  { min: 121, max: 130, normal: 150000, optimized: 300000, fullBuff: 450000 }, { min: 131, max: 140, normal: 300000, optimized: 600000, fullBuff: 900000 },
  { min: 141, max: 149, normal: 600000, optimized: 1200000, fullBuff: 1800000 }, { min: 150, max: 150, normal: 2000000, optimized: 4000000, fullBuff: 6000000 }
];
export const DEFAULT_CONFIG = {
  baseLevelCap: 150, class1JobCap: 50, class2JobCap: 70, maxClients: 3, maxExpMultiplier: 2.1, minimumModeledHours: 96, balancePreset:'controlled',
  dailyHours: 4, farmingUptime: 0.85, manualMode: false, manualKillsPerMinute: 10, spawnModel: 'uncapped', explicitPartyMode:false, partyShares:[0.333333,0.333333,0.333334], combatOverheadSeconds: 2,
  movementSeconds: 1.5, acquisitionSeconds: 0.5, lootingSeconds: 0.8, partyShare: 1, partyBonus: 1, multiClientEfficiency: 1.5,
  expMultiplier: 2.1, expBoostUptime: 1, baseTargetHours: 96 * 1.5 * 2.1, battlePassDays: 30, seasons: 4,
  syncMode: 'impact', safetyMarginHours: 0, levelDifferencePenalty: null, questExpContribution: 0,
  milestones: { class1: 48, class2: [{ job: 20, base: 65 }, { job: 40, base: 90 }, { job: 50, base: 105 }, { job: 60, base: 120 }, { job: 70, base: 135 }] },
  brackets: structuredClone(TARGET_BRACKETS), powerCurve: structuredClone(POWER_CURVE), lockedLevels: [],
  normalTtkTargets:[{from:1,to:10,normal:'2–4s',optimized:'1–2s'},{from:11,to:25,normal:'3–5s',optimized:'1–3s'},{from:26,to:50,normal:'3–6s',optimized:'1–3s'},{from:51,to:75,normal:'4–7s',optimized:'2–4s'},{from:76,to:100,normal:'4–8s',optimized:'2–4s'},{from:101,to:120,normal:'5–9s',optimized:'2–5s'},{from:121,to:130,normal:'5–10s',optimized:'2–5s'},{from:131,to:140,normal:'5–10s',optimized:'2–5s'},{from:141,to:149,normal:'5–12s',optimized:'2–6s'}]
};

export function generateBaseTable(monsters, config = DEFAULT_CONFIG, profiles = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const normal = monsters.filter(m => !m.boss && m.level <= cfg.baseLevelCap);
  if (!normal.length) throw new Error('Base EXP generation requires normal monsters at or below the configured level cap.');
  const explicitShare=cfg.explicitPartyMode?Math.max(1,Math.max(...(cfg.partyShares||[1]))*Number(cfg.partyBonus||1)):1;
  const multi = cfg.explicitPartyMode?explicitShare:Math.max(1, Number(cfg.multiClientEfficiency || 1));
  const boost = weightedMultiplier(cfg.expMultiplier, cfg.expBoostUptime, cfg.maxExpMultiplier);
  const fastestEfficiency = multi * boost;
  const targetWeights = expandWeights(cfg.brackets, cfg.baseLevelCap);
  const totalWeights = targetWeights.reduce((s, x) => s + x, 0);
  const fastestTarget = Number(cfg.minimumModeledHours || 96) + Math.max(0, Number(cfg.safetyMarginHours || 0));
  let cumulative = 0, cumulativeSolo = 0, cumulativeFast = 0;
  const rows = [];
  for (let level = 1; level < cfg.baseLevelCap; level++) {
    const monster = referenceMonster(normal, level);
    const levelPower = powerAt(level, profiles.progression || cfg.powerCurve, 'normal');
    const profile = { effectiveDps: levelPower, damageUptime: 1 };
    const farmingCfg = { ...cfg, farmingUptime: cfg.farmingUptime, spawnModel: cfg.spawnModel };
    const farming = cfg.manualMode ? calculateFarmingRate({ monster, profile, config: farmingCfg }) : calculateFarmingRate({ monster, profile, config: farmingCfg });
    const distributionShare=cfg.explicitPartyMode?1:cfg.partyShare;
    const rewards = calculateMonsterRewards({ monster, killsPerHour: farming.killsPerHour, baseShare: distributionShare, jobShare: distributionShare, baseMultiplier: 1, jobMultiplier: 1, questBasePerHour: cfg.questExpContribution, questJobPerHour: 0 });
    const soloRate = rewards.baseExpPerHour;
    const optimizedPower = powerAt(level, profiles.progression || cfg.powerCurve, 'optimized');
    const maximumPower = powerAt(level, profiles.progression || cfg.powerCurve, 'fullBuff');
    const optimizedFarm = calculateFarmingRate({ monster, profile: { effectiveDps: optimizedPower, damageUptime: 1 }, config: farmingCfg });
    const maximumFarm = calculateFarmingRate({ monster, profile: { effectiveDps: maximumPower, damageUptime: 1 }, config: farmingCfg });
    const optimizedRate = calculateMonsterRewards({ monster, killsPerHour: optimizedFarm.killsPerHour, baseShare: distributionShare }).baseExpPerHour;
    const maximumProfileRate = calculateMonsterRewards({ monster, killsPerHour: maximumFarm.killsPerHour, baseShare: distributionShare }).baseExpPerHour;
    const maximumRate = maximumProfileRate * boost * multi;
    const targetHours = (targetWeights[level - 1] || 0) / Math.max(1, totalWeights) * fastestTarget;
    let exp = Math.max(1, Math.round(maximumRate * targetHours));
    if (cfg.expOverrides?.[level - 1] != null) exp = Math.max(1, Math.round(Number(cfg.expOverrides[level - 1])));
    if (cfg.lockedLevels?.includes(level) && profiles.previousRows?.[level - 1]) exp = profiles.previousRows[level - 1].requiredExp;
    cumulative += exp;
    const soloTime = soloRate > 0 ? exp / soloRate : Infinity;
    const fastestTime = maximumRate > 0 ? exp / maximumRate : Infinity;
    cumulativeSolo += soloTime; cumulativeFast += fastestTime;
    const effectiveTtk = monster.stats.hp > 0 && levelPower > 0 ? monster.stats.hp / levelPower : Infinity;
    rows.push({ currentLevel: level, nextLevel: level + 1, requiredExp: exp, cumulativeExp: cumulative, growthPct: rows.length ? (exp / rows.at(-1).requiredExp - 1) * 100 : null, referenceMonster: monster.name, referenceMonsterId: monster.id, monsterLevelRange: `${Math.min(...normal.map(m => m.level))}–${Math.max(...normal.map(m => m.level))}`, effectiveMonsterHp: monster.stats.hp, effectiveMonsterExp: monster.rewards.baseExp, effectiveMonsterJobExp: monster.rewards.jobExp, expectedTtkSeconds: effectiveTtk, effectiveKillRate: farming.killsPerHour, soloExpPerHour: soloRate, optimizedExpPerHour: optimizedRate, maximumProfileExpPerHour: maximumProfileRate, maximumExpPerHour: maximumRate, soloTimeHours: soloTime, fastestTimeHours: fastestTime, cumulativePlaytimeHours: cumulativeFast, completionDay: cumulativeFast / Math.max(1, cfg.dailyHours), battlePassSeason: Math.max(1, Math.ceil(cumulativeFast / Math.max(1, cfg.dailyHours * cfg.battlePassDays))), targetHours, farmingSource: farming.source, farmingWarning: farming.warning, goldPerHour: calculateMonsterRewards({ monster, killsPerHour: farming.killsPerHour }).goldPerHour });
  }
  if(!cfg.expOverrides){
    const fitted=smoothXpRequirements(rows.map(r=>r.requiredExp),rows.map(r=>r.maximumExpPerHour),fastestTarget);
    cumulative=0;cumulativeSolo=0;cumulativeFast=0;
    rows.forEach((r,i)=>{r.requiredExp=fitted[i];cumulative+=r.requiredExp;r.cumulativeExp=cumulative;r.growthPct=i?(r.requiredExp/rows[i-1].requiredExp-1)*100:null;r.soloTimeHours=r.soloExpPerHour?r.requiredExp/r.soloExpPerHour:Infinity;r.fastestTimeHours=r.maximumExpPerHour?r.requiredExp/r.maximumExpPerHour:Infinity;cumulativeSolo+=r.soloTimeHours;cumulativeFast+=r.fastestTimeHours;r.cumulativePlaytimeHours=cumulativeFast;r.completionDay=cumulativeFast/Math.max(1,cfg.dailyHours);r.battlePassSeason=Math.max(1,Math.ceil(cumulativeFast/Math.max(1,cfg.dailyHours*cfg.battlePassDays)))})
  }
  return { rows, totalExp: cumulative, soloHours: cumulativeSolo, fastestHours: cumulativeFast, targetSoloHours: cfg.baseTargetHours, fastestEfficiency, boostMultiplier: boost, brackets: cfg.brackets };
}

export function generateJobTables(monsters, baseModel, config = DEFAULT_CONFIG) {
  const normal = monsters.filter(m => !m.boss);
  const milestones = config.milestones || DEFAULT_CONFIG.milestones;
  const baseHours = level => baseModel.rows.filter(r => r.nextLevel <= level).reduce((s, r) => s + r.soloTimeHours, 0);
  const jobRateForBase = level => {
    const row = baseModel.rows[Math.max(0, Math.min(baseModel.rows.length - 1, Math.floor(level - 1)))];
    const m = monsters.find(x => String(x.id) === String(row.referenceMonsterId)) || referenceMonster(normal, level);
    const share=config.explicitPartyMode?Math.max(...(config.partyShares||[1])):Number(config.partyShare||1);
    return Math.max(0, row.effectiveKillRate * Number(m.rewards.jobExp || 0) * share * Number(config.partyBonus||1));
  };
  const make = (cap, segments) => {
    let cumulative = 0;
    const rows = [];
    for (const segment of segments) {
      const startHours = baseHours(segment.fromBase), endHours = baseHours(segment.toBase);
      const time = Math.max(0.001, endHours - startHours);
      const levelRate = Math.max(1, jobRateForBase((segment.fromBase + segment.toBase) / 2));
      const count = segment.toJob - segment.fromJob;
      for (let i = 0; i < count; i++) {
        const currentLevel = segment.fromJob + i, nextLevel = currentLevel + 1;
        const exp = Math.max(1, Math.round(levelRate * time / count)); cumulative += exp;
        rows.push({ currentLevel, nextLevel, requiredExp: exp, cumulativeExp: cumulative, targetBaseLevel: segment.fromBase + (segment.toBase - segment.fromBase) * ((i + 1) / count), expectedJobExpPerHour: levelRate, source: 'Actual monster Job EXP × modeled farming rate' });
      }
    }
    if (rows.length !== cap - 1) throw new Error(`Job table must contain ${cap - 1} transitions.`);
    return { rows, totalExp: cumulative };
  };
  const class1 = make(config.class1JobCap || 50, [{ fromJob: 1, toJob: 50, fromBase: 1, toBase: milestones.class1 || 48 }]);
  const m = milestones.class2 || DEFAULT_CONFIG.milestones.class2;
  let prevJob = 1, prevBase = milestones.class1 || 48;
  const segments = m.map(({ job, base }) => { const x = { fromJob: prevJob, toJob: job, fromBase: prevBase, toBase: base }; prevJob = job; prevBase = base; return x; });
  const class2 = make(config.class2JobCap || 70, segments);
  return { class1, class2, milestones: { class1: milestones.class1 || 48, class2: m }, class1Overflow: 'discarded on class transition by default', class2Carry: false };
}

export function simulatePlayers(baseModel, jobs, config = DEFAULT_CONFIG, scenarios = null) {
  const defs = scenarios || [
    { name: 'Casual F2P', clients: 1, efficiency: 1, boost: 1, profile: 'normal', hoursPerDay: 2 },
    { name: 'Solo F2P', clients: 1, efficiency: 1, boost: 1, profile: 'normal', hoursPerDay: 4 },
    { name: 'Active F2P', clients: 1, efficiency: 1, boost: 1, profile: 'normal', hoursPerDay: 6 },
    { name: 'Dedicated F2P', clients: 1, efficiency: 1, boost: 1, profile: 'normal', hoursPerDay: 8 },
    { name: 'Hardcore F2P', clients: 1, efficiency: 1, boost: 1, profile: 'normal', hoursPerDay: 12 },
    { name: 'Optimized F2P', clients: 1, efficiency: 1, boost: 1, profile: 'optimized', hoursPerDay: 16 },
    { name: 'Theoretical Maximum F2P', clients: 1, efficiency: 1, boost: 1, profile: 'normal', hoursPerDay: 24 },
    { name: 'Solo Boosted', clients: 1, efficiency: 1, boost: weightedMultiplier(config.expMultiplier, config.expBoostUptime), profile: 'normal', hoursPerDay: 4 },
    { name: 'Dual Client F2P', clients: 2, efficiency: 1.25, boost: 1, profile: 'normal', hoursPerDay: 4 },
    { name: 'Dual Client Boosted', clients: 2, efficiency: 1.25, boost: weightedMultiplier(config.expMultiplier, config.expBoostUptime), profile: 'normal', hoursPerDay: 4 },
    { name: 'Triple Client F2P', clients: 3, efficiency: 1.5, boost: 1, profile: 'normal', hoursPerDay: 4 },
    { name: 'Triple Client Boosted', clients: 3, efficiency: 1.5, boost: weightedMultiplier(config.expMultiplier, config.expBoostUptime), profile: 'optimized', hoursPerDay: 4 },
    { name: 'Optimized AoE Farming', clients: 1, efficiency: 1, boost: weightedMultiplier(config.expMultiplier, config.expBoostUptime), profile: 'optimized', hoursPerDay: 6 },
    { name: 'Solo Maximum Boost Stress Test', clients: 1, efficiency: 1, boost: config.maxExpMultiplier || 2.1, profile: 'fullBuff', hoursPerDay: 24 },
    { name: 'Maximum Efficiency Stress Test', clients: 3, efficiency: Number(config.multiClientEfficiency || 1.5), boost: config.maxExpMultiplier || 2.1, profile: 'fullBuff', hoursPerDay: 24 }
  ];
  return defs.map(s => {
    const profileKey=s.profile==='fullBuff'?'maximumProfileExpPerHour':s.profile==='optimized'?'optimizedExpPerHour':'soloExpPerHour';
    const explicit=Boolean(config.explicitPartyMode&&s.clients>1);
    const shares=explicit?normalizeShares((config.partyShares||[]).slice(0,s.clients),s.clients):[1];
    const efficiency=explicit?1:Number(s.efficiency||1);
    const bonus=explicit?Math.max(0,Number(config.partyBonus||1)):1;
    const factors=shares.map(share=>Math.max(.0001,efficiency*Number(s.boost||1)*bonus*share));
    const timeTo=factor=>baseModel.rows.reduce((sum,r)=>sum+r.requiredExp/Math.max(1,r[profileKey]*factor),0);
    const individualHours=factors.map(timeTo),hours=Math.min(...individualHours),slowestHours=Math.max(...individualHours);
    const j1Hour=baseModel.rows.filter(r=>r.nextLevel<=jobs.milestones.class1).reduce((sum,r)=>sum+r.requiredExp/Math.max(1,r[profileKey]*factors[0]),0);
    const j2Hour=baseModel.rows.filter(r=>r.nextLevel<=jobs.milestones.class2.at(-1).base).reduce((sum,r)=>sum+r.requiredExp/Math.max(1,r[profileKey]*factors[0]),0);
    const maxShare=Math.max(...shares),minShare=Math.min(...shares);const accountExp=baseModel.totalExp*(explicit?bonus/Math.max(.0001,maxShare):Math.max(1,s.clients));const slowExp=baseModel.totalExp*(explicit?minShare/Math.max(.0001,maxShare):1);
    return {...s,efficiency,explicitPartyMode:explicit,individualShares:shares,individualCompletionHours:individualHours,fastestCharacterHours:hours,slowestCharacterHours:slowestHours,totalAccountExpEarned:accountExp,fastestCharacterExp:baseModel.totalExp,slowestCharacterExp:slowExp,baseExpPerHour:baseModel.totalExp/Math.max(hours,.0001),jobExpPerHour:(jobs.class1.totalExp+jobs.class2.totalExp)/Math.max(j2Hour,.0001),activeFarmingHours:hours,gameplayHours:hours,calendarDays:hours/Math.max(1,s.hoursPerDay||config.dailyHours),daysToBase150:hours/Math.max(1,s.hoursPerDay||config.dailyHours),daysToJob50:j1Hour/Math.max(1,s.hoursPerDay||config.dailyHours),daysToJob70:j2Hour/Math.max(1,s.hoursPerDay||config.dailyHours),baseCompletionHours:hours,job70CompletionHours:j2Hour,battlePassSeason:Math.ceil(hours/Math.max(1,(s.hoursPerDay||config.dailyHours)*config.battlePassDays))};
  });
}

export function autoRebalance(baseModel, config = DEFAULT_CONFIG, options = {}) {
  const target = Math.max(Number(config.minimumModeledHours || 96), Number(config.minimumModeledHours || 96) + Number(config.safetyMarginHours || 0));
  const fastest = baseModel.fastestHours;
  if (!(fastest > 0) || !Number.isFinite(fastest)) return { feasible: false, reason: 'No finite progression simulation is available.' };
  const scale = target / fastest;
  const recommended = baseModel.rows.map(r => ({ currentLevel: r.currentLevel, nextLevel: r.nextLevel, requiredExp: Math.max(1, Math.round(r.requiredExp * scale)) }));
  const locks = new Set(config.lockedLevels || []);
  if (locks.size && recommended.some(r => locks.has(r.currentLevel))) return { feasible: false, reason: 'Locked levels conflict with the requested safety target.', recommended };
  return { feasible: true, targetHours: target, beforeHours: fastest, scale, recommended, status: 'preview; apply only after review' };
}

function smoothXpRequirements(values,rates,targetHours){
 const blocks=[];for(const v of values){blocks.push({sum:v,count:1});while(blocks.length>1&&blocks.at(-2).sum/blocks.at(-2).count>blocks.at(-1).sum/blocks.at(-1).count){const b=blocks.pop(),a=blocks.pop();blocks.push({sum:a.sum+b.sum,count:a.count+b.count})}}
 const out=[];for(const b of blocks)for(let i=0;i<b.count;i++)out.push(b.sum/b.count);
 for(let i=1;i<out.length;i++)out[i]=Math.min(out[i],out[i-1]*2);
 const time=out.reduce((s,v,i)=>s+v/Math.max(1,rates[i]),0),scale=time>0?targetHours/time:1;
 for(let i=0;i<out.length;i++){out[i]=Math.max(1,Math.ceil(out[i]*scale));if(i)out[i]=Math.max(out[i-1],Math.min(out[i],Math.floor(out[i-1]*2)))}
 return out;
}

export function referenceMonster(monsters, level) {
  return [...monsters].sort((a, b) => Math.abs(Number(a.level) - level) - Math.abs(Number(b.level) - level) || Number(a.rewards.baseExp) - Number(b.rewards.baseExp))[0];
}

export function powerAt(level, curve = POWER_CURVE, field = 'normal') {
  const row = curve.find(x => level >= Number(x.min) && level <= Number(x.max)) || curve.at(-1);
  return Math.max(0, Number(row?.[field] || 0));
}

function normalizeShares(values,count){const a=Array.from({length:count},(_,i)=>Math.max(0,Number(values[i]??1/count)));const total=a.reduce((x,y)=>x+y,0);return total>0?a.map(x=>x/total):a.map(()=>1/count)}

function expandWeights(brackets, cap) {
  const values = Array(cap - 1).fill(0);
  for (const b of brackets) {
    const from = Math.max(1, Math.ceil(Number(b.from))), to = Math.min(cap, Math.floor(Number(b.to)));
    const n = Math.max(1, to - from);
    for (let level = from; level < to; level++) values[level - 1] += Number(b.hours || 0) / n;
  }
  return values;
}
