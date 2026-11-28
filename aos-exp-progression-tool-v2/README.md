# AOS EXP Progression Tool v2

Offline, standalone EXP economy model for Age of Sylvanus. Open `index.html` directly in a modern browser. No server, build step, backend, external API, or library is required.

## Package files

- `index.html` — responsive interface, calculation model, charts, import, local settings, and exports. The startup monster dataset is embedded so the page works from `file://` offline.
- `aos-monsters-full.json` — canonical source dataset copied without modifying monster records. Import an updated copy through the page to recalculate all dependent results; use the JSON export to download the active dataset.

The embedded startup dataset and adjacent JSON are generated from the same source file. Treat the JSON as the source of truth and re-embed it when replacing the package dataset.

## Balance model

- Base cap 150; Class 1 Job cap 50; Class 2 Job cap 70.
- Controlled is the default preset: multi-client efficiency ×1.50, maximum EXP multiplier ×2.10, combined efficiency ×3.15, and solo baseline 302.4 hours. At the configured maximum the modeled Base 150 time is 96 hours.
- Balanced and Unrestricted re-scale the EXP budget to their efficiency (×2.00 and ×3.00). Custom efficiency is configurable through ×3.00. Three clients do not automatically mean 3× EXP.
- The original bracket target weights (1, 2, 6, 12, 19, 25, 20, 30, 35 hours) are retained and scaled to the selected solo baseline. Requirements are recalculated from median normal-monster Base EXP, configured farming kills/minute, uptime, party share, and quest contribution. No rounded budget total is hardcoded.
- EXP boost uptime is weighted as `1 + (boost multiplier − 1) × uptime`. The balance floor uses the full ×2.10 maximum boost; scenario estimates can use a lower configured uptime.
- Job EXP uses actual monster Job EXP from the dataset. Class 1 Job 50 targets Base 48 by default. Class 1 Job EXP resets at class change; Class 2 starts with no carried EXP. Class 2 milestones default to Job 20/40/50/60/70 at Base 65/90/105/120/135.
- All EXP table requirements are integer allocations; cumulative totals equal the sum of the rows. Base EXP ranges only use normal monsters up to level 150. Higher-level monsters remain selectable in the farming simulator.
- The kill-capacity check uses an editable sustainable kills/minute assumption because the monster dataset contains no verified spawn-capacity data.

## Features

Monster/map counts are read from the active JSON. The tool validates unique IDs, separates bosses from normal monsters, preserves source monster records and rewards, and supports importing updated JSON. Farming simulator, editable bracket weights, progression milestones, Base and Job tables, 10 charts, 7 player scenarios, balance warnings, and all requested exports recalculate when settings change.

Configuration is saved in LocalStorage. `Reset to Default` restores the Controlled preset and original bracket weights. Exported monster JSON contains the active dataset; EXP tables and simulation exports contain the generated integer requirements and assumptions.

## Interpretation

The 96-hour minimum is a modeled target under the selected stress configuration. It is not a server-enforced guarantee. Scenario times depend on the editable farming, party distribution, EXP boost uptime, and quest contribution assumptions. Class-specific kill rates, quest schedules, monster respawn capacity, and live-server enforcement are not inferred from the monster database.
