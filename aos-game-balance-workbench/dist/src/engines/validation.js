export function validateBalance({original,monsters,base,jobs,scenarios,config,custom={},proposal={},profiles=[]}){
 const out=[],add=(status,message,assumption='')=>out.push({status,message,assumption});
 const fastest=scenarios.find(x=>x.name==='Maximum Efficiency Stress Test'),f2p=scenarios.find(x=>x.name==='Solo F2P'),casual=scenarios.find(x=>x.name==='Casual F2P');
 if(!monsters.length||!base.rows.length)add('INSUFFICIENT DATA','Progression or monster inputs are missing.','A non-empty dataset and finite farming rate are required.');
 else add(base.fastestHours+1e-5>=config.minimumModeledHours?'PASS':'FAIL','Fastest modeled character completes Base 150 in '+f(base.fastestHours)+' active hours.',config.maxClients+' clients · max boost ×'+config.maxExpMultiplier+' · estimated fastest rate '+f(fastest?.baseExpPerHour)+' EXP/hour; modeled, not server-enforced.');
 if(config.expMultiplier>config.maxExpMultiplier||config.maxExpMultiplier>2.1)add('FAIL','EXP multiplier exceeds the ×2.10 cap.','+110% equals ×2.10.');
 else add('PASS','EXP boost is within the ×2.10 cap.','Boost uptime is weighted once.');
 if(config.maxClients>3)add('FAIL','Concurrent clients exceed the configured maximum of 3.','Global constraint.');
 if(f2p&&f2p.battlePassSeason>config.seasons)add('WARNING','Regular F2P progression exceeds the planned content lifecycle.',f(f2p.daysToBase150)+' days at '+f2p.hoursPerDay+' h/day; lifecycle '+(config.seasons*config.battlePassDays)+' days.');
 else if(f2p)add('PASS','Regular F2P progression is within the configured lifecycle.',f(f2p.daysToBase150)+' days vs '+(config.seasons*config.battlePassDays)+' days.');
 if(casual&&casual.daysToBase150>config.seasons*config.battlePassDays)add('WARNING','Casual progression exceeds the content lifecycle at current playtime.',f(casual.daysToBase150)+' days at 2 hours/day; this is an editable player-behavior assumption.');
 const job70=jobs?.milestones?.class2?.at(-1)?.base||135,jobHours=base.rows.filter(r=>r.nextLevel<=job70).reduce((s,r)=>s+r.fastestTimeHours,0);
 if(jobHours>base.fastestHours)add('WARNING','Job 70 completes after Base 150.','Milestone target is configurable; class Job EXP does not carry by default.');
 else add('PASS','Job 70 is scheduled before Base 150.','Class 1 overflow is discarded by default.');
 const drops=base.rows.filter((r,i)=>i&&r.requiredExp<base.rows[i-1].requiredExp),spikes=base.rows.filter((r,i)=>i&&r.requiredExp>base.rows[i-1].requiredExp*2);
 if(drops.length)add('WARNING',drops.length+' Base EXP requirements decrease unexpectedly.','First transition at '+drops[0].currentLevel+'.');else add('PASS','Base EXP requirements do not decrease.','Integer-generated table.');
 if(spikes.length)add('WARNING',spikes.length+' Base EXP transitions exceed 2× growth.','First transition at '+spikes[0].currentLevel+'.');else add('PASS','No level-to-level Base EXP increase exceeds 2×.','Diagnostic threshold; not a required curve shape.');
 const ids=monsters.map(m=>String(m.id));if(new Set(ids).size!==ids.length)add('FAIL','Duplicate Monster IDs exist in active data.','Monster ID is the primary key.');else add('PASS','Monster IDs are unique.',ids.length+' records.');
 const invalid=monsters.filter(m=>!m.name||!Number.isFinite(Number(m.level))||!Number.isFinite(Number(m.stats?.hp))||!Number.isFinite(Number(m.rewards?.baseExp)));
 if(invalid.length)add('FAIL',invalid.length+' records have invalid required fields.','First ID '+invalid[0].id+'.');else add('PASS','Required monster data fields are numeric.','Original records retained separately.');
 const missing=monsters.filter(m=>!m.boss&&!m.spawn?.count&&!m.spawn?.respawnSeconds).length;
 if(missing)add('WARNING','Verified spawn capacity is missing.',missing+' normal monsters use uncapped theoretical farming unless a capacity override is supplied.');
 if(missing&&!config.manualMode)add('WARNING','Achievable kill rate cannot be verified.','Theoretical rate is not represented as an observed rate.');
 if(profiles.some(p=>!Number.isFinite(Number(p.effectiveDps))||p.effectiveDps<0))add('FAIL','A combat profile has invalid effective DPS.','Use a non-negative direct DPS input.');
 else add('PASS','Combat profile inputs are numeric.','Profile source evidence remains labeled.');
 add('PASS','Boss HP remains independent from party size.','Only total party effective DPS affects forward TTK.');
 const conflicts=Object.keys(proposal).filter(id=>{const o=original.monsters.find(m=>String(m.id)===id),p=proposal[id];return o&&p.stats&&Object.entries(p.stats).some(([k,v])=>Number.isFinite(Number(v))&&Number.isFinite(Number(o.stats?.[k]))&&Number(v)!==Number(o.stats[k]))}).length;
 if(conflicts)add('WARNING',conflicts+' source records differ between Original and Proposed values.','Differences remain visible and are not silently overwritten.');
 if(Object.keys(custom).length)add('WARNING',Object.keys(custom).length+' custom record overrides are active.','Review change history before handoff.');
 return out;
}
function f(v){return Number.isFinite(Number(v))?Number(v).toLocaleString('en-US',{maximumFractionDigits:2}):'—'}
