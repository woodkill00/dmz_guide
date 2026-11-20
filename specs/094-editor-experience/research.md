# Research and clarification

User authorized all proposed editor experience improvements2026-11-19. Defaults: same local repository Save and manual review; optional Save & refresh executes local static build; version history and disk checkpoints are ignored local state. No public auth/account integration or private-state mutation. No blocking clarification remains.

Inspected093 actual implementation: separate outline/preview/inspector; generic Data & requirements; numeric crop; browser IndexedDB recovery; server idempotent receipts; build transaction publisher; all source adapters. Reuse these owners rather than parallel editors.

Design references reviewed in preceding request: W3C form errors https://design-system.w3.org/styles/form-errors.html (linked summary/inline fixes/focus); WordPress block editor https://wordpress.org/documentation/article/wordpress-block-editor/ (outline/contextual controls/patterns). These inform UI decisions, not copied game content.

Known edge cases now contracted: browser switch vs origin-specific recovery, competing checkpoint writers, stale preview selections, history source/image eligibility, canonical status/version corrections, save success then build failure, restart with running job, unchanged reader after failed build, file quotas/symlinks and live author restart. Retain093 analysis/acceptance as prior snapshot evidence only.
