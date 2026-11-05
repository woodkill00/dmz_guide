const text = (x, n) => typeof x === "string" && x.length > 0 && x.length <= n;
export function createIssueSummary() {
  const issues = new Map();
  let status = "";
  return {
    report(value) {
      if (
        !value ||
        !text(value.owner, 256) ||
        !text(value.cause, 256) ||
        !text(value.message, 8000) ||
        !["error", "warning", "info"].includes(value.severity ?? "error")
      )
        throw Error("Invalid issue");
      if (value.target !== undefined && !text(value.target, 512))
        throw Error("Invalid issue target");
      const key = JSON.stringify([value.owner, value.cause]);
      if (!issues.has(key) && issues.size >= 128)
        throw Error("Issue owner limit reached");
      issues.set(key, {
        owner: value.owner,
        cause: value.cause,
        message: value.message,
        severity: value.severity ?? "error",
        blocking: value.blocking === true,
        ...(value.target ? { target: value.target } : {}),
      });
      return key;
    },
    clear(owner, cause) {
      return issues.delete(JSON.stringify([owner, cause]));
    },
    clearOwner(owner) {
      for (const [key, i] of issues) if (i.owner === owner) issues.delete(key);
    },
    status(value) {
      if (typeof value !== "string" || value.length > 2000)
        throw Error("Invalid status");
      status = value;
    },
    snapshot() {
      const list = [...issues.values()].sort(
        (a, b) =>
          Number(b.blocking) - Number(a.blocking) ||
          { error: 0, warning: 1, info: 2 }[a.severity] -
            { error: 0, warning: 1, info: 2 }[b.severity],
      );
      return {
        count: list.length,
        severity: list[0]?.severity ?? "none",
        label: list.length
          ? `${list.length} issue${list.length === 1 ? "" : "s"} need attention`
          : status,
        status,
        issues: structuredClone(list),
      };
    },
  };
}
