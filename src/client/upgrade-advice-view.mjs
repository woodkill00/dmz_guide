import { upgradeAdvice } from "../domain/upgrade-advice.mjs";
import { spoilerGuard } from "../domain/progression.mjs";
import { escapeHTML as esc } from "../ui/render.mjs";
export function adviceMarkup(
  pack,
  profile,
  { scope = "all-known-incomplete", itemId = null, offset = 0 } = {},
) {
  const advice = upgradeAdvice(pack, profile, { scope });
  if (advice.status === "blocked")
    return `<p class="notice">Keep/Search unavailable: ${advice.reasons.map(esc).join("; ")}</p>`;
  const guard = spoilerGuard(pack, profile.spoilers),
    matching = advice.rows.filter((r) => !itemId || r.id === itemId),
    rows = matching.slice(offset, offset + 50);
  const amount = (n) => (n === null ? "Not known" : esc(n));
  return `<p>${esc(advice.coverageNote)}</p><p>Scope: ${scope === "focused" ? "Focused upgrades" : "All known not marked complete"}. ${advice.includedCount} included known objectives; ${advice.excludedCount} recorded completed roots excluded; ${advice.unknownCount} included upgrades have unknown completion. These visible counts are not a complete game denominator.</p><p>Direct requirements only — crafting routes are separate. ${advice.privacyLimited ? "Some scope is omitted to protect spoilers." : ""} Manual inventory is a snapshot: update it after an in-game purchase.</p><p>${matching.length} visible material/currency rows; showing ${rows.length ? offset + 1 : 0}–${offset + rows.length}. Units are never added together.</p><div class="card-grid">${
    rows
      .map((row) => {
        const locations = pack.locations.filter(
          (l) =>
            l.itemIds.includes(row.id) &&
            (!l.spoiler || profile.spoilers) &&
            pack.maps.some(
              (m) => m.id === l.mapId && (!m.spoiler || profile.spoilers),
            ) &&
            l.sourceIds?.length &&
            ["observed", "verified"].includes(l.status),
        );
        return `<article class="panel" data-advice-item="${esc(row.id)}"><h3>${esc(row.name)}</h3><p>${row.noKnownNeed ? "No known need in this scope" : "Used by known upgrades not marked complete"} · ${row.horizon === "now" ? "Now · manual model only" : "Later / eligibility unknown"}</p><dl><dt>Unit</dt><dd>${esc(row.unit)}</dd><dt>Known direct requirement</dt><dd>${amount(row.required)}</dd><dt>Held</dt><dd>${row.inventoryEntered ? amount(row.held) : "Not entered"}</dd><dt>Keep from available held stock</dt><dd data-advice-keep>${amount(row.keep)}</dd><dt>Search additional</dt><dd data-advice-search>${amount(row.search)}</dd><dt>Upgrade gap</dt><dd>${amount(row.upgradeGap)}</dd><dt>Unfilled reserve gap</dt><dd>${amount(row.reserveGap)}</dd><dt>Your fixed reserve / currently protected</dt><dd>${row.reserve} / ${amount(row.reserveProtected)}</dd></dl><ul>${row.reasons.map((reason) => `<li>${esc(reason)}</li>`).join("")}</ul><details><summary>Known unfinished uses (${row.contributors.length})</summary><ul>${row.contributors
          .slice(0, 32)
          .map(
            (c) =>
              `<li><a href="/local/?pack=${encodeURIComponent(pack.id)}&amp;id=${encodeURIComponent(c.id)}">${esc(guard.text(c.name))}</a>: ${amount(c.quantity)} · ${esc(c.consumption)} · ${esc(c.horizon)}${c.partial ? " · additional costs may exist" : ""}</li>`,
          )
          .join(
            "",
          )}</ul>${row.contributors.length > 32 ? "<p>First 32 contributors shown; narrow to Focused for detail.</p>" : ""}</details><button type="button" data-watch-pin="${esc(row.id)}" aria-pressed="${row.watchPinned}">${row.watchPinned ? "Remove your watch pin" : "Add your watch pin"}</button><button type="button" data-advice-detail="${esc(row.id)}">View item here</button>${locations.length ? `<button type="button" data-advice-location="${esc(row.id)}">Source-backed location references</button>` : "<p>Locations not verified.</p>"}</article>`;
      })
      .join("") ||
    "<p>No known need in this scope. This is not a discard recommendation. Your watch pins and reserves remain your own rules.</p>"
  }</div>${matching.length > 50 ? `<p>Bounded to 50 rows per page.</p><button type="button" data-advice-page="${Math.max(0, offset - 50)}" ${offset === 0 ? "disabled" : ""}>Previous materials</button><button type="button" data-advice-page="${offset + 50}" ${offset + 50 >= matching.length ? "disabled" : ""}>Next materials</button>` : ""}`;
}
