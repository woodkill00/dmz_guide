# Repair: Native-size camo previews
2026-11-18 | fix/091-camo-preview-sizing | Manual bounded Spec Kit repair fallback; bug extension not installed.

## Assessment and user story
User reports oversized/blurry camo pictures. Reproduced at1280: native128px swatches render164.02px Military/Completionist/Prestige and225.48px Special. Fractional1fr columns stretch pictures beyond source detail.

## Requirements and success
FR1 Cap all camo grid tracks at120CSSpx; actual images fit below native128px at standard text sizing, including Special/mastery. Do not claim improved source resolution or device-pixel-perfect rendering on highDPI screens.
FR2 Retain four-column Military/Completionist/Prestige, three-column Special/mastery, narrow-screen shrinking, readable labels/status, accessible click targets and inline details. No progress/store/source-art changes.
SC1 allvisible image rectangles<=128CSSpx across320/390/768/1280/1920; Military2x4 and Special3 widthsconsistent. SC2 existing click/save/undo, 200%text, light/dark and three-engine journeys pass; review actual desktop/mobile screenshots.

## Clarification
No question required. This repairs CSS sizing only; source pictures remain original local128px swatches.

Sizing oracle: cross-tier equality is required at standard-font widths where four120px tracks plus gaps fit (1280/1920desktop checks). At320/390mobile, independent4/3column grids may shrink differently: preservecounts, <=128px previews and nooverflow, rather than forceequalmobilewidths.

## User scenario and acceptance
P1: A player opens any weapon's camo page and sees compact pictures without enlarged low-resolution swatches. Clicking a picture still opens requirements and a saved completion checkbox.
Given128px sourceimages, when viewed at1280/1920 with standardfont, alltiers andmastery show equal previewwidths<=128px. At320/390 retainfourMilitarycolumns/threeSpecialcolumns withshrink/nooverflow; at200%text retainreadablebuttons withoutpageoverflow.

## Functional requirements
FR1: Cap preview tracks so actual imagewidth never exceeds128CSSpx; standard desktop measurements targetabout108px with120px cards.
FR2: Preservefourtiers/modeview/controls/privatecompletion, accessibletext/focus/statuses and existingmobilebehavior. No source/art or save-format changes.

## Success criteria
SC1: Numericwidthoracles pass allprimary/mastery thumbnails in threeengines andbothsitevariants; original164/225px reproduction is removed.
SC2: Click/save/undo/reload/backup andkeyboard/320..1920/200%text/darklight checks pass withoutlostdata, overflow or displacedcheckboxes. Actualscreenshots reviewed; source128pxresolutionlimitation remains honest.
