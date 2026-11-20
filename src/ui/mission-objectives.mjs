import { escapeHTML as e } from "./render.mjs";

// Render canonical instructions, shared by static chapter and live directory
// views. The caller owns spoiler permission before handing us a record.
export function renderMissionObjectives(record, { expanded = false } = {}) {
  const steps = record.steps || [];
  return `<details class="mission-objectives" data-mission-objectives="${e(record.id)}"${expanded ? " open" : ""}><summary>Objectives (${steps.length})</summary>${steps.length ? `<ol class="mission-objective-steps">${steps.map((step) => `<li>${e(step)}</li>`).join("")}</ol>` : "<p>Objectives have not been recorded for this mission.</p>"}</details>`;
}
