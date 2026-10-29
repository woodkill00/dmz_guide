import {stageEvidence,parseVertices,validateGeometry,geometryLength,type EvidenceAsset} from './owned-assets.ts';
import type {UIServices} from './ui-context.ts';
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
  process:UIServices["process"]=(work)=>work(new AbortController().signal),
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
  const observed=input(initial?.observedAt??'','date');observed.id='point-observed-at';
  const geometryType=select([{value:'point',label:'Point marker'},{value:'route',label:'Route / line'},{value:'area',label:'Shaded area'}],initial?.geometry?.kind??'point');geometryType.id='point-geometry-kind';
  const geometryColor=input(initial?.geometry?.color??'#d4de9b','color');geometryColor.id='point-geometry-color';
  const vertices=el('textarea');vertices.id='point-vertices';vertices.maxLength=8000;vertices.value=initial?.geometry?.vertices.map(v=>v.join(',')).join('\n')??'';
  const geometryFields=el('fieldset');geometryFields.append(el('legend','Route / area vertices'),note('Use one image X,Y per line. Pick a position on the map, then Add current X/Y vertex to build a route or area. Distances are image pixels, not game meters.'),field('Vertices (one X,Y per line)',vertices),field('Geometry color',geometryColor),button('Add current X/Y vertex',()=>{vertices.value+=(vertices.value.trim()?'\n':'')+x.value+','+y.value;dirty();update();},'add-geometry-vertex'));
  let attachments:EvidenceAsset[]=structuredClone(initial?.attachments??[]);
  const assetList=el('div');assetList.id='point-evidence-list';
  const showAssets=()=>{assetList.replaceChildren();for(const asset of attachments){const card=el('details'),caption=el('summary',asset.caption),image=el('img');image.src='data:image/png;base64,'+asset.base64;image.alt=asset.caption;image.className='workspace-image-preview';card.append(caption,image,button('Remove screenshot',()=>{attachments=attachments.filter(a=>a.id!==asset.id);dirty();showAssets();}));assetList.append(card);}};
  const evidenceFile=input('','file');evidenceFile.id='point-evidence-file';evidenceFile.accept='image/png,image/jpeg,image/webp';
  const caption=input('');caption.id='point-evidence-caption';
  const evidenceFields=el('details');evidenceFields.append(el('summary','Owned screenshots / gameplay evidence'),note('Up to4 screenshots per point,32total/8MiB. Images stay private, are stripped of metadata and normalized to PNG up to1600px. Private backups include them.'),field('Screenshot file',evidenceFile),field('Screenshot caption',caption),button('Attach owned screenshot',async()=>{try{if(attachments.length>=4)throw new Error('At most4 screenshots per point.');if(!own.checked)throw new Error('Confirm ownership/authorization before attaching evidence.');const file=evidenceFile.files?.[0];if(!file)throw new Error('Choose a screenshot.');const asset=await process(signal=>stageEvidence(file,caption.value,signal));if(attachments.some(a=>a.id===asset.id))throw new Error('This screenshot is already attached.');attachments.push(asset);evidenceFile.value='';caption.value='';dirty();showAssets();}catch(error){onError(error);}},'attach-point-evidence'),button('Clear selected screenshot',()=>{evidenceFile.value='';caption.value='';dirty();},'clear-point-evidence'),assetList);showAssets();
  const preview = el("p", undefined, "workspace-preview");
  preview.id = "point-preview";
  const update = () => {
    geometryFields.hidden=geometryType.value==='point';
    let geometryNote='';if(geometryType.value!=='point'){try{const g=validateGeometry({kind:geometryType.value,vertices:parseVertices(vertices.value),color:geometryColor.value});geometryNote=` · ${g.vertices.length} vertices · ${geometryLength(g).toFixed(1)} image pixels ${g.kind==='area'?'perimeter':'length'}`;}catch(e){geometryNote=' · '+(e instanceof Error?e.message:String(e));}}
    preview.textContent = `Preview: ${title.value || "Untitled"} · ${kind.value} · X ${x.value}, Y ${y.value} · ${category.value}${geometryNote}. Save to add this private point.`;
  };
  form.append(
    field("Title", title),
    field("Kind", kind),
    field("Geometry",geometryType),
    field("Category", category),
    field("X image position", x),
    field("Y image position", y),
    button("Pick position on map", onPick, "pick-point-position"),
    geometryFields,
    field("Observed date (optional)",observed),
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
    evidenceFields,
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
      if(evidenceFile.files?.length||caption.value.trim())throw new Error('Attach or clear the selected screenshot before saving the point.');
      const value = makeAnnotation({
        title: title.value,
        observedAt:observed.value||undefined,
        attachments,
        geometry:geometryType.value==='point'?undefined:validateGeometry({kind:geometryType.value,vertices:parseVertices(vertices.value),color:geometryColor.value}),
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
