import { DEFAULT_CONFIG } from './engines/progression.js';

const DB_NAME = 'aos-game-balance-workbench', DB_VERSION = 1;
export function createStore({ original, proposal, config = DEFAULT_CONFIG }) {
  const state = { original, proposal, custom: {}, mode: 'proposed', config: structuredClone(config), project: { id: uuid(), versionId: uuid(), name: 'AOS Balance Draft', versionName: 'v0.1 Draft', parentVersionId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), sourceVersion: original.bundle || original.exportedAt }, profiles: structuredClone(defaultProfiles()), currentView: 'dashboard', history: [], versions: [], telemetry: [], tablePage: 0, filters: { search: '', category: 'all', map: 'all', minLevel: 1, maxLevel: 999, archetype: 'all', element: 'all', race: 'all', aggro: 'all', status: 'all' }, selectedScenario: 'Maximum Efficiency Stress Test', rebalancePreview: null };
  let undo = [], redo = [], listeners = new Set(), persistTimer;
  const api = {
    getState: () => state,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    emit() { for (const fn of listeners) fn(state); schedulePersist(); },
    activeMonsters() {
      return state.original.monsters.map(o => {
        const id = String(o.id), p = state.mode === 'original' ? null : state.proposal.records[id], c = state.mode === 'custom' ? state.custom[id] : null;
        let r = structuredClone(o);
        if (p) r = mergeRecord(r, p);
        if (c) r = mergeRecord(r, c);
        const tier=state.proposal.records[id]?.metadata?.tier;
        if(tier)r.metadata={...(r.metadata||{}),tier};
        return r;
      });
    },
    setMode(mode) { if (!['original', 'proposed', 'custom'].includes(mode)) return; state.mode = mode; state.project.updatedAt = new Date().toISOString(); api.record(`Active dataset mode → ${mode}`); api.emit(); },
    resetConfig(config) { const previous=structuredClone(state.config),value=structuredClone(config); undo.push({type:'configRoot',previous,value}); redo=[]; state.config=value; api.record('Reset configuration to defaults'); api.emit(); },
    setView(view) { state.currentView = view; api.emit(); },
    updateConfig(key, value) { const path=Array.isArray(key)?key:String(key).split('.'); const previous=structuredClone(getPath(state.config,path)); pushUndo({type:'config',path,previous,value:structuredClone(value)}); setPath(state.config,path,value); state.project.updatedAt=new Date().toISOString(); api.record(path.join('.')+': '+(Array.isArray(value)?'updated':value)); api.emit(); },
    edit(id, path, value) {
      const active = api.activeMonsters().find(m => String(m.id) === String(id)); if (!active) throw new Error(`Unknown monster ID ${id}`);
      const previous=getPath(active,path), oldOverride=getPath(state.custom[id],path), hadOverride=oldOverride!==undefined; pushUndo({type:'edit',id:String(id),path:[...path],previous,oldOverride:structuredClone(oldOverride),hadOverride,value});
      if (!state.custom[id]) state.custom[id] = {};
      setPath(state.custom[id], path, value); state.mode = 'custom'; state.project.updatedAt = new Date().toISOString(); api.record(`${active.name} · ${path.join('.')}: ${previous} → ${value}`); api.emit();
    },
    applyCustomPatches(patches,label='Applied previewed custom balance values') {
      const snapshot=[];for(const [id,patch]of Object.entries(patches)){snapshot.push({id,previous:structuredClone(state.custom[id]||null),next:structuredClone(patch)});state.custom[id]=mergePatch(state.custom[id]||{},patch)}
      undo.push({type:'record-batch',snapshot});redo=[];state.mode='custom';api.record(label+' · '+snapshot.length+' records');api.emit();
    },
    bulkEdit(ids, path, operation, amount) {
      const snapshot = ids.map(id => ({ id: String(id), previous: getPath(api.activeMonsters().find(m => String(m.id) === String(id)), path) }));
      for (const item of snapshot) { const n=Number(item.previous); item.next=operation==='percent'?cleanNumber(n*(1+Number(amount)/100)):cleanNumber(n+Number(amount)); }
      pushUndo({ type: 'bulk', path: [...path], snapshot });
      for (const item of snapshot) { if (!state.custom[item.id]) state.custom[item.id] = {}; setPath(state.custom[item.id], path, item.next); }
      state.mode = 'custom'; api.record(`Bulk ${operation} ${amount} to ${snapshot.length} records · ${path.join('.')}`); api.emit();
    },
    undo() { const action = undo.pop(); if (!action) return false; redo.push(action); applyUndo(action, false); api.record('Undo'); api.emit(); return true; },
    redo() { const action = redo.pop(); if (!action) return false; undo.push(action); applyUndo(action, true); api.record('Redo'); api.emit(); return true; },
    resetMonster(id) { delete state.custom[id]; api.record(`Restore ${id} proposed values`); api.emit(); },
    restoreOriginal() { state.custom = {}; state.mode = 'original'; api.record('Restore original dataset'); api.emit(); },
    record(message) { state.history.unshift({ id: uuid(), at: new Date().toISOString(), message, mode: state.mode }); state.history = state.history.slice(0, 1000); },
    saveVersion(name = 'Saved version') { const version = structuredClone({ ...snapshot(), original:state.original, proposal:state.proposal, project: { ...state.project, versionId: uuid(), parentVersionId: state.project.versionId, versionName: name, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } }); state.versions.unshift(version); state.project = version.project; api.record(`Saved version ${name}`); api.emit(); return version.project.versionId; },
    loadVersion(id) { const v = state.versions.find(x => x.project.versionId === id); if (!v) return false; restore(v); api.record(`Loaded version ${v.project.versionName}`); api.emit(); return true; },
    duplicateVersion(id, name) { const v = state.versions.find(x => x.project.versionId === id); if (!v) return false; const copy = structuredClone(v); copy.project = { ...copy.project, versionId: uuid(), parentVersionId: v.project.versionId, versionName: name, createdAt: new Date().toISOString() }; state.versions.unshift(copy); api.record(`Duplicated ${v.project.versionName} as ${name}`); api.emit(); return copy.project.versionId; },
    exportProject() { return { schemaVersion: 1, exportedAt: new Date().toISOString(), project: state.project, mode: state.mode, config: state.config, profiles: state.profiles, customOverrides: state.custom, history: state.history, versions: state.versions, original:state.original, proposal:state.proposal, telemetrySummary: state.telemetrySummary, sourceVersion: state.project.sourceVersion }; },
    importProject(data) { validateProject(data); state.config = { ...structuredClone(DEFAULT_CONFIG), ...structuredClone(data.config) }; if(data.originalSource?.monsters)state.original=structuredClone(data.originalSource); else if(data.original?.monsters)state.original=structuredClone(data.original); if(data.proposal?.records)state.proposal=structuredClone(data.proposal); state.profiles = structuredClone(data.profiles || defaultProfiles()); state.custom = structuredClone(data.customOverrides || {}); state.mode = data.mode || 'custom'; if (data.project) state.project = { ...state.project, ...data.project }; state.versions=structuredClone(data.versions||state.versions);state.history = [...(data.history || []), { id: uuid(), at: new Date().toISOString(), message: 'Imported project', mode: state.mode }]; api.emit(); },
    importMonsterDataset(data) { validateMonsterData(data); state.original = structuredClone(data); state.project.sourceVersion = data.bundle || data.exportedAt || 'Imported dataset'; api.record(`Imported monster source (${data.monsters.length} records)`); api.emit(); },
    importProposal(records, source) { state.proposal = { source, records: structuredClone(records) }; api.record(`Imported balance proposal (${Object.keys(records).length} records)`); api.emit(); },
    importTelemetry(rows, summary) { state.telemetry = rows; state.telemetrySummary = summary; api.record(`Imported telemetry rows: ${rows.length}`); api.emit(); },
    async loadPersisted() { try { const value = await idbGet('active'); if (value) { state.config = value.config || state.config; state.original=value.original||state.original; state.proposal=value.proposal||state.proposal; state.custom = value.custom || {}; state.mode = value.mode || 'proposed'; state.project = value.project || state.project; state.profiles = value.profiles || state.profiles; state.history = value.history || []; state.versions = value.versions || []; } } catch { try { const raw = localStorage.getItem('aos-balance-v1'); if (raw) Object.assign(state, JSON.parse(raw)); } catch {} } api.emit(); },
    async persist() { const val = { config: state.config, custom: state.custom, mode: state.mode, project: state.project, profiles: state.profiles, history: state.history, versions: state.versions, original:state.original, proposal:state.proposal }; try { await idbSet('active', val); } catch { try { localStorage.setItem('aos-balance-v1', JSON.stringify(val)); } catch {} } }
  };
  function pushUndo(x) { undo.push(x); redo = []; }
  function applyUndo(action,forward){if(action.type==='configRoot'){state.config=structuredClone(forward?action.value:action.previous);return}if(action.type==='config'){setPath(state.config,action.path,structuredClone(forward?action.value:action.previous));return}if(action.type==='edit'){if(!state.custom[action.id])state.custom[action.id]={};if(forward||action.hadOverride)setPath(state.custom[action.id],action.path,structuredClone(forward?action.value:action.oldOverride));else{deletePath(state.custom[action.id],action.path);if(!Object.keys(state.custom[action.id]).length)delete state.custom[action.id]}return}if(action.type==='record-batch'){for(const item of action.snapshot){const v=forward?mergePatch(item.previous||{},item.next):item.previous;if(v&&Object.keys(v).length)state.custom[item.id]=structuredClone(v);else delete state.custom[item.id]}return}for(const item of action.snapshot){if(!state.custom[item.id])state.custom[item.id]={};setPath(state.custom[item.id],action.path,forward?item.next:item.previous)}}
  function snapshot() { return { config: state.config, custom: state.custom, mode: state.mode, profiles: state.profiles, history: state.history, original:state.original, proposal:state.proposal }; }
  function restore(v) { state.config = structuredClone(v.config); state.custom = structuredClone(v.custom); state.mode = v.mode; state.profiles = structuredClone(v.profiles); state.project = structuredClone(v.project); state.history = structuredClone(v.history || []); state.original=structuredClone(v.original||state.original); state.proposal=structuredClone(v.proposal||state.proposal); }
  function schedulePersist() { clearTimeout(persistTimer); persistTimer = setTimeout(() => api.persist(), 250); }
  api.record('Project initialized');
  return api;
}

function mergeRecord(original, override) {
  for (const group of ['stats', 'attributes', 'rewards', 'metadata', 'spawn', 'encounter']) if (override[group]) original[group] = { ...(original[group] || {}), ...override[group] };
  if (override.level != null) original.level = override.level;
  if (override.element != null) original.element = override.element;
  if (override.aggro != null) original.aggro = override.aggro;
  if (override.archetype != null) original.archetype = override.archetype;
  if (override.skills != null) original.skills = override.skills;
  if (override.counterplay != null) original.counterplay = override.counterplay;
  if(override.metadata?.element!=null)original.element=override.metadata.element;
  if(override.metadata?.aggro!=null)original.aggro=override.metadata.aggro;
  if(override.metadata?.archetype!=null)original.archetype=override.metadata.archetype;
  if(override.metadata?.proposed_skill!=null)original.proposedSkill=override.metadata.proposed_skill;
  if(override.metadata?.counterplay!=null)original.counterplay=override.metadata.counterplay;
  return original;
}
function mergePatch(target,patch){for(const [key,value]of Object.entries(patch)){if(value&&typeof value==='object'&&!Array.isArray(value))target[key]=mergePatch(target[key]||{},value);else target[key]=structuredClone(value)}return target}
function setPath(target, path, value) { let o = target; for (const key of path.slice(0, -1)) o = o[key] ??= {}; o[path.at(-1)] = value; }
function getPath(target,path){return path.reduce((o,k)=>o?.[k],target)}
function deletePath(target,path){let o=target,stack=[];for(const k of path.slice(0,-1)){stack.push([o,k]);o=o?.[k]}if(o)delete o[path.at(-1)];for(const [parent,key] of stack.reverse()){if(parent[key]&&typeof parent[key]==='object'&&!Object.keys(parent[key]).length)delete parent[key];else break}}
function cleanNumber(n) { return Number.isFinite(n) ? Number(n.toFixed(6)) : 0; }
function uuid() { return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function validateProject(d) { if (!d || typeof d !== 'object' || typeof d.config !== 'object') throw new Error('Invalid project backup. A config object is required.'); }
function validateMonsterData(d) { if (!d || !Array.isArray(d.monsters)) throw new Error('Monster JSON must contain a monsters array.'); const ids=d.monsters.map(m=>String(m.id)); if(ids.some(x=>x==='undefined')||new Set(ids).size!==ids.length) throw new Error('Monster IDs must be present and unique.'); for(const m of d.monsters) if(!m.name||!Number.isFinite(Number(m.level))||!m.stats||!m.rewards) throw new Error(`Invalid required fields on Monster ID ${m.id}.`); }
function db() { return new Promise((resolve, reject) => { const r = indexedDB.open(DB_NAME, DB_VERSION); r.onupgradeneeded = () => r.result.createObjectStore('projects'); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); }); }
async function idbGet(key) { const d = await db(); return new Promise((resolve, reject) => { const r = d.transaction('projects').objectStore('projects').get(key); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); }); }
async function idbSet(key, value) { const d = await db(); return new Promise((resolve, reject) => { const tx = d.transaction('projects', 'readwrite'); tx.objectStore('projects').put(value, key); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); }); }

export function defaultProfiles() { return { progression: undefined, combat: [
  { id: 'normal-f2p', name: 'Normal F2P', type: 'Normal', effectiveDps: 2000000, sustainedDps: 2000000, burstDps: 6000000, maxHit: 1200000, burst3: 6000000, burst5: 10000000, burst10: 18000000, damageUptime: 0.75, source: 'Source-derived proposed test benchmark' },
  { id: 'optimized-f2p', name: 'Optimized F2P', type: 'Optimized', effectiveDps: 4000000, sustainedDps: 4000000, burstDps: 10000000, maxHit: 3000000, burst3: 20000000, burst5: 30000000, burst10: 50000000, damageUptime: 0.85, source: 'Assumed' },
  { id: 'full-buff', name: 'Full Buff', type: 'High DPS', effectiveDps: 6000000, sustainedDps: 6000000, burstDps: 12000000, maxHit: 5000000, burst3: 36000000, burst5: 60000000, burst10: 90000000, damageUptime: 0.9, source: 'Source-derived proposed test benchmark' }
] }; }
