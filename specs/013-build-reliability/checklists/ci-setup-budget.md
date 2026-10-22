# Independent CI setup-budget requirements gate

Reviewed 2026-10-22 before workflow edits.

- [x] Actual setup-starvation and unchanged successful retry receipts distinguish infrastructure cancellation from assertion failures.
- [x] Scope is exactly a 40-minute browser-engines job and a 25-minute cap on its existing install step; both finite and nested, with no guaranteed remaining duration.
- [x] Commands, action pins, permissions, dependencies, platforms, coverage, health, product/test deadlines and failure semantics remain unchanged.
- [x] Owning spec/plan and T040–T042 trace implementation, exact-source review and honest external release conditions.
- [x] No new product feature, fifth wave, automatic retries or inferred network root cause is authorized.
- [x] Final-head CI, normal expected-head merge and exact-main results remain required and cannot be preclaimed.

Requirements gate approved. Exact YAML delta and final hosted/main gates remain separate.
