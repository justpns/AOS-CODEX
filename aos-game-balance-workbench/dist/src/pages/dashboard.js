import { card, chartPanel, heading, lineChart, panel, table, fmt, status } from './common.js';

export function renderDashboard(c) {
  const monsters = c.monsters, boss = monsters.filter(m => m.boss), normal = monsters.filter(m => !m.boss);
  const changed = Object.keys(c.store.getState().custom).length;
  const fastest = c.scenarios.find(s => s.name === 'Maximum Efficiency Stress Test');
  const f2p = c.scenarios.find(s => s.name === 'Solo F2P');
  const chart = `<div class="chart-grid">${chartPanel('Monster HP Curve','dash-hp','Monster HP by level','Effective active values; source attributes retained.')}${chartPanel('Monster Base EXP Curve','dash-exp','Monster Base EXP by level','Active monster rewards.')}${chartPanel('Player Power Curve','dash-power','Normal and full buff DPS by level','Provisional power assumptions until telemetry import.')}${chartPanel('Fastest vs F2P Completion','dash-scenario','Completion hours by scenario','Current modeled calculation.')}</div>`;
  const validations = c.validation.slice(0, 5).map(v => `<tr><td>${status(v.status,v.status)}</td><td>${v.message}</td><td>${v.assumption}</td></tr>`);
  const html = `${heading('Game Design Dashboard','Shared balance state · upstream edits recalculate TTK, farming, rewards, EXP pacing and validation.')}
    <div class="grid metrics">${card('Monsters',fmt(monsters.length,0),`${normal.length} normal · ${boss.filter(m=>m.metadata?.tier==='Abyss').length} Abyss`)}${card('MVP Bosses',fmt(boss.filter(m=>m.metadata?.tier!=='Abyss').length,0),'Proposed HP from handoff')}${card('Changed Records',fmt(changed,0),'Custom working overrides')}${card('Total Base EXP Budget',fmt(c.base.totalExp,0),'Dynamic from active data')}${card('Class 1 Job EXP Budget',fmt(c.jobs.class1.totalExp,0),'49 transitions')}${card('Class 2 Job EXP Budget',fmt(c.jobs.class2.totalExp,0),'69 transitions')}${card('Solo Leveling Hours',fmt(c.base.soloHours,1),'Normal profile · modeled active hours')}${card('Maximum Combined Efficiency',`×${fmt(c.base.fastestEfficiency,2)}`,'Multi-client × weighted EXP boost')}${card('Fastest Modeled Completion',`${fmt(fastest?.baseCompletionHours,1)} h`,'Minimum 96 h · not server enforced',fastest?.baseCompletionHours>=96?'good':'bad')}${card('Regular F2P Completion',`${fmt(f2p?.calendarDays,1)} days`,'4 hours/day · compare with lifecycle')}${card('EXP Multiplier',`×${fmt(c.base.boostMultiplier,2)}`,'Cap ×2.10 (+110%)')}${card('Battle Pass Lifecycle',`${c.config.seasons} × ${c.config.battlePassDays} d`,'Configured content runway')}</div>
    <div style="height:12px"></div>${chart}
    <div style="height:12px"></div><div class="grid two">${panel('Validation Snapshot',table(['Status','Finding','Assumption'],validations))}${panel('Balance Dependency',`<div class="metric-line"><span>Player Power + Monster Difficulty</span><b>→ TTK</b></div><div class="metric-line"><span>TTK + spawn / route model</span><b>→ Farming rate</b></div><div class="metric-line"><span>Farming rate + rewards / EXP rules</span><b>→ EXP & gold/hour</b></div><div class="metric-line"><span>EXP curves + schedule</span><b>→ Content lifecycle</b></div><p class="small muted">Original data stays separate from proposed and custom values. Boss HP is fixed when party size changes.</p>`)}</div>`;
  requestAnimationFrame(() => {
    lineChart('dash-hp',[{values:normal.sort((a,b)=>a.level-b.level).map(m=>m.stats.hp)},{values:boss.sort((a,b)=>a.level-b.level).map(m=>m.stats.hp)}],['Normal','Boss']);
    lineChart('dash-exp',[{values:normal.sort((a,b)=>a.level-b.level).map(m=>m.rewards.baseExp)},{values:normal.sort((a,b)=>a.level-b.level).map(m=>m.rewards.jobExp)}],['Normal','Job']);
    const curve=c.config.powerCurve;lineChart('dash-power',[{values:curve.map(x=>x.normal)},{values:curve.map(x=>x.optimized)},{values:curve.map(x=>x.fullBuff)}],['1','150']);
    lineChart('dash-scenario',[{values:c.scenarios.map(x=>x.baseCompletionHours)}],c.scenarios.map(x=>x.name));
  });
  return html;
}
