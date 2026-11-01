# Compact interface

The Guide uses a compact visual rhythm across page headings, panels, filters and collection cards. Wide screens get more working space; narrow screens stack controls. Inventory and upgrade density choices still work independently. Text, data, source uncertainty and action targets remain available.

**More** groups the remaining destinations into Guide pages/authoring, map tools and map planning/trackers. It uses columns when space permits and a bounded scrolling list on small screens or enlarged text. All existing destinations remain present. On the Guide, the selected catalog follows eligible same-origin links; private search text, context tokens and catalog parameters are not forwarded to companion apps.

Open the menu with a pointer or Enter/Space on its summary. Tab through its links normally. Escape closes it and returns focus to the summary. Clicking outside or moving focus outside closes it without stealing focus. Guide, Studio, map and map help share this behavior. Without JavaScript, native disclosure and navigation links still work; private application tools retain their existing JavaScript requirements.

Responsive sizing combines `calc()` viewport arithmetic, bounded `clamp()` spacing, `rem` text dimensions and intrinsic grid/flex layouts. `calc()` alone cannot guarantee correct layout. Primary targets remain at least44px, and growing text can increase control height. Subtle border feedback respects reduced motion; colors and layout sizes change immediately. Inventory reserves the normal draft-status text's intrinsic space so changing Short/Met/Check does not push the quantity input around. Longer recovery messages can still expand without clipping.

No profile, inventory, recipe, upgrade, map coordinate or floating-menu position is migrated by this redesign. The map workspace retains its existing theme/tools; this iteration compacts dialog contents and shared navigation without replacing its interface. Physical-device and screen-reader certification are outside automated browser evidence.

See [feature046 acceptance](../specs/046-compact-responsive-ui/acceptance.md) for the executed checks and exact scope.
