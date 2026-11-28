export function weightedMultiplier(multiplier = 1, uptime = 1, cap = 2.1) {
  const weighted = 1 + (clamp(multiplier, 1, cap) - 1) * clamp(uptime, 0, 1);
  return Math.min(cap, weighted);
}

export function calculateMonsterRewards({ monster, killsPerHour, baseShare = 1, jobShare = baseShare, baseMultiplier = 1, jobMultiplier = baseMultiplier, questBasePerHour = 0, questJobPerHour = 0, goldAverage = null }) {
  const rewards = monster.rewards || {};
  const avgGold = goldAverage == null ? (Number(rewards.goldMin || 0) + Number(rewards.goldMax || 0)) / 2 : Math.max(0, Number(goldAverage));
  const basePerKill = Math.max(0, Number(rewards.baseExp || 0)) * Math.max(0, baseShare);
  const jobPerKill = Math.max(0, Number(rewards.jobExp || 0)) * Math.max(0, jobShare);
  const base = killsPerHour * basePerKill * Math.max(0, baseMultiplier) + Math.max(0, questBasePerHour);
  const job = killsPerHour * jobPerKill * Math.max(0, jobMultiplier) + Math.max(0, questJobPerHour);
  const gold = killsPerHour * avgGold;
  return { baseExpPerKill: basePerKill, jobExpPerKill: jobPerKill, averageGoldPerKill: avgGold, baseExpPerHour: base, jobExpPerHour: job, goldPerHour: gold, baseExpPerCombatSecond: basePerKill, jobExpPerCombatSecond: jobPerKill, expPer1000Hp: Number(monster.stats?.hp) > 0 ? basePerKill * 1000 / Number(monster.stats.hp) : 0, goldDistribution: goldAverage == null ? 'Arithmetic midpoint; uniform distribution assumed' : 'Configured expected value' };
}

export function expectedDropRate(drop) {
  const min = Number(drop.rateMin), max = Number(drop.rateMax);
  return Number.isFinite(min) && Number.isFinite(max) ? Math.max(0, (min + max) / 2) / 100 : null;
}

function clamp(v, min, max) { const n = Number(v); return Math.max(min, Math.min(max, Number.isFinite(n) ? n : min)); }
