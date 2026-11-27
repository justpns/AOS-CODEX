# AOS UI sprite starter package

The mockup review identified recurring interface symbols across the HUD/Hotbar, Auto Settings, Settings, character and feature navigation, monster inspection, chat/mail, rewards, and world-map controls. This package provides generic UI glyphs for those shared controls.

These are newly drawn illustrative placeholders informed by the Brand Book’s muted antique-gold icon treatment. They are not extracted from screenshots, do not represent verified game data, and require production-art approval before release.

## Files

Use the `aos-ui-sprites.*` files as the current package. The earlier `aos-hud-icons.*` 16-symbol draft is retained as a historical draft and is no longer linked from the handoff.


- `aos-ui-sprites.png` — transparent 8-bit RGBA atlas, 1024 × 1024, arranged as 8 columns × 8 rows of 128 × 128 px cells.
- `aos-ui-sprites.svg` — editable vector source.
- `aos-ui-sprites.json` — stable logical names, pixel rectangles, pivot, category, and usage descriptions. Coordinates use a top-left origin; cells are untrimmed and unrotated.

## Coverage

The 64 frames cover combat and HUD actions/states; health and mana; party, summons, and daily hunts; inventory and Quick Access categories; navigation and Settings categories; monster inspection and drops; chat and mail; map navigation; rewards and currency categories; and common utility actions. Cooldown numbers, labels, counts, keybinding text, and accessibility names should be rendered as live text, not baked into sprites.

## Keep separate

Use approved game assets for character portraits, race/class symbols, skill artwork, actual consumable and equipment icons, monster portraits, element/race markers, map terrain, and branded logos. Those assets are data- or art-specific and should not be invented from these generic glyphs. The mockup screenshots remain standalone references.

Atlas grouping, max dimensions, density variants, sampling, mipmaps, compression, renderer loading, and device fallback remain to be confirmed against the selected engine and target devices. Keep the atlas and JSON manifest versioned together.
