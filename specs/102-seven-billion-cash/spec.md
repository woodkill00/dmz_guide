# Seven billion maximum cash
FR01: User-requested application cash stock/reserve maximum is exactly7,000,000,000 inclusive. Reject7,000,000,001. Use existing shared currency constant; do not assert a game bank cap. Keep noncurrency, legacy, costs/goals, carried and transfer bounds unchanged.
FR02: Save raw/grouped maximum exactly, reload with separators, backup roundtrip and upgrade purchase/refund at maximum preserve precision and unrelated data; explicit legacy format confirmation retained.
FR03: UI cash limits/guidance match the shared constant. Scoped regression tests and independent review; no new schema, private data edits or external sources.
