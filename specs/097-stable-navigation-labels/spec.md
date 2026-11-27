# Stable navigation labels

FR01 Rename primary Prepare to Track; rename the former Track feature category to Progression so separate tasks do not share a navigation label. Action verbs such as Track upgrade are not navigation labels and remain unchanged.

FR02 Central configuration owns primary-menu IDs/labels, group display names and stable group anchors, plus shared workspace menu label overrides. Routes resolve by existing feature IDs through featureURL; no route or saved preference identity migration. Preserve /features/#prepare and /features/#track bookmarks as stable group identities despite new displayed names.

FR03 Menu enhancement selects stable data attributes rather than aria labels/display text. Breadcrumbs, all-features headings/cards and topology group display use configured names and fixed IDs. Primary labels must be unique; group labels must be unique. Configuration label changes cannot alter destination URLs or order-menu insertion.

FR04 Preserve guide/map/help/Studio/manager surfaces, legacy/modern navigation, query/hash/pack context and existing companion boundaries. Do not expose new services, change source rights or alter account/profile state.

SC01 Focused tests mutate injected display labels and show identical hrefs, IDs, group anchors and menu behavior. Verify renamed labels and no old conflicting Track category.
SC02 Build/audit shared navigation on generated pages; browser journeys cover current-origin Track, Progression/Orders menu, breadcrumbs/old anchors, map surface and mobile. Independent review, formatting and repository checks before completion.
