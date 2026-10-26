import type { Annotation, Workspace } from "./model.ts";
import { makeAnnotation } from "./annotations.ts";
import { el, button, field, input, select, note } from "./dom.ts";
export function annotationEditor(
  state: Workspace,
  initial: Annotation | undefined,
  position: { x: number; y: number } | undefined,
  save: (annotation: Annotation) => Promise<void>,
  cancel: () => void,
  dirty: () => void,
  onPick: () => void,
  onError: (error: unknown) => void,
) {
  const form = el("form");
  form.id = "point-form";
  form.className = "annotation-form";
  form.append(
    el("h3", initial ? "Edit private point" : "New private point"),
    note(
      "Canonical image pixels (0–4096). These are image coordinates, not game grid squares.",
    ),
  );
  const title = input(initial?.title ?? "");
  title.required = true;
  title.id = "point-title";
  const kind = select(
    ["POI", "location", "mark"].map((value) => ({ value, label: value })),
    initial?.kind ?? "POI",
  );
  kind.id = "point-kind";
  const category = input(initial?.category ?? "My locations");
  category.id = "point-category";
  category.required = true;
  const x = input(String(position?.x ?? initial?.x ?? 2048), "number"),
    y = input(String(position?.y ?? initial?.y ?? 2048), "number");
  x.id = "point-x";
  y.id = "point-y";
  for (const f of [x, y]) {
    f.min = "0";
    f.max = "4096";
    f.step = "0.01";
    f.required = true;
  }
  const notes = el("textarea");
  notes.value = initial?.notes ?? "";
  notes.maxLength = 4000;
  notes.id = "point-notes";
  const evidence = el("textarea");
  evidence.value = initial?.evidence ?? "";
  evidence.maxLength = 4000;
  evidence.id = "point-evidence";
  const floor = input(initial?.applicability.floor ?? "", "text", 128),
    build = input(initial?.applicability.gameBuild ?? "", "text", 128);
  const verification = select(
    [
      { value: "unverified", label: "Unverified" },
      { value: "observed", label: "Observed in my gameplay" },
    ],
    initial?.verificationState ?? "unverified",
  );
  const icon = select(
    [
      { value: "", label: "Category default / built-in marker" },
      ...state.icons.map((i) => ({ value: i.id, label: i.description })),
    ],
    initial?.iconId ?? "",
  );
  icon.id = "point-icon";
  const own = input("", "checkbox");
  own.required = true;
  own.checked = !!initial;
  own.id = "point-owned";
  const preview = el("p", undefined, "workspace-preview");
  preview.id = "point-preview";
  const update = () => {
    preview.textContent = `Preview: ${title.value || "Untitled"} · ${kind.value} · X ${x.value}, Y ${y.value} · ${category.value}. Save to add this private point.`;
  };
  form.append(
    field("Title", title),
    field("Kind", kind),
    field("Category", category),
    field("X image position", x),
    field("Y image position", y),
    button("Pick position on map", onPick, "pick-point-position"),
    field("Floor (blank means unknown)", floor),
    field("Game build (blank means unknown)", build),
    field("Notes", notes),
    field("Evidence / gameplay observation", evidence),
    field("Verification state", verification),
    field("Icon override", icon),
    field(
      "This is my own observation/content, or I am authorized to use it.",
      own,
    ),
    preview,
  );
  form.addEventListener("input", () => {
    dirty();
    update();
  });
  form.addEventListener("change", () => {
    dirty();
    update();
  });
  const submit = el("button", initial ? "Save changes" : "Save private point");
  submit.type = "submit";
  submit.id = "save-point";
  form.append(submit, button("Cancel editing", cancel, "cancel-point"));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    submit.disabled = true;
    try {
      const value = makeAnnotation({
        title: title.value,
        x: Number(x.value),
        y: Number(y.value),
        kind: kind.value as Annotation["kind"],
        category: category.value,
        notes: notes.value,
        evidence: evidence.value,
        floor: floor.value,
        gameBuild: build.value,
        iconId: icon.value || null,
        verificationState:
          verification.value as Annotation["verificationState"],
      });
      await save(
        initial
          ? { ...value, id: initial.id, createdAt: initial.createdAt }
          : value,
      );
    } catch (error) {
      onError(error);
    } finally {
      submit.disabled = false;
      if (submit.isConnected) submit.focus();
    }
  });
  update();
  return form;
}
