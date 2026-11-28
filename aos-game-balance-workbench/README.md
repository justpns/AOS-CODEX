# Age of Sylvanus — Game Balance Workbench v4.0

Offline, local-first game balance application. Calculation engines are separated from page rendering and consume a shared Original → Proposed → Custom → Active dataset. No backend, external API, package manager or runtime library is required.

## Run

From this folder, run:

    npm run serve

Open http://localhost:4173. A local static server loads the package data through browser modules; calculations stay local and the app works offline.

## Available inputs

- public/data/aos-monsters-full.json is an unchanged copy of the original 313-record source.
- public/data/monster-balance-proposed.json is extracted from AOS_Monster_Boss_Balance_Master_v2.html, with MVP HP values replaced by the more specific 221126-AOS_MVP_Boss_HP_Rebalance_Handoff.html proposal. Abyss HP stays at its source value.
- public/data/default-progression-config.json holds the default constraints.
- The existing EXP Tool v2 and AOS UI Design System Handoff v2.4 were available and used for their calculation model and visual direction.

The request-named aos-exp-progression-tool.zip, AOS_Monster_Boss_Balance_Master_v2(1).html, and AOS-UI-Design-System-Handoff-v2.2.html were not present in the workspace. The available AOS_Monster_Boss_Balance_Master_v2.html and UI handoff v2.4 are used as substitutes. Missing files are not inferred or silently recreated.

## Shared calculation flow

    Active Monster / Boss + Player Power
    → TTK = HP / total effective DPS
    → Farming cycle = TTK + movement + acquisition + looting + overhead
    → Kills/hour = min(combat capacity, configured spawn capacity)
    → EXP/hour, Job EXP/hour, Gold/hour
    → Integer Base / Job EXP curves
    → Player scenarios and Battle Pass timeline
    → Validation findings

Direct Effective DPS mode never applies DEF/MDEF again. Damage Model mode uses configurable mitigation assumptions because verified AOS DEF/MDEF formulas are absent. Boss HP is independent of party size. Reverse HP and EXP rebalancing require a preview and explicit Apply.

The EXP table is generated from active normal monster rewards, player power, TTK, farming cycle, boost uptime, party share and the 96-hour modeled stress target. No historical Base EXP budget is hardcoded. The 96-hour target is modeled, not a server-enforced minimum. Spawn capacity, level-difference penalties, party eligibility, boss availability and several combat formulas are missing from source data; affected outputs are labeled theoretical, estimated or assumed.

Job requirements use actual monster Job EXP. Job progress is calculated alongside Base progress, Class 1 EXP does not carry to Class 2 by default, and the generated tables contain 49 and 69 transitions.

## Persistence, import and exports

Project configuration and versions use IndexedDB with LocalStorage fallback. Original JSON is retained separately from proposal and custom overrides. HTML import scans known embedded JSON assignment data without executing imported scripts. Telemetry imports report P10/P25/P50/P75/P90/P95 and sample sizes.

Import JSON, balance-master HTML, CSV, telemetry and complete project backups from Data Management → Import / Export. Export files include source version, project version, assumptions and generated values. Table EXP values are integers and cumulative fields are row sums.

## Source layout

- src/store.js — shared project state, version persistence, import validation and source/custom overlays.
- src/engines/ — combat, TTK, farming, rewards, progression and validation business logic.
- src/pages/ — dashboard, monster editor, combat, economy, progression and project management views.
- public/data/ — source and proposed JSON.
- tests/ — deterministic engine acceptance tests.

The project uses browser-native ES modules to remain dependency-free and offline capable. The development sources are the production application modules and can be hosted as static files without a bundling step.
