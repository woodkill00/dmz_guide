import type { CoordinateFrame } from "./types.ts";
import type { Anchor, Registration } from "./registration.ts";
import { registerFrame } from "./registration.ts";
import { el, button, field, input, note } from "./dom.ts";
export function registrationPanel(
  frame: CoordinateFrame,
  sourceURL: string | undefined,
  canonicalURL: string,
  accept: (r: Registration) => Promise<void>,
  cancel: () => void,
  onError: (e: unknown) => void,
) {
  const panel = el("section");
  panel.id = "registration-panel";
  panel.append(
    el("h3", "Register source coordinates"),
    note(
      "Use at least3 fit landmarks and2 different held-out landmarks. Spread them across the image, including a held-out edge landmark. Each row: source X, source Y, canonical X, canonical Y, evidence. Residual limits:8px RMS,16px maximum.",
    ),
  );
  const previews = el("div", undefined, "registration-images");
  const source = el("img"),
    canonical = el("img");
  source.alt = "Source image for landmark selection";
  canonical.alt = "Canonical image for landmark selection";
  if (sourceURL) source.src = sourceURL;
  else source.hidden = true;
  canonical.src = canonicalURL;
  previews.append(source, canonical);
  panel.append(previews);
  const fit = el("textarea"),
    holdout = el("textarea");
  fit.id = "registration-fit";
  holdout.id = "registration-holdout";
  fit.rows = 4;
  holdout.rows = 3;
  fit.placeholder = "0, 0, 0, 0, Landmark description";
  holdout.placeholder =
    "Source X, Source Y, Canonical X, Canonical Y, Evidence";
  const reviewer = input("Local author");
  reviewer.id = "registration-reviewer";
  const axes = input("", "checkbox");
  axes.id = "registration-axes";
  const pick = note(
    "Click a source landmark, then its matching canonical landmark to append a row. Numeric entry is always available.",
  );
  const target = input("", "checkbox");
  let pending: { x: number; y: number } | undefined;
  source.addEventListener("click", (event) => {
    invalidate();
    if (!frame.width || !frame.height) return;
    const r = source.getBoundingClientRect();
    const crop = frame.crop ?? {
      x: 0,
      y: 0,
      width: frame.width,
      height: frame.height,
    };
    pending = {
      x: crop.x + ((event.clientX - r.left) / r.width) * crop.width,
      y: crop.y + ((event.clientY - r.top) / r.height) * crop.height,
    };
    pick.textContent = `Source ${pending.x.toFixed(2)},${pending.y.toFixed(2)} selected. Click its canonical landmark, then replace the evidence placeholder.`;
  });
  canonical.addEventListener("click", (event) => {
    if (!pending) return;
    const r = canonical.getBoundingClientRect(),
      x = ((event.clientX - r.left) / r.width) * 4096,
      y = ((event.clientY - r.top) / r.height) * 4096;
    const area = target.checked ? holdout : fit;
    area.value +=
      (area.value.trim() ? "\n" : "") +
      `${pending.x.toFixed(2)}, ${pending.y.toFixed(2)}, ${x.toFixed(2)}, ${y.toFixed(2)}, Describe this landmark`;
    pending = undefined;
    invalidate();
  });
  panel.append(
    pick,
    field("Append picked pairs to held-out landmarks", target),
    field("Fit landmarks", fit),
    field("Held-out landmarks", holdout),
    field("Reviewer", reviewer),
    field("I explicitly reviewed any crop, rotation or reversed axes.", axes),
  );
  const residual = note("No calibration accepted yet.");
  residual.id = "registration-residual";
  panel.append(residual);
  let staged: Registration | undefined;
  const parse = (text: string): Anchor[] =>
    text
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(",");
        if (parts.length < 5)
          throw new Error("Each landmark needs four coordinates and evidence.");
        if (parts.slice(0, 4).some((p) => !p.trim()))
          throw new Error("Landmark coordinates cannot be blank.");
        return {
          x: Number(parts[0]),
          y: Number(parts[1]),
          targetX: Number(parts[2]),
          targetY: Number(parts[3]),
          evidence: parts.slice(4).join(",").trim(),
        };
      });
  const approve = button(
    "Accept registration",
    async () => {
      if (!staged) return;
      try {
        await accept(staged);
      } catch (error) {
        onError(error);
      }
    },
    "accept-registration",
  );
  approve.disabled = true;
  const invalidate = () => {
    staged = undefined;
    approve.disabled = true;
  };
  panel.addEventListener("input", invalidate);
  panel.append(
    button(
      "Validate calibration",
      () => {
        try {
          staged = registerFrame(
            frame,
            parse(fit.value),
            parse(holdout.value),
            reviewer.value,
            axes.checked,
          );
          residual.textContent = `RMS ${staged.rms.toFixed(2)}px · maximum ${staged.maxError.toFixed(2)}px. Review before accepting.`;
          approve.disabled = false;
        } catch (error) {
          invalidate();
          onError(error);
        }
      },
      "validate-registration",
    ),
    approve,
    button("Cancel registration", cancel),
  );
  return panel;
}
