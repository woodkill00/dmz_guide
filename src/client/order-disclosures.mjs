// Session view choices only; this controller never saves player progress.
export function createOrderDisclosures(root, getPackId) {
  const choices = new Map();
  const keyFor = (details) =>
    details.hasAttribute("data-order-disclosure")
      ? "page:" + details.dataset.orderDisclosure
      : details.hasAttribute("data-mission-objectives")
        ? "mission:" + details.dataset.missionObjectives
        : null;
  root.addEventListener("click", (event) => {
    if (
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.shiftKey ||
      event.defaultPrevented
    )
      return;
    const summary = event.target.closest("summary"),
      details = summary?.parentElement;
    if (!details || !root.contains(details)) return;
    const key = keyFor(details);
    if (!key) return;
    event.preventDefault();
    details.open = !details.open;
    choices.set(getPackId() + "|" + key, details.open);
    if (choices.size > 2048) choices.delete(choices.keys().next().value);
  });
  return {
    apply(active, packId = getPackId()) {
      for (const details of root.querySelectorAll(
        "details[data-order-disclosure],details[data-mission-objectives]",
      )) {
        const key = keyFor(details),
          saved = choices.get(packId + "|" + key),
          page = details.closest("[data-order-key]")?.dataset.orderKey;
        const desired = saved ?? active.has(page);
        if (
          !desired &&
          saved === undefined &&
          details.contains(document.activeElement)
        )
          continue;
        details.open = desired;
      }
    },
  };
}
