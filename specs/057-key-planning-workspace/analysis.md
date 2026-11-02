# Analysis and repair cycle

Definition review: PASS after specifying preserved historical IDs and explicit async epoch/revision ownership. Implementation review remains pending; do not interpret this report as acceptance.

| Finding | Owner repair | Verification |
|---|---|---|
| Reload could race late save and overwrite newer values | Disable/reject reload during owned save or restore | Held-save real browser regression |
| Native partial exponent treated as blank uses | Check `validity.badInput`, preserve invalid buffer | Keyboard numeric regression |
| Late restore/raw-export errors and modified links | Guard async errors; retain native modifiers/downloads | Source review and browser checks |
| Mill floor/unlocked conflict, Netshin floor, broad floor claims and core-count mismatch | Preserve scoped source reports and unlocked uncertainty | Catalog tests and independent review |
| Acquisition instructions in three room entrance fields | Separate room entrance from unchanged acquisition steps | Independent content review |
| Restore appeared Saved while write pending | Explicit applying status | Preview/apply browser regression |

No critical finding may remain at acceptance. Test failures remain work items until repaired and rerun.

Final convergence: all reported implementation/content/mobile findings repaired. Runtime760/760, map178/178, all-three-engine strict-health private/legacy journeys,54axe scans and source-equivalent build receipts are recorded in acceptance.md. No unresolved implementer finding remains; independent final gate is reviewer-owned and must be read separately. Manual fallback only, no automated skill execution claimed.
