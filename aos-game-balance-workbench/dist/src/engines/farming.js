import { calculateTtk } from './combat.js';

export function farmingCycle({ ttkSeconds, movementSeconds = 0, acquisitionSeconds = 0, lootingSeconds = 0, combatOverheadSeconds = 0 }) {
  return Math.max(0, ttkSeconds ?? 0) + Math.max(0, movementSeconds) + Math.max(0, acquisitionSeconds) + Math.max(0, lootingSeconds) + Math.max(0, combatOverheadSeconds);
}

export function calculateFarmingRate({ monster, profile, config = {}, party = [profile], explicitParty = false, aoe = null }) {
  const mode = config.manualMode ? 'manual' : 'theoretical';
  if (mode === 'manual') return { mode, source: 'Measured manual input', cycleSeconds: null, combatKillsPerHour: Math.max(0, Number(config.manualKillsPerMinute || 0) * 60), spawnKillsPerHour: null, killsPerHour: Math.max(0, Number(config.manualKillsPerMinute || 0) * 60), warning: 'Manual kills/minute is active; monster HP changes do not change this rate.' };
  const ttk = calculateTtk({ hp: monster.stats.hp, party, mode: config.damageMode || 'direct', mitigation: config.mitigation, overhead: 0 });
  if (!ttk.valid) return { mode, source: 'Insufficient DPS or HP data', cycleSeconds: null, combatKillsPerHour: 0, spawnKillsPerHour: null, killsPerHour: 0, warning: 'A positive HP and effective DPS value are required.' };
  const interval = farmingCycle({ ttkSeconds: ttk.combatSeconds, movementSeconds: config.movementSeconds, acquisitionSeconds: config.acquisitionSeconds, lootingSeconds: config.lootingSeconds, combatOverheadSeconds: config.combatOverheadSeconds });
  const uptime = clamp(config.farmingUptime ?? 1, 0, 1);
  const combatCapacity = interval > 0 ? 3600 * uptime / interval : 0;
  let spawnCapacity = null;
  const spawn = monster.spawn || {};
  if (config.spawnModel === 'independent' && Number(spawn.count) > 0 && Number(spawn.respawnSeconds) > 0) spawnCapacity = Number(spawn.count) * 3600 / Number(spawn.respawnSeconds);
  if (Number(config.spawnCapacityOverride) > 0) spawnCapacity = Number(config.spawnCapacityOverride);
  let kills = spawnCapacity == null ? combatCapacity : Math.min(combatCapacity, spawnCapacity);
  let aoeResult = null;
  if (aoe?.enabled) {
    const targets = Math.max(1, Number(aoe.effectiveTargets || 1));
    const cycle = interval + Math.max(0, Number(aoe.groupingSeconds || 0)) + Math.max(0, Number(aoe.castingInterval || 0));
    const groupCycles = cycle > 0 ? 3600 * uptime / cycle : 0;
    const targetsPerHour = groupCycles * targets;
    if (spawnCapacity != null) kills = Math.min(targetsPerHour, spawnCapacity);
    else kills = targetsPerHour;
    aoeResult = { targetsPerGroup: targets, groupCyclesPerHour: groupCycles, targetKillsPerHour: kills, aggregateDps: Math.max(0, Number(aoe.aggregateDps || 0)) };
  }
  return { mode, source: spawnCapacity == null ? 'Theoretical; spawn data unavailable' : 'Spawn limited', cycleSeconds: interval, combatKillsPerHour: combatCapacity, spawnKillsPerHour: spawnCapacity, killsPerHour: kills, warning: spawnCapacity == null ? 'Theoretical rate: no verified spawn capacity is available.' : null, aoe: aoeResult, explicitParty };
}

export function partyAllocation({ expPerKill, partySize = 1, partyBonus = 1, shares = null, clientEfficiency = 1, explicitParty = false }) {
  const count = Math.max(1, Math.floor(partySize));
  const distribution = shares?.length === count ? shares.map(Number) : Array(count).fill(1 / count);
  const total = distribution.reduce((a, b) => a + b, 0);
  if (distribution.some(v => v < 0) || total <= 0) throw new RangeError('Party EXP shares must be non-negative and have a positive total.');
  const normalized = distribution.map(v => v / total);
  const allocations = normalized.map(s => expPerKill * Math.max(0, partyBonus) * s);
  const fastestCharacterExp = Math.max(...allocations) * (explicitParty ? 1 : Math.max(0, clientEfficiency));
  return { allocations, totalGeneratedExp: allocations.reduce((a, b) => a + b, 0), fastestCharacterExp };
}

function clamp(v, min, max) { const n = Number(v); return Math.max(min, Math.min(max, Number.isFinite(n) ? n : 0)); }
