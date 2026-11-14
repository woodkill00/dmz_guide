export function missionPageHref(packId, id) {
  return `/local/?pack=${encodeURIComponent(packId)}&id=${encodeURIComponent(id)}`;
}

export function missionAuditHref(packId, id) {
  const target = `mission:${encodeURIComponent(packId)}:${encodeURIComponent(id)}:identity`;
  return `/missions/audit/?${new URLSearchParams({ pack: packId, target })}`;
}
