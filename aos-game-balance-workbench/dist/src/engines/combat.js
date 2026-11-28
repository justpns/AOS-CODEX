export function effectiveDps(profile, mode = 'direct', mitigation = {}) {
  const uptime = clamp(profile.damageUptime ?? 1, 0, 1);
  if (mode === 'direct') return Math.max(0, number(profile.effectiveDps ?? profile.sustainedDps));
  const raw = Math.max(0, number(profile.rawDps ?? profile.sustainedDps));
  const physical = clamp(mitigation.physical ?? 0, 0, 0.95);
  const magical = clamp(mitigation.magical ?? 0, 0, 0.95);
  const split = clamp(profile.physicalShare ?? 1, 0, 1);
  const penetration = clamp(profile.penetration ?? 0, 0, 1);
  return raw * (split * (1 - physical * (1 - penetration)) + (1 - split) * (1 - magical)) * uptime;
}

export function calculateTtk({ hp, party = [], mode = 'direct', mitigation = {}, overhead = 0 }) {
  const totalDps = party.reduce((sum, p) => sum + effectiveDps(p, mode, mitigation), 0);
  const valid = Number.isFinite(hp) && hp > 0 && totalDps > 0;
  const combatSeconds = valid ? hp / totalDps : null;
  return { valid, totalDps, combatSeconds, encounterSeconds: valid ? combatSeconds + Math.max(0, number(overhead)) : null };
}

export function calculateBurstRisk({ hp, maxHit = 0, burst3 = 0, burst5 = 0, burst10 = 0, partySize = 1, minimumWindow = 0, contributionThreshold = null }) {
  if (!Number.isFinite(hp) || hp <= 0) return { status: 'INSUFFICIENT DATA', ratios: {} };
  const peak = maxHit * partySize;
  const bursts = { singleHit: maxHit / hp, simultaneousPartyBurst: peak / hp, burst3s: burst3 / hp, burst5s: burst5 / hp, burst10s: burst10 / hp };
  const oneShot = maxHit >= hp;
  const instant = peak >= hp;
  const mechanicRisk = minimumWindow > 0 && (burst3 >= hp || burst5 >= hp || burst10 >= hp);
  const rewardRisk = contributionThreshold != null && peak < contributionThreshold;
  return { status: oneShot || instant || mechanicRisk || rewardRisk ? 'WARNING' : 'PASS', oneShot, instant, mechanicRisk, rewardRisk, ratios: bursts };
}

export function recommendedHp(targetSeconds, partyDps) {
  if (targetSeconds <= 0 || partyDps <= 0) throw new RangeError('Target TTK and DPS must be positive.');
  return Math.round(targetSeconds * partyDps);
}

function number(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, number(v))); }
