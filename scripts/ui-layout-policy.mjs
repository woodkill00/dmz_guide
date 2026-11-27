const identity = (d) =>
  JSON.stringify([d.file, d.selector, d.property, d.value]);
export function unapprovedLayoutDeclarations(sheets, ledger) {
  const approved = new Set(ledger.entries.map(identity));
  return sheets
    .flatMap((s) =>
      s.rawLayoutDeclarations
        .filter(
          (d) => !(d.value.includes("calc(") && d.value.includes("var(--ui-")),
        )
        .map((d) => ({ ...d, file: s.file })),
    )
    .filter((d) => !approved.has(identity(d)));
}
