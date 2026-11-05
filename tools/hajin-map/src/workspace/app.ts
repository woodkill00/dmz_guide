import { groupMapCategories, type CategoryInput } from "../map/category-groups.ts";
import {mountSelectionPane} from '../map/selection-pane.ts';
import {createPaneViewState} from './pane-view-state.ts';
import {createOperationOwnership,type OperationTicket} from '../../../../src/ui/operation-ownership.mjs';
import {createIssueSummary} from '../../../../src/ui/issue-summary.mjs';
import {mountPaneHost} from './pane-host.ts';
import {backupComparisonPanel} from './operations-ui.ts';
import {createFieldGuideUI} from './field-guide-ui.ts';
import {plannedDuplicates,decorateRecord} from './field-guide.ts';
import type {XY} from './roads.ts';
import {markerPopupOptions} from '../map/marker-popup.ts';
import {parseIconPack,exportIconPack} from './icon-packs.ts';
import {healthPanel} from './health-panel.ts';
import { workspaceDestination, type ToolTarget } from '../tool-links.ts';
import L from "leaflet";
import type { createMapView } from "../map/map-view";
import type { createSourceMarkers } from "../map/source-markers";
import { markerSources } from "../map/marker-sources";
import type { Workspace, Annotation, IconAsset } from "./model.ts";
import { emptyWorkspace, asJson } from "./model.ts";
import type { VisibilityState } from "./types.ts";
import { openWorkspace } from "./store.ts";
import { createWorkspacePreparer } from "./prepare.ts";
import { readJSONFile } from "./import.ts";
import { planLegacyMaskMigration, stageMaskMigration } from "./migration.ts";
import {
  validateWorkspace,
  exportPrivateBackup,
  parsePrivateBackup,
  verifyBackupAssets,
  estimateRestoreStorage,
  placedRecords,
} from "./backup.ts";
import {
  el,
  button,
  field,
  input,
  select,
  note,
  download,
  errorText,
} from "./dom.ts";
import { sourcePolicies } from "./policy.ts";
import { saveAnnotation, removeAnnotation } from "./annotations.ts";
import { annotationEditor,saveAnnotationEditor } from "./annotation-editor.ts";
import { stageIcon, commitIcon, deleteIcon, annotationIcon } from "./icons.ts";
import { createIconStudio, downloadIconSVG, downloadIconPNG } from './icon-studio.ts';
import { stageDesignedIcon } from './icons.ts';
import { sourcePanel } from "./sources-panel.ts";
import { reviewPanel } from "./review-panel.ts";
import {
  globalVisibility,
  isVisible,
  sourceSelection,
  setSourceAll,
} from "./visibility.ts";
import { createBasemapComparison } from "./basemap-view.ts";
import { registrationMatches } from "./registration.ts";
import {
  displayDuplicates,
  type DisplayRecord,
} from "../map/display-duplicates.ts";
import type { UIServices } from "./ui-context.ts";
import { createUsabilityUI } from "./usability-panel.ts";
import { createSourceUpdates } from "./source-updates.ts";
import { captureSource } from "../map/current-captures.ts";
import type { MarkerSource } from "../map/marker-sources.ts";
import { sourceAdmission } from "../map/source-admission.ts";
import { explorerRecords, loadedIdentity } from "./explorer-index.ts";
import {
  emptyUsability,
  isMeaningfulMutation,
  readReceipt,
  writeReceipt,
  reminderStatus,
  RECEIPT_KEY,
  type Receipt,
} from "./usability.ts";
type Legacy = ReturnType<typeof createSourceMarkers>;
type Viewer = ReturnType<typeof createMapView>;
type Tab = "planner" | "health" | "points" | "sources" | "review" | "icons" | "backup" | "explore";
export function mountWorkspace(
  viewer: Viewer,
  legacy: Legacy[],
  addSource?: (source: MarkerSource) => Legacy,
) {
  let state = emptyWorkspace(),
    revision = 0,
    store: Awaited<ReturnType<typeof openWorkspace>> | undefined,
    disposed = false,
    suspended = false,
    queue = Promise.resolve(),
    applyingFilters = false,
    dirty = false,
    detailActive = false,
    usabilityDetail = false,
    detailCleanup: (() => void) | undefined,
    active: Tab = "points",
    currentTool:ToolTarget|undefined,
    editing: Annotation | undefined,
    picking = false,
    draftPosition: { x: number; y: number } | undefined,
    filterTimer: ReturnType<typeof setTimeout> | undefined;
  legacy.forEach((source) => source.setLegacyPersistence(false));
  let legacyMigrationCommitted = false,deferredLegacyFilters=false;
  let retainedFailure = false;
  const preparer = createWorkspacePreparer();
  const modern=document.documentElement.dataset.uiVariant==='modern';
  let viewGeneration=0,draftSerial=0,writing=0,writeSlow=false,unconfirmedWrite=false,unconfirmedRevision:number|undefined;
  let unconfirmedTicket:OperationTicket|undefined;
  const operationOwner=createOperationOwnership({ownerId:'map-workspace',context:{workspace:'hajin',pack:null,profile:null,revision:0}});
  const issues=createIssueSummary();
  let hydrated = false,
    pendingVisibility: VisibilityState | undefined,
    visibilityEpoch = 0;
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  const visibility = () => pendingVisibility ?? state.visibility;
  let plannerUI:ReturnType<typeof createFieldGuideUI>|undefined;
  let plannerPick:((point:XY)=>void)|undefined;
  let showDuplicateMarkers = false;
  let duplicatePlan = displayDuplicates([]);
  let capacityExcluded = new Set<string>();
  let unsaved: Workspace | undefined,
    failedLabel: string | undefined,
    processing: AbortController | undefined;
  let selectedBackgroundId = "",
    backgroundRequest = 0,
    comparisonOpacity = 50,
    comparisonSignature = "";
  const selectedSnapshots = new Map<string, string>(),
    customLayer = L.layerGroup().addTo(viewer.map),
    sourceLayer = L.layerGroup().addTo(viewer.map),
    reviewedLayer = L.layerGroup().addTo(viewer.map),
    renderer = L.canvas({ padding: 0.5 }),
    comparison = createBasemapComparison(viewer.map);
  const loadedKey = (sourceId: string, recordId: string) =>
    JSON.stringify([sourceId, "loaded", recordId]);
  function computeDisplayPlan() {
    const active = new Map(
      state.snapshots.map((e) => [e.snapshot.sourceId, e]),
    );
    for (const [source, key] of selectedSnapshots) {
      const entry = state.snapshots.find((e) => e.key === key);
      if (entry) active.set(source, entry);
    }
    const authoritative = new Map(
      [...active]
        .filter(([, entry]) => !entry.legacy)
        .map(([id, entry]) => [id, entry.snapshot.records.length]),
    );
    capacityExcluded = sourceAdmission(
      authoritative,
      new Map(legacy.map((s) => [s.id, s.getSnapshot()?.records.length ?? 0])),
      visibility().sourceEnabled,
    ).excluded;
    for (const source of legacy)
      source.setCapacityBlocked(capacityExcluded.has(source.id));
    const records: DisplayRecord[] = [];
    for (const source of legacy) {
      if (capacityExcluded.has(source.id)) continue;
      if (active.has(source.id) && !active.get(source.id)!.legacy) continue;
      for (const r of source.getSnapshot()?.records.filter(r=>r.x!==null&&r.y!==null) ?? [])
        records.push({
          key: loadedKey(source.id, r.id),
          identity: loadedIdentity(source, r.id) ?? undefined,
          sourceId: source.id,
          category: r.category,
          title: r.name,
          x: r.x! * 4096,
          y: r.y! * 4096,
          floor: r.floor == null ? null : String(r.floor),
          build: null,
          visible: isVisible(
            visibility(),
            source.id,
            r.category,
            `${r.name} ${r.category}`,
            true,
          ),
        });
    }
    const rawBySource = new Map(
      [...active].map(([id, entry]) => [
        id,
        new Map(entry.snapshot.records.map((r) => [r.id, r])),
      ]),
    );
    for (const p of placedRecords(state, selectedSnapshots)) {
      const entry = active.get(p.sourceId);
      if (!entry || entry.legacy) continue;
      const raw = rawBySource.get(p.sourceId)!.get(p.recordId)!;
      records.push({
        key: p.key,
        identity: entry
          ? JSON.stringify([
              p.sourceId,
              entry.snapshot.snapshotId,
              entry.digest,
              p.recordId,
            ])
          : undefined,
        sourceId: p.sourceId,
        category: raw.categoryId,
        title: p.title,
        x: p.x,
        y: p.y,
        floor: p.applicability.floor,
        build: p.applicability.gameBuild,
        visible: isVisible(
          visibility(),
          p.sourceId,
          raw.categoryId,
          `${p.title} ${p.category}`,
          true,
        ),
      });
    }
    duplicatePlan = plannedDuplicates(
      records,
      showDuplicateMarkers,
      state.usability?.separate ?? [],state.fieldGuide?.duplicateDecisions??[],
    );
  }
  const openButton = button(
    "My workspace",
    () => {
      if (!dialog.open) openWorkspacePane();
      if (!dirty && !detailActive) renderPanel();
    },
    "workspace-open",
  );
  openButton.disabled = true;
  openButton.className = "workspace-open";
  document.querySelector(".map-workspace")!.append(openButton);
  const dialog = el("dialog");
  dialog.id = "workspace-dialog";
  dialog.setAttribute("aria-labelledby", "workspace-title");
  const top = el("div", undefined, "dialog-top"),
    heading = el("strong", "MY MAP WORKSPACE");
  heading.id = "workspace-title";
  top.append(
    heading,
    button(
      "Close workspace",
      () => {
        if(paneHost){paneHost.request({id:"close-workspace",label:"Close workspace",run:()=>dialog.close(),revalidate:()=>!disposed});return;}
        if (interactionLocks && !processing) {
          notice("Wait for the source update to finish.");
          return;
        }
        processing?.abort();
        dialog.close();
      },
      "close-workspace",
    ),
  );
  const status = el("p", "Opening your private workspace…", "workspace-status");
  status.id = "workspace-message";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  const nav = el("nav");
  nav.setAttribute("aria-label", "Workspace sections");
  const body = el("div");
  body.id = "workspace-content";
  let interactionLocks = 0;
  let saveActiveDraft:(()=>Promise<boolean>)|undefined;
  let disposeActiveEditor:(()=>void)|undefined;
  let reconcileConfirmedEditor:(()=>void)|undefined;
  function lockInteraction() {
    const steadyBossList = !!body.querySelector('.boss-directory');
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : undefined;
    interactionLocks++;
    body.inert = true;
    nav.inert = true;
    body.setAttribute("aria-busy", "true");
    const cancel = document.getElementById(
      "cancel-workspace-draft",
    ) as HTMLButtonElement | null;
    if (cancel) cancel.disabled = true;
    return () => {
      interactionLocks = Math.max(0, interactionLocks - 1);
      body.inert = nav.inert = interactionLocks > 0;
      body.setAttribute("aria-busy", String(interactionLocks > 0));
      if (cancel) cancel.disabled = interactionLocks > 0;
      const activeFocus=document.activeElement;
      const restoreBossFocus=(!modern&&!steadyBossList)||!activeFocus||activeFocus===document.body||activeFocus===dialog||activeFocus===previous;
      if (!interactionLocks && dialog.open && restoreBossFocus && (!modern||!suspended)) {
        const replacement = steadyBossList && previous?.id ? document.getElementById(previous.id) : null;
        if (replacement instanceof HTMLElement && !('disabled' in replacement && replacement.disabled)) replacement.focus({preventScroll:true});
        else if (previous?.isConnected) previous.focus({preventScroll:steadyBossList});
        else {
          const title = body.querySelector<HTMLElement>("h3");
          title?.setAttribute("tabindex", "-1");
          title?.focus({preventScroll:steadyBossList});
        }
      }
    };
  }
  dialog.append(top, status, nav, body);
  document.body.append(dialog);
  const viewCache=createPaneViewState(body,()=>({workspace:'hajin',pack:null,profile:null,revision,capture:String(backgroundRequest)}));
  const viewTask=()=>currentTool??active;
  const captureCleanView=()=>{if(modern&&!dirty&&!detailActive&&!processing&&!unsaved)viewCache.capture(viewTask());};
  const paneHost=mountPaneHost(dialog,{getState:()=>({dirty:dirty||(detailActive&&!usabilityDetail)||!!unsaved,saveAvailable:!!saveActiveDraft,waiting:writeSlow,committing:writing>0||unconfirmedWrite||(!!pendingVisibility&&!retainedFailure),processing:!!processing||interactionLocks>0}),save:async()=>saveActiveDraft?saveActiveDraft():false,discard:()=>{if(writing||unsaved||unconfirmedWrite||processing||interactionLocks)throw new Error('Wait for the existing operation to finish.');detailCleanup?.();detailCleanup=undefined;detailActive=false;dirty=false;editing=undefined;draftPosition=undefined;plannerPick=undefined;plannerUI?.reset();renderPanel();},revealTask:()=>document.querySelector<HTMLButtonElement>('#ui-task-view')?.click(),onClose:()=>document.querySelector<HTMLButtonElement>('#ui-map-view')?.click(),onBlocked:message=>notice(message)});
  function openWorkspacePane(){if(paneHost)paneHost.open();else dialog.showModal();}
  const backupReminder = el("section", undefined, "workspace-backup-reminder");
  backupReminder.id = "backup-reminder";
  backupReminder.hidden = true;
  status.after(backupReminder);
  const checkSave=button('Check save status',async()=>{if(writing||!store){error('The current save is still pending. Keep this page open.');return;}try{const result=(await store.read()).current;if(unconfirmedWrite&&unsaved&&result&&result.revision===unconfirmedRevision&&JSON.stringify(result.data)===JSON.stringify(asJson(unsaved))){validateWorkspace(result.data);if(!unconfirmedTicket||!operationOwner.settle(unconfirmedTicket,{outcome:'confirmed',receipt:result},{verifyReceipt:r=>r===result}).accepted)throw new Error('The retained save owner could not confirm this receipt. Keep your recovery state.');state=unsaved;revision=result.revision;unsaved=undefined;failedLabel=undefined;retainedFailure=false;unconfirmedWrite=false;unconfirmedRevision=undefined;unconfirmedTicket=undefined;dirty=false;issues.clear('map-workspace','write');issues.clear('map-workspace','workspace');issues.clear('map-workspace','write-pending');renderPanel();notice('The saved revision is confirmed. Review your destination, then continue.');paneHost?.refresh();}else notice('No matching saved revision was confirmed. Your draft and existing recovery state are kept.');}catch(cause){error(cause);}},'workspace-check-save');
  checkSave.hidden=true;
  if(modern)top.append(checkSave);
  const searchHighlight = L.layerGroup().addTo(viewer.map);
  let highlightRecord: { key: string; signature: string } | undefined;
  const highlightSignature = (r: ReturnType<typeof explorerRecords>[number]) =>
    JSON.stringify([
      r.identity,
      r.x,
      r.y,
      r.title,
      r.category,
      r.notes,
      r.status,
    ]);
  function clearHighlight() {
    searchHighlight.clearLayers();
    highlightRecord = undefined;
  }
  function refreshHighlight() {
    if (!highlightRecord) return;
    const r = getExplorerRecords().find((r) => r.key === highlightRecord!.key);
    if (!r || highlightSignature(r) !== highlightRecord.signature)
      clearHighlight();
  }
  function receipt(): Receipt | null {
    try {
      return readReceipt(localStorage);
    } catch {
      return null;
    }
  }
  function saveReceipt(value: Receipt) {
    try {
      return writeReceipt(localStorage, value);
    } catch {
      return false;
    }
  }
  function resetReceipt() {
    try {
      localStorage.removeItem(RECEIPT_KEY);
    } catch {
      /* Advisory metadata cannot block recovery. */
    }
  }
  function markDirtyReceipt() {
    const old = receipt();
    if (!old?.firstDirtyAt)
      saveReceipt({
        ...old,
        version: 1,
        at: old?.at ?? null,
        edits: old?.edits ?? 0,
        firstDirtyAt: new Date().toISOString(),
        snoozedUntil: old?.snoozedUntil ?? null,
      });
  }
  async function downloadPrivateBackup(name = "hajin-private-workspace.json") {
    await queue.catch(() => {});
    if (disposed) throw new Error("Workspace closed.");
    const json = JSON.stringify(exportPrivateBackup(state));
    download(name, json);
    const recorded = saveReceipt({
      version: 1,
      at: new Date().toISOString(),
      edits: state.usability?.edits ?? 0,
      firstDirtyAt: null,
      snoozedUntil: null,
    });
    notice(
      recorded
        ? "Private backup download started. Confirm the file saved in your downloads."
        : "Backup download started; reminder history could not be stored. Confirm the file saved.",
    );
    renderBackupReminder();
    refreshHighlight();
  }
  function renderBackupReminder() {
    const status = reminderStatus(state.usability?.edits ?? 0, receipt());
    backupReminder.hidden = !status.due;
    if (status.due)
      backupReminder.replaceChildren(
        note(
          "Back up your private map work:20 changes or7 days with changes since a recorded backup download.",
        ),
        button("Download backup", () => downloadPrivateBackup()),
        button("Remind tomorrow", () => {
          snoozeBackup();
          renderBackupReminder();
        }),
      );
  }
  function snoozeBackup() {
    const old = receipt();
    saveReceipt({
      version: 1,
      at: old?.at ?? null,
      edits: old?.edits ?? 0,
      firstDirtyAt: old?.firstDirtyAt ?? null,
      snoozedUntil: new Date(Date.now() + 86400000).toISOString(),
    });
  }
  const toast = el("p", undefined, "workspace-toast");
  toast.hidden = true;
  toast.id = "workspace-toast";
  toast.setAttribute("role", "status");
  document.querySelector(".map-workspace")!.append(toast);
  let toastTimer: ReturnType<typeof setTimeout> | undefined;
  const issueDetails=el('details'),issueHeading=el('summary','Issue details'),issueList=el('ul');issueDetails.id='workspace-issue-details';issueDetails.hidden=true;issueDetails.append(issueHeading,issueList);if(modern)status.after(issueDetails);
  const paintIssues=()=>{if(!modern||disposed||suspended)return;checkSave.hidden=!unsaved&&!unconfirmedWrite;const value=issues.snapshot();status.dataset.uiIssueSummary='map-workspace';const brief=(value.issues[0]?.message??'').replace(/\s+/g,' ');status.textContent=value.count?`${value.label}: ${brief.length>180?brief.slice(0,180)+'…':brief}`:value.status;status.setAttribute('role',value.count?'alert':'status');issueDetails.hidden=!value.count;issueHeading.textContent=`Issue details (${value.count})`;issueList.replaceChildren(...value.issues.map(issue=>{const row=el('li');const related:{[key:string]:{label:string;target:ToolTarget}}={'map-routes':{label:'Routes',target:'routes'},'map-sources':{label:'Sources',target:'sources'},'map-find':{label:'Map locations',target:'explore'},'map-review':{label:'Source review',target:'review'}};const owner=related[issue.owner];if(owner)row.append(button(`Open ${owner.label}`,()=>{openTool(owner.target);}));row.append(el('p',issue.message));if(issue.target?.startsWith('#')){const link=el('a','Open affected workspace');link.href=issue.target;row.append(link);}if(!issue.blocking)row.append(button('Dismiss reviewed notice',()=>{issues.clear(issue.owner,issue.cause);paintIssues();}));return row;}));};
  const notice = (message: string) => {
    if(disposed||suspended)return;
    if(modern){issues.status(message.slice(0,2000));paintIssues();return;}
    status.textContent = message;
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast.hidden = true), 7000);
  };
  const error = (error: unknown) => {if(disposed||suspended)return;if(modern){issues.report({owner:'map-workspace',cause:failedLabel?'write':'workspace',message:errorText(error).slice(0,8000),blocking:!!unsaved,target:unsaved?'#workspace-check-save':'#workspace-content'});paintIssues();}else notice(errorText(error));};
  const scopeError=(owner:string)=>(cause:unknown)=>{if(!modern||unsaved){error(cause);return;}if(disposed||suspended)return;issues.report({owner:`map-${owner}`,cause:'operation',message:errorText(cause).slice(0,8000),target:'#workspace-content'});paintIssues();};
  const errorListener = (event: Event) => error((event as CustomEvent).detail);
  document.addEventListener("workspace-error", errorListener);
  const refresh = () => {
    if (disposed) return;
    renderMarkers();
    renderKey();
    renderBackupReminder();
    refreshHighlight();
    if (dialog.open && !dirty && !detailActive) renderPanel(active==='planner' && !!body.querySelector('.boss-directory'));
  };
  async function commit(
    label: string,
    change: (draft: Workspace) => void,
    resources: { id: string; blob: Blob }[] = [],
    expectedRevision?: number,
  ) {
    const requestedView=viewGeneration;
    const unlock = /visibility|Source masks|categories|All layers|Search/.test(
      label,
    )
      ? () => {}
      : lockInteraction();
    const operation = queue
      .catch(() => {})
      .then(async () => {
        if (disposed) throw new Error("Workspace closed.");
        if(unconfirmedWrite)throw new Error("The previous save is unconfirmed. Check save status before retrying.");
        if (unsaved && failedLabel && label !== failedLabel)
          throw new Error(
            "An unsaved draft is retained. Export/reload it before another save.",
          );
        if (expectedRevision !== undefined && expectedRevision !== revision)
          throw new Error(
            "Workspace changed since preview. Reopen the preview.",
          );
        const draft = structuredClone(state);
        change(draft);
        if (isMeaningfulMutation(label)) {
          draft.usability ??= emptyUsability();
          draft.usability.edits = (state.usability?.edits ?? 0) + 1;
        }
        unsaved = draft;
        failedLabel = label;
        if (!store)
          throw new Error(
            "Local storage unavailable. Your draft is retained; export it from Backups.",
          );
        operationOwner.setContext({workspace:'hajin',pack:null,profile:null,revision});
        const ticket=operationOwner.begin({kind:'workspace-write',phase:'preparing'});
        if(!operationOwner.commit(ticket))throw new Error('This save no longer belongs to the active workspace.');
        const expected=revision;writing++;writeSlow=false;
        const slow=setTimeout(()=>{if(modern&&!disposed&&!suspended&&requestedView===viewGeneration){writeSlow=true;issues.report({owner:'map-workspace',cause:'write-pending',message:'Still waiting for local storage confirmation. Do not repeat this save. The draft remains retained.',severity:'warning',blocking:true,target:'#workspace-content'});paintIssues();paneHost?.refresh();}},10000);
        let saved;
        try{saved=await store.commit(asJson(draft),revision,resources);unconfirmedWrite=true;unconfirmedRevision=expected+1;unconfirmedTicket=ticket;const durable=(await store.read()).current;validateWorkspace(saved.data);const settled=operationOwner.settle(ticket,{outcome:'confirmed',receipt:saved},{verifyReceipt:r=>!!r&&typeof r==='object'&&'revision' in r&&r.revision===expected+1&&'schemaVersion' in r&&r.schemaVersion===1&&'savedAt' in r&&typeof r.savedAt==='string'&&Number.isFinite(Date.parse(r.savedAt))&&'data' in r&&!!durable&&durable.revision===expected+1&&JSON.stringify(r.data)===JSON.stringify(durable.data)});if(!settled.accepted){unconfirmedWrite=true;unconfirmedRevision=expected+1;unconfirmedTicket=ticket;throw new Error('The local save outcome is unconfirmed. Keep this draft and check save status before trying again.');}unconfirmedWrite=false;unconfirmedRevision=undefined;unconfirmedTicket=undefined;}
        catch(cause){operationOwner.settle(ticket,{outcome:unconfirmedWrite?'unconfirmed':'failed'});throw cause;}
        finally{writing--;writeSlow=false;clearTimeout(slow);}
        const publish=!disposed&&!suspended&&requestedView===viewGeneration;
        issues.clear('map-workspace','write-pending');issues.clear('map-workspace','write');
        backgroundRequest++;
        validateWorkspace(saved.data);
        state = saved.data;

        if (
          label.startsWith("Backup restored") ||
          label === "New empty workspace created"
        ) {
          resetReceipt();
          clearHighlight();
        } else if (isMeaningfulMutation(label)) markDirtyReceipt();
        if (draft.migrations.includes("source-masks-v1"))
          legacyMigrationCommitted = true;
        if (
          label.startsWith("Backup restored") ||
          label === "New empty workspace created"
        ) {
          clearTimeout(searchTimer);
          pendingVisibility = undefined;
        }
        revision = saved.revision;
        if(publish)dialog.dataset.revision = String(revision);
        unsaved = undefined;
        failedLabel = undefined;
        retainedFailure = false;
        if (publish && isMeaningfulMutation(label) && !(modern&&paneHost?.snapshot().pending?.id.startsWith('map-selection-'))) viewer.map.closePopup();
        if(publish){notice(label);if(modern&&paneHost?.snapshot().pending?.id.startsWith('map-selection-'))deferredLegacyFilters=true;else applyLegacyFilters();refresh();}
      })
      .catch((error) => {
        if (unsaved && failedLabel === label) retainedFailure = true;
        throw error;
      })
      .finally(()=>{unlock();paneHost?.refresh();});
    queue = operation;
    return operation;
  }
  function persistVisibility(label: string, value: VisibilityState) {
    return commit(label, (draft) => {
      draft.visibility = structuredClone(value);
    }).then(() => {
      if (pendingVisibility === value) {
        pendingVisibility = undefined;
        // Before explicit migration the legacy filters are still authoritative
        // on reload. Mirror only the confirmed final user change; migrated
        // sources disable legacy persistence and keep their old bytes intact.
        applyLegacyFilters(true);
      }
      paneHost?.refresh();
    });
  }
  function changeVisibility(
    label: string,
    change: (value: VisibilityState) => void,
  ) {
    clearTimeout(searchTimer);
    clearTimeout(filterTimer);
    if (retainedFailure) {
      renderKey();
      return Promise.reject(
        new Error(
          "An unsaved draft is retained. Export/reload it before changing saved filters.",
        ),
      );
    }
    const value = structuredClone(visibility());
    change(value);
    pendingVisibility = value;
    applyLegacyFilters();
    renderMarkers();
    renderKey();
    dialog.dataset.visibilityEpoch = String(++visibilityEpoch);
    notice("Saving visibility…");
    return persistVisibility(label, value);
  }
  const closeDetail = () => {
    detailCleanup?.();
    detailCleanup = undefined;
    detailActive = false;
    usabilityDetail = false;
    dirty = false;
    renderPanel();
    if(modern){if(dialog.matches(":modal"))dialog.close();openWorkspacePane();viewCache.restore(viewTask(),{focus:true});}
    if (dialog.open&&!modern)
      nav.querySelector<HTMLButtonElement>(`[data-tab="${active}"]`)?.focus();
  };
  const cancelProcessing = button(
    "Cancel processing",
    () => processing?.abort(),
    "cancel-workspace-processing",
  );
  cancelProcessing.hidden = true;
  top.append(cancelProcessing);
  dialog.addEventListener("cancel", (event) => {
    if (interactionLocks && !processing) event.preventDefault();
    else processing?.abort();
  });
  function showOwnedDetail(node:HTMLElement,cleanup:(()=>void)|undefined,modal:boolean){if(modern&&!modal)captureCleanView();usabilityDetail=!modal;detailCleanup?.();detailCleanup=cleanup;detailActive=true;body.replaceChildren(node);if(paneHost){if(modal)paneHost.modal();else paneHost.open();}else if(!dialog.open)dialog.showModal();node.querySelector<HTMLElement>('input,button,textarea,select')?.focus();}
  const services: UIServices = {
    process: async (work) => {
      if (processing)
        throw new Error("Another local file is processing. Cancel it first.");
      const current = new AbortController();
      const unlock = lockInteraction();
      processing = current;
      cancelProcessing.hidden = false;
      notice("Processing local input…");
      try {
        const result = await work(current.signal);
        if (current.signal.aborted||disposed||suspended) throw new Error("Import cancelled; no new input will be applied by this view.");
        return result;
      } finally {
        unlock();
        if (processing === current) {
          processing = undefined;
          cancelProcessing.hidden = true;
        }
      }
    },
    state: () => state,
    revision: () => revision,
    commit,
    error,
    notice,
    refresh,
    detail: (node, cleanup) => showOwnedDetail(node,cleanup,true),
    closeDetail,
    readResource: async (id) => store?.readResource(id),
    previousState: async () => {
      const old = (await store?.read())?.previous?.data;
      if (!old) return undefined;
      validateWorkspace(old);
      return old;
    },
    legacySnapshot: (sourceId = "official") =>
      legacy.find((source) => source.id === sourceId)?.getSnapshot(),
    focus: (x, y) => {
      viewer.map.setView([y, x], Math.max(viewer.map.getZoom(), 1), {
        animate: false,
      });
      dialog.close();
    },
  };
  const getExplorerRecords = () =>
    explorerRecords(
      { ...state, visibility: visibility() },
      legacy.filter((s) => !capacityExcluded.has(s.id)),
      selectedSnapshots,
    ).map((r) => ({
      ...decorateRecord(state.fieldGuide,r),
      visible: r.visible && !duplicatePlan.suppressed.has(r.key),
    }));
  const canInspect = () =>
    !openButton.disabled &&
    !dirty &&
    !processing &&
    !interactionLocks &&
    (!detailActive || usabilityDetail);
  const updatesUI = createSourceUpdates({
    ...services,error:scopeError('sources'),
    allowed: () => canInspect() && !unsaved && !pendingVisibility,
    transition: async (work) => {
      const unlock = lockInteraction();
      try {
        return await work();
      } finally {
        unlock();
      }
    },
    finish: () => {
      closeDetail();
      dialog.close();
      document.querySelector<HTMLButtonElement>("#update-map-sources")?.focus();
    },
    replace: async (descriptors) => {
      for (const d of descriptors) {
        const source =
          legacy.find((s) => s.id === d.id) ?? addSource?.(captureSource(d));
        source?.setLegacyPersistence(false);
        if (source) await source.replaceCapture(captureSource(d));
      }
      applyLegacyFilters();
      renderMarkers();
      renderKey();
    },
    select: (entries) => {
      for (const e of entries) {
        const source = state.snapshots.find((s) => s.key === e.key)?.snapshot
          .sourceId;
        if (source) selectedSnapshots.set(source, e.key);
      }
    },
  });
  document.querySelector(".key-toolbar")!.append(updatesUI.root);
  const usabilityUI = createUsabilityUI({
    ...services,error:scopeError('find'),
    records: getExplorerRecords,
    addWaypoint:r=>plannerUI!.addRecord(r),trackRecord:r=>plannerUI!.observe(r),
    mapCenter:()=>{const p=viewer.map.getCenter();if(![p.lng,p.lat].every(n=>n>=0&&n<=4096))throw new Error('Move the map center inside the terrain first.');return{x:p.lng,y:p.lat,label:'Map center'};},
    openSearch:()=>openExplore('search'),
    jumpPosition:point=>{if(!canInspect())return;clearHighlight();viewer.map.setView([point.y,point.x],Math.max(viewer.map.getZoom(),2),{animate:false});L.circleMarker([point.y,point.x],{radius:16,color:'#fff39a',weight:4}).bindPopup(el('span',point.label)).addTo(searchHighlight).openPopup();dialog.close();},
    inspectionMode: () => showDuplicateMarkers,
    categories: () => {
      const result = Object.fromEntries(
        legacy.map((s) => [
          s.id,
          s.getSnapshot()?.categories.map((c) => c.id) ?? [],
        ]),
      );
      for (const e of state.snapshots)
        result[e.snapshot.sourceId] = e.snapshot.categories.map((c) => c.id);
      for (const [id, key] of selectedSnapshots) {
        const e = state.snapshots.find((e) => e.key === key);
        if (e) result[id] = e.snapshot.categories.map((c) => c.id);
      }
      return result;
    },
    inspectAllowed: canInspect,
    clean: () => {
      dirty = false;
    },
    view: () => visibility(),
    applyView: (v) =>
      changeVisibility("Saved view visibility applied", (value) =>
        Object.assign(value, structuredClone(v)),
      ),
    detail: (node, cleanup) => {
      showOwnedDetail(node,cleanup,!modern);
      usabilityDetail = true;
    },
    editPoint: (id) => {
      const point = state.annotations.find((a) => a.id === id);
      if (!point) return;
      detailCleanup?.();
      detailCleanup = undefined;
      detailActive = false;
      usabilityDetail = false;
      dirty = false;
      active = "points";
      editing = structuredClone(point);
      draftPosition = undefined;
      renderPanel();
      if (!dialog.open) openWorkspacePane();
      body.querySelector<HTMLInputElement>("#point-title")?.focus();
    },
    jump: (record, popup) => {
      if (record.x === null || record.y === null) return;
      detailCleanup?.();
      detailCleanup = undefined;
      detailActive = false;
      usabilityDetail = false;
      dirty = false;
      viewer.map.closePopup();
      clearHighlight();
      highlightRecord = {
        key: record.key,
        signature: highlightSignature(record),
      };
      viewer.map.setView(
        [record.y, record.x],
        Math.max(viewer.map.getZoom(), 2),
        { animate: false },
      );
      const highlighted = L.circleMarker([record.y, record.x], {
        radius: 14,
        color: "#fff39a",
        weight: 4,
        fillOpacity: 0.1,
      })
        .bindPopup(popup,markerPopupOptions)
        .addTo(searchHighlight)
        .openPopup();
      highlighted
        .getElement()
        ?.setAttribute("data-search-highlight", record.key);
      dialog.close();
    },
    receipt,
    snooze: snoozeBackup,
    downloadBackup: () => downloadPrivateBackup(),
  });
  plannerUI=createFieldGuideUI({
    ...services,error:scopeError('routes'),map:viewer.map,records:getExplorerRecords,editPoint:id=>openPointEditing(id),addPoint:point=>openPointAt(point),
    allowed:()=>canInspect()&&!unsaved&&!pendingVisibility,
    draftAllowed:()=>!processing&&!interactionLocks&&(!unsaved||(!!plannerUI?.ownsDraft()&&['Map planner saved','Map toolkit saved'].includes(failedLabel??'')))&&!pendingVisibility&&(!dirty||!!plannerUI?.ownsDraft())&&(!detailActive||usabilityDetail),
    setDirty:value=>{dirty=value;if(!value)plannerPick=undefined;},
    openPlanner:preserve=>{if(!preserve){active='planner';renderPanel();}if(!dialog.open)openWorkspacePane();},closePlanner:()=>dialog.close(),
    search:query=>{usabilityUI.find(query);},popup:r=>usabilityUI.popup(r),
    available:()=>{const out:Record<string,string[]>={};for(const source of legacy){const snapshot=source.getSnapshot();if(snapshot)out[source.id]=snapshot.categories.map(c=>c.id);}for(const entry of state.snapshots)out[entry.snapshot.sourceId]=entry.snapshot.categories.map(c=>c.id);for(const [source,key] of selectedSnapshots){const entry=state.snapshots.find(e=>e.key===key);if(entry)out[source]=entry.snapshot.categories.map(c=>c.id);}return out;},
    view:visibility,applyView:v=>changeVisibility('Public planner view applied',value=>Object.assign(value,structuredClone(v))),
    pick:callback=>{plannerPick=callback;dialog.close();if(modern)document.querySelector<HTMLButtonElement>('#ui-map-view')?.click();notice('Choose a location on the map.');},
    hideBaseMarkers:hidden=>{for(const source of legacy)source.setPresentationHidden(hidden);if(hidden){for(const layer of [customLayer,sourceLayer,reviewedLayer])layer.eachLayer(item=>{if(item instanceof L.Marker||item instanceof L.CircleMarker)layer.removeLayer(item);});}},
  });
  const plannerRecord=(event:Event)=>{const d=(event as CustomEvent).detail;if(!d||!['waypoint','tracking'].includes(d.action))return;const r=getExplorerRecords().find(r=>r.sourceId===d.sourceId&&r.id===d.recordId);if(!r){error('Location no longer available.');return;}void (d.action==='waypoint'?plannerUI!.addRecord(r):plannerUI!.observe(r)).catch(error);};
  document.addEventListener('map-planner-record',plannerRecord);
  function openExplore(
    section = "search",
    filter?: { sourceId: string; categoryId: string },
  ) {
    if (!canInspect()) {
      error("Save or cancel your current draft/preview first.");
      return;
    }
    detailCleanup?.();
    detailCleanup = undefined;
    detailActive = false;
    usabilityDetail = false;
    active = "explore";
    usabilityUI.openSection(section, filter);
    renderPanel();
    if (!dialog.open) openWorkspacePane();
    body.querySelector<HTMLElement>("#explorer-search,input,button")?.focus();
  }
  const findButton = button(
    "Find locations",
    () => openExplore(),
    "find-locations",
  );
  findButton.className = "find-locations";
  findButton.disabled = true;
  document.querySelector(".map-top-right")!.append(findButton);
  const duplicateDetails = (event: Event) => {
    const detail = (event as CustomEvent).detail;
    if (legacy.some((s) => s.id === detail?.sourceId))
      openExplore("duplicates", detail);
  };
  const recordDetails = (event: Event) => {
    const detail = (event as CustomEvent).detail;
    if (!canInspect()) {
      error("Save or cancel your current draft/preview first.");
      return;
    }
    const r = getExplorerRecords().find(
      (r) =>
        r.key === detail?.key ||
        (r.sourceId === detail?.sourceId && r.id === detail?.recordId),
    );
    if (r) {
      active = "explore";
      usabilityUI.showRecord(r);
    }
  };
  document.addEventListener("map-duplicate-details", duplicateDetails);
  document.addEventListener("map-record-details", recordDetails);
  for (const [tab, label] of [
    ["points", "My points"],
    ["sources", "Sources"],
    ["review", "Review"],
    ["icons", "Icons"],
    ["backup", "Backups"],
    ["explore", "Explore"],
    ["health", "Health"],
    ["planner", "Planner"],
  ] as [Tab, string][]) {
    const b = button(
      label,
      () => {
        if(paneHost){if(active===tab){openWorkspacePane();return;}paneHost.request({id:`tab:${tab}`,label:`Open ${label}`,revalidate:()=>!disposed&&hydrated,run:()=>{captureCleanView();detailCleanup?.();detailCleanup=undefined;detailActive=false;picking=false;plannerPick=undefined;plannerUI?.reset();active=tab;currentTool=undefined;renderPanel();viewCache.restore(viewTask(),{focus:true});openWorkspacePane();}});return;}
        if (processing) {
          error("Cancel file processing before switching sections.");
          return;
        }
        if (dirty || detailActive) {
          error(
            "Save or cancel the current draft/preview before switching sections.",
          );
          return;
        }
        detailCleanup?.();
        detailCleanup = undefined;
        detailActive = false;
        picking = false;
        plannerPick=undefined;plannerUI?.reset();
        active = tab;
        renderPanel();
      },
      `workspace-tab-${tab}`,
    );
    b.dataset.tab = tab;
    nav.append(b);
  }
  const resetEditor = () => {
    dirty = false;
    editing = undefined;
    draftPosition = undefined;
    picking = false;
    renderPanel();
  };
  top.append(
    button(
      "Cancel draft / preview",
      () => {
        processing?.abort();
        if(!unsaved){issues.clear('map-workspace','workspace');paintIssues();}
        plannerPick=undefined;plannerUI?.reset();
        picking = false;
        dirty = false;
        if (detailActive) closeDetail();
        else resetEditor();
      },
      "cancel-workspace-draft",
    ),
  );
  body.addEventListener("input", (event) => {
    const target = event.target as HTMLElement;
    if (
      !["points-search", "review-search"].includes(target.id) &&
      !target.hasAttribute("data-workspace-search") &&
      !target.closest("#review-records")
    ){dirty = true;draftSerial++;}
  });
  body.addEventListener("change", (event) => {
    const target = event.target as HTMLElement;
    if (
      !["points-search","review-search"].includes(target.id) &&
      !target.closest("#review-records") &&
      !target.hasAttribute("data-workspace-search")
    ){dirty = true;draftSerial++;}
  });

  function renderPanel(preservePosition = false) {
    viewGeneration++;
    disposeActiveEditor?.();disposeActiveEditor=undefined;
    saveActiveDraft=undefined;
    const scrollTop=dialog.scrollTop,scrollLeft=dialog.scrollLeft,tabsLeft=body.querySelector('.planner-tabs')?.scrollLeft??0;
    if(!preservePosition)dialog.scrollTop = 0;
    nav
      .querySelectorAll("button")
      .forEach((b) =>
        b.setAttribute("aria-current", String(b.dataset.tab === active)),
      );
    body.replaceChildren();
    if (active === "points") renderPoints();
    if (active === "sources") body.append(sourcePanel({...services,error:scopeError('sources')}));
    if (active === "review") body.append(reviewPanel({...services,error:scopeError('review')}));
    if (active === "icons") renderIcons();
    if (active === "backup") renderBackup();
    if(active==='planner')body.append(plannerUI!.panel());
    if(active==='health')body.append(healthPanel({...services,captures:()=>legacy.map(source=>({id:source.id,capturedAt:source.getSnapshot()?.capturedAt??null,records:source.getSnapshot()?.records.length??0,files:source.getSnapshotLocation()})),navigate:target=>{if(!canInspect())return;if(target==='updates'){dialog.close();document.querySelector<HTMLButtonElement>('#toggle-key')?.click();const controls=document.querySelector<HTMLElement>('#map-source-updates');if(controls){controls.tabIndex=-1;controls.focus();controls.scrollIntoView({block:'center'});}}else{active=target;renderPanel();}}}));
    if (active === "explore") {if(modern){const scopes=el('div',undefined,'ui-find-scopes');scopes.setAttribute('role','group');scopes.setAttribute('aria-label','Find scope');scopes.append(button('Map locations',()=>{openTool('explore');},'ui-find-map'),button('My workspace',()=>{openTool('workspace-search');},'ui-find-workspace'),note('Map locations searches imported sites and your placed points. My workspace searches private workspace records.'));body.append(scopes);}body.append(usabilityUI.panel());}
    if(preservePosition){dialog.scrollTop=scrollTop;dialog.scrollLeft=scrollLeft;const tabs=body.querySelector('.planner-tabs');if(tabs)tabs.scrollLeft=tabsLeft;}
  }
  function renderPoints() {
    body.append(
      el("h3", "My private points"),
      note(
        "Create POIs, locations and marks from your own gameplay. Edit coordinates to move a point, or pick on the map. Source evidence stays separate.",
      ),
    );
    const editorView=viewGeneration;
    const editor = annotationEditor(
      state,
      editing,
      draftPosition,
      async (annotation) => {
        const ownerView=viewGeneration,ownerFocus=document.activeElement,ownerNode=body.querySelector('#point-form'),ownerSerial=draftSerial;
        await commit(
          editing ? "Point updated" : "Private point saved",
          (draft) => saveAnnotation(draft, annotation),
        );
        if(disposed)return;
        if(suspended||ownerView!==viewGeneration){const reconcile=()=>{if(disposed||suspended||!ownerNode?.isConnected||!body.contains(ownerNode)||draftSerial!==ownerSerial)return;const restoreFocus=ownerNode.contains(document.activeElement);resetEditor();applyLegacyFilters();refresh();notice('The saved point is confirmed after returning. No save was repeated.');if(restoreFocus){const heading=body.querySelector<HTMLElement>('h3');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}}};if(suspended)reconcileConfirmedEditor=reconcile;else reconcile();return;}
        const returnFocus=document.activeElement===ownerFocus||document.activeElement===document.body;
        resetEditor();
        if(returnFocus)body.querySelector<HTMLInputElement>("#point-title")?.focus();
      },
      resetEditor,
      () => {
        dirty = true;
      },
      () => {
        picking = true;
        dialog.close();
        if(modern)document.querySelector<HTMLButtonElement>('#ui-map-view')?.click();
        notice(
          "Click a position on the map. Your other draft fields will be kept.",
        );
      },
      error,
      services.process,
      ()=>!modern||(!disposed&&!suspended&&editorView===viewGeneration),
    );
    saveActiveDraft=()=>saveAnnotationEditor(editor);
    body.append(editor);
    body.append(
      button(
        "Undo last saved workspace change",
        async () => {
          const unlock = lockInteraction();
          try {
            if (dirty || detailActive || unsaved)
              throw new Error(
                "Save, export/reload or cancel your draft before undoing a saved change.",
              );
            if (!store) throw new Error("Storage unavailable.");
            clearTimeout(searchTimer);
            clearTimeout(filterTimer);
            await queue.catch(() => {});
            const saved = await store.restorePrevious(revision);
            legacyMigrationCommitted = await store.hasLegacyMigration();
            validateWorkspace(saved.data);
            backgroundRequest++;
            state = saved.data;
            resetReceipt();
            clearHighlight();
            pendingVisibility = undefined;
            revision = saved.revision;
            dialog.dataset.revision = String(revision);
            resetEditor();
            notice("Previous valid workspace restored; undo is reversible.");
            applyLegacyFilters(true);
            refresh();
          } catch (e) {
            error(e);
          } finally {
            unlock();
          }
        },
        "undo-workspace",
      ),
    );
    const search = input("");
    search.id = "points-search";
    let page = 0;
    const list = el("div");
    list.id = "custom-point-list";
    const showList = () => {
      list.replaceChildren();
      const filtered = state.annotations.filter((a) =>
        `${a.title} ${a.category} ${a.notes} ${a.metadata?.tags.join(' ')??''} ${a.metadata?.building??''} ${a.metadata?.approach??''} ${a.metadata?.lastChecked??''}`
          .toLocaleLowerCase()
          .includes(search.value.toLocaleLowerCase()),
      );
      page = Math.max(0, Math.min(page, Math.ceil(filtered.length / 50) - 1));
      list.append(
        note(
          `${filtered.length} private points · page ${page + 1}/${Math.max(1, Math.ceil(filtered.length / 50))}`,
        ),
      );
      for (const a of filtered.slice(page * 50, (page + 1) * 50)) {
        const row = el("section", undefined, "workspace-card");
        row.dataset.annotation = a.id;
        row.append(
          el("h4", a.title),
          note(
            `${a.kind} · ${a.category} · ${a.verificationState} · X ${a.x.toFixed(2)}, Y ${a.y.toFixed(2)} · floor ${a.applicability.floor ?? "unknown"}`,
          ),
          button("Locate point", () => services.focus(a.x, a.y)),
          button("Edit point", () => {
            if (dirty) {
              error("Save or cancel your current point draft first.");
              return;
            }
            editing = structuredClone(a);
            draftPosition = undefined;
            renderPanel();
            document.querySelector<HTMLInputElement>("#point-title")?.focus();
          }),
          button("Delete point", async () => {
            try {
              if (dirty)
                throw new Error(
                  "Save or cancel your current point draft first.",
                );
              const node = el("section");
              node.append(
                el("h3", "Delete private point?"),
                note(`${a.title}. You can undo the last saved change.`),
                button(
                  "Confirm delete point",
                  async () => {
                    try {
                      await commit("Point deleted", (draft) =>
                        removeAnnotation(draft, a.id),
                      );
                      closeDetail();
                    } catch (e) {
                      error(e);
                    }
                  },
                  "confirm-delete-point",
                ),
                button("Delete without recovery copy",async()=>{try{if(!window.confirm('Delete this private point without adding a recovery-bin copy? Existing backups and the previous saved revision may still contain it.'))return;await commit('Point deleted without recovery copy',draft=>{if(!draft.annotations.some(point=>point.id===a.id))throw new Error('Point no longer exists.');draft.annotations=draft.annotations.filter(point=>point.id!==a.id);});closeDetail();}catch(e){error(e);}},'delete-point-without-bin'),
                note('If the recovery bin is full or this point exceeds its2MiB limit, use Delete without recovery copy only after saving a backup if needed.'),
                button("Keep point", closeDetail),
              );
              services.detail(node);
            } catch (e) {
              error(e);
            }
          }),
        );
        list.append(row);
      }
      list.append(
        button("Previous points", () => {
          page = Math.max(0, page - 1);
          showList();
        }),
        button("Next points", () => {
          page++;
          showList();
        }),
      );
    };
    search.addEventListener("input", () => {
      page = 0;
      showList();
    });
    body.append(field("Find my points", search), list);
    showList();
  }
  const mapPick = (event: L.LeafletMouseEvent) => {
    if(plannerPick){const point:XY=[event.latlng.lng,event.latlng.lat];if(!point.every(n=>n>=0&&n<=4096)){error('Choose a location inside the terrain.');return;}const callback=plannerPick;plannerPick=undefined;try{callback(point);}catch(e){error(e);}finally{if(!dialog.open)openWorkspacePane();}return;}
    if (!picking) return;
    const x = Math.round(event.latlng.lng * 100) / 100,
      y = Math.round(event.latlng.lat * 100) / 100;
    if (x < 0 || y < 0 || x > 4096 || y > 4096) {
      error("Choose a point inside the canonical map.");
      return;
    }
    picking = false;
    const xInput = body.querySelector<HTMLInputElement>("#point-x"),
      yInput = body.querySelector<HTMLInputElement>("#point-y");
    if (xInput && yInput) {
      xInput.value = String(x);
      yInput.value = String(y);
      xInput.dispatchEvent(new Event("input", { bubbles: true }));
    }
    dirty = true;
    if (!dialog.open) openWorkspacePane();
  };
  viewer.map.on("click", mapPick);
  function openPointEditing(id:string){if(!canInspect())throw new Error('Save or cancel your draft first.');const point=state.annotations.find(a=>a.id===id);if(!point)throw new Error('Point unavailable.');editing=structuredClone(point);draftPosition=undefined;active='points';renderPanel();if(!dialog.open)openWorkspacePane();body.querySelector<HTMLInputElement>('#point-title')?.focus();}
  function openPointAt(point:XY){if(!canInspect())throw new Error('Save or cancel your current draft first.');active='points';editing=undefined;draftPosition={x:point[0],y:point[1]};renderPanel();dirty=true;if(!dialog.open)openWorkspacePane();body.querySelector<HTMLInputElement>('#point-title')?.focus();}
  const rightClickPoint = (event: L.LeafletMouseEvent) => {
    if (!hydrated || disposed || interactionLocks || processing) return;
    L.DomEvent.preventDefault(event.originalEvent);
    if (picking||plannerPick) {
      mapPick(event);
      return;
    }
    if (dirty || detailActive || unsaved) {
      if (!dialog.open) openWorkspacePane();
      error(
        "Save or cancel your current draft/preview before adding another point.",
      );
      return;
    }
    const x = Math.round(event.latlng.lng * 100) / 100,
      y = Math.round(event.latlng.lat * 100) / 100;
    if (x < 0 || y < 0 || x > 4096 || y > 4096) {
      error("Choose a point inside the canonical map.");
      return;
    }
    try{plannerUI!.quickActions([x,y]);}catch(e){error(e);}
  };
  let pressTimer:ReturnType<typeof setTimeout>|undefined,pressStart:{x:number;y:number;pointer:number}|undefined;
  const cancelPress=()=>{clearTimeout(pressTimer);pressStart=undefined;};
  const press=(event:PointerEvent)=>{if(!event.isPrimary){cancelPress();return;}if(event.pointerType==='mouse'||event.target instanceof HTMLElement&&event.target.closest('button,input,select,textarea,.movable-map-menu,.leaflet-popup'))return;cancelPress();pressStart={x:event.clientX,y:event.clientY,pointer:event.pointerId};pressTimer=setTimeout(()=>{if(!pressStart||!canInspect())return;const latlng=viewer.map.containerPointToLatLng(L.point(pressStart.x-viewer.map.getContainer().getBoundingClientRect().left,pressStart.y-viewer.map.getContainer().getBoundingClientRect().top));cancelPress();try{plannerUI!.quickActions([latlng.lng,latlng.lat]);}catch(e){error(e);}},650);};
  const movePress=(event:PointerEvent)=>{if(pressStart&&(event.pointerId!==pressStart.pointer||Math.hypot(event.clientX-pressStart.x,event.clientY-pressStart.y)>8))cancelPress();};
  viewer.map.getContainer().addEventListener('pointerdown',press);viewer.map.getContainer().addEventListener('pointermove',movePress);viewer.map.getContainer().addEventListener('pointerup',cancelPress);viewer.map.getContainer().addEventListener('pointercancel',cancelPress);
  const cancelMapTool=(event:KeyboardEvent)=>{if(event.key!=='Escape')return;cancelPress();if(!plannerPick&&!picking)return;event.preventDefault();event.stopPropagation();plannerPick=undefined;picking=false;viewer.map.closePopup();if(!dialog.open)openWorkspacePane();notice('Map picking cancelled. Your draft is kept.');};document.addEventListener('keydown',cancelMapTool,true);
  viewer.map.on("contextmenu", rightClickPoint);
  function renderIcons() {
    const forms:HTMLElement[]=[];
    let draftOwner:HTMLElement|undefined;
    const draftNote=note('');draftNote.id='icon-form-draft-status';draftNote.setAttribute('role','status');
    const ownIconDraft=(owner:HTMLElement)=>{
      if(draftOwner&&draftOwner!==owner)return;
      draftOwner=owner;dirty=true;
      saveActiveDraft=owner===studio.root?()=>studio.saveDraft():undefined;
      for(const form of forms){form.inert=form!==owner;form.classList.toggle('icon-form-inactive',form!==owner);}
      draftNote.textContent='Editing one icon form. Save or cancel this draft before using another icon form.';
    };
    const studio=createIconStudio({starters:state.icons.filter(i=>i.design).map(i=>({description:i.description,design:i.design!})),process:services.process,error,notice,dirty:()=>ownIconDraft(studio.root),save:async(design,description)=>{
      const expected=revision,ownerView=viewGeneration,ownerSerial=draftSerial,ownerNode=studio.root;
      const finish=(message?:string)=>{
        const reconcile=()=>{if(disposed||suspended||!ownerNode.isConnected||!body.contains(ownerNode)||draftSerial!==ownerSerial)return;resetEditor();if(message)notice(message);};
        if(suspended||ownerView!==viewGeneration){if(suspended)reconcileConfirmedEditor=reconcile;else reconcile();return;}
        reconcile();
      };
      const icon=await services.process(signal=>stageDesignedIcon(design,description,signal));
      const existing=state.icons.find(i=>i.id===icon.id);
      if(existing){
        if(!existing.design){await commit('Editable design attached to existing icon',draft=>commitIcon(draft,icon),[],expected);finish(`Editable design added to ${existing.description}; image and references reused.`);}
        else{finish(`Already saved as ${existing.description}; existing icon and references reused.`);}
        return;
      }
      await commit('Created icon saved',draft=>commitIcon(draft,icon),[],expected);
      finish();
    }});
    disposeActiveEditor=studio.destroy;
    forms.push(studio.root);
    const upload=el('section');upload.id='icon-raster-upload';forms.push(upload);
    for(const event of ['input','change'])upload.addEventListener(event,()=>ownIconDraft(upload));
    body.append(draftNote,studio.root,upload);
    upload.append(
      el("h3", "Upload icon image"),
      note(
        "Upload PNG/JPEG/WebP files, or create an SVG design above. Uploads are stripped of metadata and resized to at most256px. Arbitrary SVG files and animation are rejected.",
      ),
    );
    const file = input("", "file");
    file.accept = "image/png,image/jpeg,image/webp";
    file.id = "custom-icon-file";
    const description = input("");
    description.id = "custom-icon-description";
    const rights = el("textarea");
    rights.maxLength = 4000;
    rights.id = "custom-icon-rights";
    const owned = input("", "checkbox");
    owned.id = "custom-icon-owned";
    upload.append(
      field("Icon file", file),
      field("Accessible description", description),
      field("Ownership or authorization declaration", rights),
      field("I own or am authorized to use this icon.", owned),
      button(
        "Preview custom icon",
        async () => {
          try {
            if (!owned.checked)
              throw new Error("Confirm ownership or authorization.");
            const f = file.files?.[0];
            if (!f) throw new Error("Choose an icon file.");
            const icon = await services.process((signal) =>
                stageIcon(f, rights.value, description.value, signal),
              ),
              node = el("section"),
              image = el("img");
            image.src = `data:image/png;base64,${icon.base64}`;
            image.alt = icon.description;
            image.className = "icon-preview";
            node.append(
              el("h3", "Review sanitized icon"),
              image,
              note(
                `${icon.description} · ${icon.width} × ${icon.height} · PNG`,
              ),
            );
            const stagedRevision = revision;
            node.append(
              button(
                "Keep custom icon",
                async () => {
                  try {
                    await commit(
                      "Custom icon saved",
                      (draft) => commitIcon(draft, icon),
                      [],
                      stagedRevision,
                    );
                    closeDetail();
                  } catch (e) {
                    error(e);
                  }
                },
                "commit-custom-icon",
              ),
              button("Cancel icon", closeDetail),
            );
            services.detail(node);
          } catch (e) {
            error(e);
          }
        },
        "preview-custom-icon",
      ),
    );
    const packs=el('section');packs.id='icon-design-packs';forms.push(packs);
    const packFile=input('','file');packFile.id='icon-pack-file';packFile.accept='.json,application/json';
    for(const event of ['input','change'])packs.addEventListener(event,()=>ownIconDraft(packs));
    packs.append(el('h3','Editable icon design packs'),note('Export/import up to32 original editable recipes as JSON. Raster-only uploads are not included. Preview validates every design before one atomic library save.'),button('Export editable icon pack',()=>download('hajin-icon-design-pack.json',JSON.stringify(exportIconPack(state.icons),null,2)),'export-icon-pack'),field('Icon design pack JSON',packFile),button('Preview icon design pack',async()=>{
      try{
        const file=packFile.files?.[0];if(!file)throw new Error('Choose an icon design pack.');const expected=revision;
        const icons=await services.process(async signal=>{const pack=parseIconPack(JSON.parse(await readJSONFile(file,256*1024,signal)));const staged:IconAsset[]=[];for(const e of pack.entries)staged.push(await stageDesignedIcon(e.design,e.description,signal));const projected=structuredClone(state);staged.forEach(icon=>commitIcon(projected,icon));validateWorkspace(projected);return staged;});
        const unique=new Set(icons.map(i=>i.id)),add=[...unique].filter(id=>!state.icons.some(i=>i.id===id)).length;
        const preview=el('section');preview.id='icon-pack-preview';preview.append(el('h3','Review icon design pack'),note(`${icons.length} recipes · ${add} new image(s) · ${icons.length-add} existing/repeated image(s) reused`));
        for(const icon of icons){const img=el('img');img.src='data:image/png;base64,'+icon.base64;img.alt=icon.description;img.className='icon-preview';preview.append(img);}
        preview.append(button('Import icon design pack',async()=>{try{if(icons.every(icon=>state.icons.some(old=>old.id===icon.id&&old.design))){closeDetail();notice('Icon pack unchanged; existing images and recipes reused.');return;}await commit('Icon pack imported',draft=>icons.forEach(icon=>commitIcon(draft,icon)),[],expected);closeDetail();}catch(error){services.error(error);}},'commit-icon-pack'),button('Cancel icon pack',closeDetail));services.detail(preview);
      }catch(error){services.error(error);}
    },'preview-icon-pack'));packs.querySelector<HTMLButtonElement>('#export-icon-pack')!.disabled=!state.icons.some(icon=>icon.design);body.append(packs);
    body.append(el("h3","My saved icons"));
    for (const icon of state.icons) {
      const card = el("section", undefined, "workspace-card"),
        image = el("img");
      image.src = `data:image/png;base64,${icon.base64}`;
      image.alt = icon.description;
      image.className = "icon-preview";
      card.append(
        image,
        el("h4", icon.description),
        note(icon.rightsDeclaration),
      );
      card.dataset.libraryIcon=icon.id;forms.push(card);
      for(const event of ['input','change'])card.addEventListener(event,()=>ownIconDraft(card));
      if(icon.design)card.append(button('Edit a copy',()=>{
        if(dirty){error('Save or cancel your current draft before opening another icon.');return;}
        studio.load(icon.design!,icon.description);ownIconDraft(studio.root);studio.root.scrollIntoView({block:'start'});studio.root.querySelector<HTMLInputElement>('#icon-design-description')?.focus();
      }),button('Download SVG',()=>downloadIconSVG(icon.design!,icon.description)));
      card.append(button('Download PNG',()=>downloadIconPNG(icon)));
      const category = input("");
      const replacement = select([
        { value: "", label: "No replacement" },
        ...state.icons
          .filter((i) => i.id !== icon.id)
          .map((i) => ({ value: i.id, label: i.description })),
      ]);
      card.append(
        field("Category to use this icon by default", category),
        button("Set category icon", async () => {
          try {
            if (!category.value.trim() || category.value.length > 200)
              throw new Error("Enter a category name.");
            await commit("Category icon updated", (draft) => {
              const old = draft.categoryIcons.find(
                (c) => c.category === category.value.trim(),
              );
              if (old) old.iconId = icon.id;
              else {
                if (draft.categoryIcons.length >= 100)
                  throw new Error("Category icon limit reached.");
                draft.categoryIcons.push({
                  category: category.value.trim(),
                  iconId: icon.id,
                });
              }
            });
            resetEditor();
          } catch (e) {
            error(e);
          }
        }),
        field("Replacement for referenced icon deletion", replacement),
        button("Delete this icon", async () => {
          try {
            await commit("Icon removed; references replaced", (draft) =>
              deleteIcon(draft, icon.id, replacement.value || null),
            );
            resetEditor();
          } catch (e) {
            error(e);
          }
        }),
      );
      body.append(card);
    }
  }
  function renderBackup() {
    usabilityUI.backup(body);
    body.append(
      el("h3", "Private backups and recovery"),
      note(
        "Backups always preserve custom points and owned icons. Source data and derived fields without private-export permission are omitted with explicit dependency records. Background pixels are separate local files. Public/share export is not offered.",
      ),
    );
    body.append(
      button(
        "Download private backup",
        () => downloadPrivateBackup(),
        "export-workspace",
      ),
      button(
        "Download unsaved draft",
        () => {
          const draft =
            unsaved ?? (store?.getDraft() as unknown as Workspace | undefined);
          if (!draft) throw new Error("No unsaved draft is retained.");
          download(
            "hajin-unsaved-draft.json",
            JSON.stringify(exportPrivateBackup(draft)),
          );
        },
        "export-workspace-draft",
      ),
      button(
        "Reload saved workspace",
        async () => {
          const unlock = lockInteraction();
          try {
            if (!store) throw new Error("Storage unavailable.");
            clearTimeout(searchTimer);
            clearTimeout(filterTimer);
            await queue.catch(() => {});
            const history = await store.read();
            legacyMigrationCommitted = await store.hasLegacyMigration();
            if (history.current) {
              validateWorkspace(history.current.data);
              backgroundRequest++;
              state = history.current.data;
              pendingVisibility = undefined;
              revision = history.current.revision;
              dialog.dataset.revision = String(revision);
            }
            unsaved = undefined;
            failedLabel = undefined;
            retainedFailure = false;
            dirty = false;
            detailActive = false;
            notice("Saved workspace reloaded.");
            applyLegacyFilters(true);
            refresh();
          } catch (e) {
            error(e);
          } finally {
            unlock();
          }
        },
        "reload-workspace",
      ),
    );
    body.append(
      button(
        "Preview legacy source-mask migration",
        () => {
          try {
            if (
              legacyMigrationCommitted ||
              state.migrations.includes("source-masks-v1")
            )
              throw new Error(
                "Legacy source masks have already been migrated.",
              );
            const plan = planLegacyMaskMigration(
              localStorage,
              { official: legacy[0]?.getFilters().categories ?? [] },
              ["official"],
            );
            const staged = stageMaskMigration(
              {
                current: {
                  schemaVersion: 1,
                  revision,
                  data: asJson(state),
                  savedAt: new Date().toISOString(),
                },
                previous: null,
              },
              plan,
            );
            const node = el("section");
            node.append(
              el("h3", "Review legacy source-mask migration"),
              note(
                "Only source visibility preferences are copied. The old localStorage entry remains unchanged for rollback.",
              ),
              el("pre", JSON.stringify(plan.visibility, null, 2)),
            );
            for (const warning of plan.warnings) node.append(note(warning));
            node.append(
              button(
                "Commit source-mask migration",
                async () => {
                  try {
                    await commit(
                      "Legacy source masks migrated",
                      (draft) => Object.assign(draft, staged.data),
                      [],
                      staged.expectedRevision,
                    );
                    closeDetail();
                  } catch (e) {
                    error(e);
                  }
                },
                "commit-mask-migration",
              ),
              button("Cancel migration", closeDetail),
            );
            services.detail(node);
          } catch (e) {
            error(e);
          }
        },
        "preview-mask-migration",
      ),
    );
    const file = input("", "file");
    file.accept = ".json,application/json";
    file.id = "workspace-backup-file";
    body.append(
      field("Private workspace backup", file),
      button(
        "Preview backup restore",
        async () => {
          try {
            const f = file.files?.[0];
            if (!f) throw new Error("Choose a private backup.");
            if (f.size > 20 * 1024 * 1024)
              throw new Error("Backup exceeds20MiB.");
            const preparedRestore = await services.process(async (signal) => {
              const value = parsePrivateBackup(
                await readJSONFile(f, 20 * 1024 * 1024, signal),
              );
              await verifyBackupAssets(value, signal);
              const storage = await estimateRestoreStorage(
                f.size + new TextEncoder().encode(JSON.stringify(state)).length,
              );
              return { workspace: value, storage };
            });
            const restored = preparedRestore.workspace;
            const estimate = preparedRestore.storage;
            const node = el("section");
            node.id = "restore-preview";
            node.append(
              el("h3", "Review replacement restore"),
              note(
                `${restored.annotations.length} custom points · ${restored.icons.length} icons · ${restored.entities.length} reviewed entities · ${restored.omittedDependencies.length} missing/omitted dependencies. This replaces the current workspace; the previous valid state is retained.`,
              ),
            );
            node.append(backupComparisonPanel(state,restored));
            for (const d of restored.omittedDependencies.slice(0, 20))
              node.append(note(`${d.kind} · ${d.id} · ${d.reason}`));
            node.append(
              note(
                estimate.available === null
                  ? "Browser storage estimate unavailable. A quota failure will roll back without replacing the last valid workspace."
                  : `Estimated additional storage: ${Math.ceil(estimate.bytes / 1024)} KiB; currently available: ${Math.floor(estimate.available / 1024 / 1024)} MiB. ${estimate.available < estimate.bytes ? "Space may be insufficient; keep the downloaded current backup." : "Actual save errors still roll back safely."}`,
              ),
            );
            let backedUp = false;
            const confirm = button(
              "Replace with this private backup",
              async () => {
                try {
                  if (!backedUp)
                    throw new Error(
                      "Download the current backup before replacement.",
                    );
                  await commit(
                    "Backup restored" +
                      (restored.omittedDependencies.length
                        ? " with missing dependencies; review Sources/Backups."
                        : "."),
                    (draft) => Object.assign(draft, restored),
                    [],
                    stagedRevision,
                  );
                  closeDetail();
                } catch (e) {
                  error(e);
                }
              },
              "confirm-restore-workspace",
            );
            confirm.disabled = true;
            const stagedRevision = revision;
            node.append(
              button(
                "Download current backup before replacing",
                async () => {
                  await downloadPrivateBackup("hajin-before-restore.json");
                  backedUp = true;
                  confirm.disabled = false;
                },
                "backup-before-restore",
              ),
              confirm,
              button("Cancel restore", closeDetail),
            );
            services.detail(node);
          } catch (e) {
            error(e);
          }
        },
        "preview-restore-workspace",
      ),
    );
    body.append(
      button(
        "Start a new empty workspace",
        () => {
          const node = el("section");
          node.append(
            el("h3", "Start a new empty workspace?"),
            note(
              "Download the current private backup first. This clears the active workspace, including pending dependencies; one previous valid revision remains recoverable.",
            ),
          );
          let backedUp = false;
          const confirm = button(
            "Confirm new empty workspace",
            async () => {
              try {
                if (!backedUp)
                  throw new Error("Download the current backup first.");
                await commit(
                  "New empty workspace created",
                  (draft) => Object.assign(draft, emptyWorkspace()),
                  [],
                  stagedRevision,
                );
                selectedSnapshots.clear();
                closeDetail();
              } catch (e) {
                error(e);
              }
            },
            "confirm-new-workspace",
          );
          const stagedRevision = revision;
          confirm.disabled = true;
          node.append(
            button("Back up current workspace before clearing", async () => {
              await downloadPrivateBackup("hajin-before-new-workspace.json");
              backedUp = true;
              confirm.disabled = false;
            }),
            confirm,
            button("Keep current workspace", closeDetail),
          );
          services.detail(node);
        },
        "new-empty-workspace",
      ),
    );
    if (state.omittedDependencies.length) {
      body.append(el("h4", "Missing / omitted dependencies"));
      for (const d of state.omittedDependencies.slice(0, 100))
        body.append(note(`${d.kind}: ${d.id} — ${d.reason}`));
    }
  }
  const circleCache = new Map<
    string,
    { circle: L.CircleMarker; signature: string }
  >();
  let selectionOpen = false, deferredMapRedraw = false, redrawQueued = false;
  function renderMarkers() {
    if(modern&&selectionOpen&&paneHost?.snapshot().pending?.id.startsWith('map-selection-')){deferredMapRedraw=true;return;}
    deferredMapRedraw = false;
    // Explicit data/filter refresh invalidates any prior selection, including standalone search popups.
    viewer.map.closePopup();
    const activeCache = new Set<string>(),
      iconCounts = new Map<L.LayerGroup, number>();
    customLayer.clearLayers();
    sourceLayer.clearLayers();
    reviewedLayer.clearLayers();
    const q = visibility().query.trim().toLocaleLowerCase();
    const marker = (
      point: {
        x: number;
        y: number;
        title: string;
        category: string;
        id?: string;
        key?: string;
      },
      layer: L.LayerGroup,
      color: string,
      detail: string,
      icon?: IconAsset,
      fallbackIcon?: string,
      labelStyle?: "major" | "minor",
    ) => {
      const key = `${L.Util.stamp(layer)}:${point.id ?? point.key ?? point.title}`,
        signature = JSON.stringify([
          point.x,
          point.y,
          point.title,
          color,
          detail,
        ]);
      activeCache.add(key);
      let cached = circleCache.get(key);
      const popup = () => {
        const record = getExplorerRecords().find(
          (r) =>
            r.key ===
            (layer === customLayer
              ? "custom:" + point.id
              : layer === reviewedLayer
                ? "reviewed:" + point.id
                : point.key),
        );
        if (record) return usabilityUI.popup(record);
        const node = el("div");
        node.append(el("strong", point.title), note(detail));
        return node;
      };
      if (!cached) {
        cached = {
          circle: L.circleMarker([point.y, point.x], {
            renderer,
            radius: 5,
            color,
            weight: 2,
            fillOpacity: 0.85,
          }).bindPopup(popup,markerPopupOptions),
          signature,
        };
        circleCache.set(key, cached);
      } else if (cached.signature !== signature) {
        cached.circle
          .setLatLng([point.y, point.x])
          .setStyle({ color })
          .unbindPopup()
          .bindPopup(popup,markerPopupOptions);
        cached.signature = signature;
      }
      cached.circle.addTo(layer);
      icon ??= annotationIcon(state, {
        iconId: null,
        category: point.category,
      });
      if (
        (icon || fallbackIcon || labelStyle) &&
        (viewer.map.getZoom() >= 1 || labelStyle) &&
        viewer.map.getBounds().contains([point.y, point.x]) &&
        (iconCounts.get(layer) ?? 0) < 200
      ) {
        iconCounts.set(layer, (iconCounts.get(layer) ?? 0) + 1);
        let symbol: L.Icon | L.DivIcon;
        if (labelStyle && !icon) {
          const text = el(
            "span",
            point.title,
            labelStyle === "major" ? "official-place major" : "official-place",
          );
          symbol = L.divIcon({
            className: "official-label",
            html: text,
            iconSize: [180, 24],
            iconAnchor: [90, 12],
          });
        } else
          symbol = L.icon({
            iconUrl: icon
              ? `data:image/png;base64,${icon.base64}`
              : fallbackIcon!,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });
        L.marker([point.y, point.x], {
          icon: symbol,
          title: point.title,
          alt: icon?.description ?? point.title,
        })
          .bindPopup(popup,markerPopupOptions)
          .addTo(layer);
      }
    };

    if (visibility().customEnabled)
      for (const a of state.annotations)
        if (
          `${a.title} ${a.category} ${a.notes} ${a.metadata?.tags.join(' ')??''} ${a.metadata?.building??''} ${a.metadata?.approach??''} ${a.metadata?.lastChecked??''}`.toLocaleLowerCase().includes(q)
        )
          {
          if(a.geometry){const vertices=a.geometry.vertices.map(([x,y])=>L.latLng(y,x));const shape=a.geometry.kind==='area'?L.polygon(vertices,{renderer,color:a.geometry.color,weight:3,fillOpacity:.18}):L.polyline(vertices,{renderer,color:a.geometry.color,weight:4});shape.bindPopup(()=>{const record=getExplorerRecords().find(r=>r.key==='custom:'+a.id);return record?usabilityUI.popup(record):el('span',a.title);},markerPopupOptions).addTo(customLayer);shape.on('add',()=>shape.getElement()?.setAttribute('data-owned-geometry',a.id));}
          marker(
            a,
            customLayer,
            "#dceba1",
            `${a.kind} · ${a.category} · ${a.verificationState} · floor ${a.applicability.floor ?? "unknown"}`,
            annotationIcon(state, a),
          );
          }
    if (visibility().curatedEnabled)
      for (const e of state.entities)
        if (
          e.acceptance === "accepted" &&
          `${e.title} ${e.category}`.toLocaleLowerCase().includes(q)
        )
          marker(
            e,
            reviewedLayer,
            e.freshness === "stale" ? "#f2ad70" : "#83d8d1",
            `Reviewed · ${e.freshness} · ${e.refs.length} source records · upstream lineages ${e.independentLineages ?? "unknown"}`,
          );
    const latest = placedRecords(state, selectedSnapshots);
    const sourceIcons = new Map(
      legacy.flatMap(
        (source) =>
          source
            .getSnapshot()
            ?.categories.map(
              (c) => [`${source.id}:${c.id}`, c.icon] as const,
            ) ?? [],
      ),
    );
    const entries = new Map(
      state.snapshots.map((e) => [
        JSON.stringify([e.snapshot.sourceId, e.snapshot.snapshotId]),
        e,
      ]),
    );
    const rawCategories = new Map(
      state.snapshots.flatMap((e) =>
        e.snapshot.records.map(
          (r) =>
            [
              JSON.stringify([
                e.snapshot.sourceId,
                e.snapshot.snapshotId,
                r.id,
              ]),
              r.categoryId,
            ] as const,
        ),
      ),
    );
    let visibleRaw = 0;
    for (const p of latest) {
      const entry = entries.get(JSON.stringify([p.sourceId, p.snapshotId]))!;
      if (entry.legacy) continue;
      if (duplicatePlan.suppressed.has(p.key)) continue;
      const category = rawCategories.get(p.key)!;
      if (
        isVisible(
          visibility(),
          p.sourceId,
          category,
          `${p.title} ${p.category}`,
          true,
        )
      ) {
        visibleRaw++;
        marker(
          p,
          sourceLayer,
          "#9bb6dc",
          `${sourcePolicies[p.sourceId].name} · ${p.category} · ${p.activity} · source claim`,
          undefined,
          sourceIcons.get(`${p.sourceId}:${category}`),
          p.sourceId === "official"
            ? markerSources[0].labelCategories[category]
            : undefined,
        );
      }
    }
    const activeEntries = new Map<string, (typeof state.snapshots)[number]>();
    for (const entry of state.snapshots)
      activeEntries.set(entry.snapshot.sourceId, entry);
    for (const [source, key] of selectedSnapshots) {
      const entry = state.snapshots.find((e) => e.key === key);
      if (entry) activeEntries.set(source, entry);
    }
    let legacyTotal = 0,
      legacyShown = 0;
    for (const source of legacy) {
      if (activeEntries.has(source.id)) continue;
      const snapshot = source.getSnapshot(),
        filters = source.getFilters();
      legacyTotal += snapshot?.records.length ?? 0;
      if (filters.master)
        legacyShown +=
          snapshot?.records.filter(
            (r) =>
              r.x!==null && r.y!==null && filters.enabled.includes(r.category) &&
              !duplicatePlan.suppressed.has(loadedKey(source.id, r.id)) &&
              `${r.name} ${r.category}`.toLocaleLowerCase().includes(q),
          ).length ?? 0;
    }
    const totalRaw = [...activeEntries.values()].reduce(
        (n, e) => n + e.snapshot.records.length,
        legacyTotal,
      ),
      shownRaw = visibleRaw + legacyShown;
    const unregistered = [...activeEntries.values()]
      .filter(
        (e) =>
          !registrationMatches(
            e.snapshot.frame,
            state.registrations.find((r) => r.id === e.registrationId),
          ),
      )
      .reduce((n, e) => n + e.snapshot.records.length, 0);
    const keySummary = document.querySelector("#key-summary");
    if (keySummary)
      keySummary.textContent = `${shownRaw} / ${totalRaw} raw source locations · ${duplicatePlan.suppressed.size} likely duplicate copies hidden · ${unregistered} awaiting registration${capacityExcluded.size ? ` · ${capacityExcluded.size} source(s) unavailable at the20,000-record view limit` : ""} · ${state.annotations.length} custom points · ${state.entities.filter((e) => e.acceptance === "accepted").length} reviewed`;
    const summary = document.querySelector("#official-summary");
    if (summary)
      summary.textContent = `${shownRaw} / ${totalRaw} raw source locations`;
    const summaryCount = document.querySelector("#official-summary-count");
    if (summaryCount) summaryCount.textContent = String(shownRaw);
    if (
      state.annotations.length ||
      state.entities.some((e) => e.acceptance === "accepted") ||
      totalRaw
    )
      document
        .querySelectorAll<HTMLButtonElement>("#key-show-all,#key-hide-all")
        .forEach((b) => (b.disabled = false));
    if (circleCache.size > 20000)
      for (const key of circleCache.keys())
        if (!activeCache.has(key)) circleCache.delete(key);
    const count = document.querySelector(
      ".overlay-summary span:not(.marker-count)",
    );
    if (count)
      count.textContent = `${state.annotations.length} private points · ${state.entities.filter((e) => e.acceptance === "accepted").length} reviewed entities`;
    plannerUI?.renderOverlay();
  }
  const keySlots = new Map<string, HTMLElement>();
  const sourceOverview = el("fieldset");
  sourceOverview.id = "key-website-layers";
  document.querySelector("#map-key-content")!.prepend(sourceOverview);
  const extras = el("section");
  extras.id = "workspace-key-layers";
  document.querySelector("#map-key-content")!.append(extras);
  const dialogExtras = el("section");
  dialogExtras.id = "workspace-dialog-layers";
  document.querySelector("#source-controls")!.append(dialogExtras);
  const disclosureState = new Map<string, boolean>();
  function renderKey() {
    const keyPane = document.querySelector<HTMLElement>("#map-key-content")!;
    const keyScroll = keyPane.scrollTop;
    for (const node of keyPane.querySelectorAll<HTMLDetailsElement>("details[data-menu-section]"))
      disclosureState.set(node.dataset.menuSection!, node.open);

    for (const [key, slot] of keySlots)
      if (legacy.some((s) => s.id === slot.dataset.workspaceProvider)) {
        slot.remove();
        keySlots.delete(key);
      }
    const focused =
      document.activeElement instanceof HTMLElement &&
      (keyPane.contains(document.activeElement) ||
        sourceOverview.contains(document.activeElement) ||
        extras.contains(document.activeElement) ||
        dialogExtras.contains(document.activeElement))
        ? {
            id: document.activeElement.id,
            start:
              document.activeElement instanceof HTMLInputElement
                ? document.activeElement.selectionStart
                : null,
            end:
              document.activeElement instanceof HTMLInputElement
                ? document.activeElement.selectionEnd
                : null,
          }
        : undefined;
    keyPane.querySelector("#combined-map-categories")?.remove();
    sourceOverview.replaceChildren(el("legend", "Website layers"));
    const inspectDuplicates = input("", "checkbox");
    inspectDuplicates.id = "show-duplicate-markers";
    inspectDuplicates.checked = showDuplicateMarkers;
    inspectDuplicates.addEventListener("change", () => {
      showDuplicateMarkers = inspectDuplicates.checked;
      applyLegacyFilters();
      renderMarkers();
      renderKey();
    });
    sourceOverview.append(
      field("Show duplicate markers for comparison", inspectDuplicates),
      note(
        "* marks matching names at the same map location (within 24 image pixels). Copies are hidden, never deleted. Different names, categories and known floors/builds remain separate.",
      ),
    );
    if (duplicatePlan.truncated)
      sourceOverview.append(
        note(
          "Duplicate check reached its work limit. Remaining locations are shown; narrow the source selection for review.",
        ),
      );
    for (const source of legacy) {
      const snapshot = source.getSnapshot();
      if (!snapshot) continue;
      const master = input("", "checkbox");
      master.id = `key-loaded-source-master-${source.id}`;
      master.checked =
        !capacityExcluded.has(source.id) &&
        visibility().sourceEnabled[source.id] !== false;
      if (capacityExcluded.has(source.id))
        master.title =
          "Source retained but unavailable at the20,000-record view limit. Select desired websites and hide another layer if needed.";
      master.indeterminate =
        master.checked &&
        sourceSelection(
          visibility(),
          source.id,
          snapshot.categories.map((c) => c.id),
        ) === "mixed";
      master.addEventListener("change", () => {
        void changeVisibility("Source visibility saved", (value) => {
          value.sourceEnabled[source.id] = master.checked;
        }).catch(error);
      });
      const row = el("div", undefined, "website-layer-row");
      const link = el("a", sourcePolicies[source.id]?.name ?? source.id);
      link.href = sourcePolicies[source.id].page;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.id = `key-source-link-${source.id}`;
      master.setAttribute(
        "aria-label",
        `${sourcePolicies[source.id]?.name ?? source.id} visibility`,
      );
      row.append(
        master,
        link,
        el("span", `${snapshot.records.length} captured locations`),
      );
      if (capacityExcluded.has(source.id))
        row.append(
          note(
            "Unavailable at the20,000-record view limit. Hide another website layer to make room; this capture is retained.",
          ),
        );
      sourceOverview.append(row);
    }
    for (const policy of Object.values(sourcePolicies)) {
      if (legacy.some((source) => source.id === policy.id)) continue;
      const referenceRow = el("div", undefined, "website-layer-row"),
        reference = input("", "checkbox"),
        referenceLink = el("a", policy.name);
      reference.disabled = true;
      reference.id = `key-reference-source-${policy.id}`;
      reference.setAttribute(
        "aria-label",
        `${policy.name}: local source files unavailable`,
      );
      referenceLink.id = `key-source-link-${policy.id}`;
      referenceLink.href = policy.page;
      referenceLink.target = "_blank";
      referenceLink.rel = "noopener noreferrer";
      const retained =
        state.snapshots.find(
          (e) => e.key === selectedSnapshots.get(policy.id),
        ) ??
        state.snapshots.filter((e) => e.snapshot.sourceId === policy.id).at(-1);
      referenceRow.append(
        reference,
        referenceLink,
        el(
          "span",
          retained
            ? `${retained.snapshot.records.length} retained workspace locations; snapshot controls below.`
            : "No local capture: permission and coordinate registration required.",
        ),
      );
      sourceOverview.append(referenceRow);
      for (const parent of [
        document.querySelector("#source-controls")!,
        document.querySelector("#map-key-content")!,
      ]) {
        const key = `${parent.id}:${policy.id}`;
        let slot = keySlots.get(key);
        if (!slot) {
          slot = el("section", undefined, "workspace-provider-card");
          slot.dataset.workspaceProvider = policy.id;
          parent.append(slot);
          keySlots.set(key, slot);
        }
        slot.replaceChildren(
          el("h3", policy.name),
          note(`Permission required · 0 imported records. ${policy.reason}`),
        );
        const link = el("a", "Open source ↗");
        link.href = policy.page;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        slot.append(
          link,
          note(
            "Categories become available after a permission-cleared import.",
          ),
        );
      }
    }
    function controls(host: HTMLElement, prefix: string) {
      host.replaceChildren();
      for (const [k, label] of [
        ["customEnabled", "My points"],
        ["curatedEnabled", "Reviewed map"],
      ] as const) {
        const check = input("", "checkbox");
        check.checked = visibility()[k];
        check.id = `${prefix}key-${k}`;
        check.addEventListener("change", () => {
          void changeVisibility("Layer visibility saved", (value) => {
            value[k] = check.checked;
          }).catch(error);
        });
        host.append(
          field(
            `${label} · ${k === "customEnabled" ? state.annotations.length : state.entities.filter((e) => e.acceptance === "accepted").length}`,
            check,
          ),
        );
      }
      const search = input(visibility().query);
      search.id = prefix + "workspace-map-search";
      search.placeholder = "Find points and source locations";
      search.addEventListener("input", () => {
        if (retainedFailure) {
          error("Export/reload the retained unsaved draft first.");
          renderKey();
          return;
        }
        clearTimeout(searchTimer);
        clearTimeout(filterTimer);
        const value = structuredClone(visibility());
        value.query = search.value;
        pendingVisibility = value;
        applyLegacyFilters();
        renderMarkers();
        dialog.dataset.visibilityEpoch = String(++visibilityEpoch);
        for (const other of document.querySelectorAll<HTMLInputElement>(
          "#workspace-map-search,#layers-workspace-map-search",
        ))
          other.value = value.query;
        searchTimer = setTimeout(() => {
          void persistVisibility("Search saved", value).catch(error);
        }, 400);
      });
      host.append(field("Search map layers", search));
      for (const policy of Object.values(sourcePolicies)) {
        const entries = state.snapshots.filter(
          (e) => e.snapshot.sourceId === policy.id,
        );
        if (!entries.length) continue;
        const selected =
            selectedSnapshots.get(policy.id) ?? entries.at(-1)!.key,
          entry = entries.find((e) => e.key === selected) ?? entries.at(-1)!;
        if (entry.legacy) continue;
        const group = el("fieldset");
        group.dataset.snapshotSource = policy.id;
        const legend = el("legend");
        const sourceLink = el("a", policy.name);
        sourceLink.href = policy.page;
        sourceLink.target = "_blank";
        sourceLink.rel = "noopener noreferrer";
        legend.append(sourceLink, document.createTextNode(" snapshot layers"));
        group.append(legend);
        const snapshot = select(
          entries.map((e) => ({ value: e.key, label: e.snapshot.snapshotId })),
          entry.key,
        );
        snapshot.id = `${prefix}key-source-snapshot-${policy.id}`;
        snapshot.addEventListener("change", () => {
          selectedSnapshots.set(policy.id, snapshot.value);
          applyLegacyFilters();
          refresh();
        });
        group.append(field("Snapshot", snapshot));
        const master = input("", "checkbox");
        master.id = `${prefix}key-source-master-${policy.id}`;
        master.checked = visibility().sourceEnabled[policy.id] !== false;
        master.indeterminate =
          master.checked &&
          sourceSelection(
            visibility(),
            policy.id,
            entry.snapshot.categories.map((c) => c.id),
          ) === "mixed";
        master.addEventListener("change", () => {
          void changeVisibility("Source visibility saved", (value) => {
            value.sourceEnabled[policy.id] = master.checked;
          }).catch(error);
        });
        group.append(
          field(
            `Show source · ${sourceSelection(
              visibility(),
              policy.id,
              entry.snapshot.categories.map((c) => c.id),
            )}`,
            master,
          ),
        );
        for (const category of entry.snapshot.categories) {
          const check = input("", "checkbox");
          check.id = `${prefix}key-source-category-${policy.id}-${category.id}`;
          check.checked =
            visibility().categoryMask[policy.id]?.[category.id] !== false;
          check.addEventListener("change", () => {
            void changeVisibility("Category visibility saved", (value) => {
              value.categoryMask[policy.id] ??= {};
              value.categoryMask[policy.id][category.id] = check.checked;
            }).catch(error);
          });
          const row = field(
            `${category.path.join(" / ")} · ${entry.snapshot.records.filter((r) => r.categoryId === category.id).length}`,
            check,
          );
          const matching = entry.snapshot.records.filter(
            (r) =>
              r.categoryId === category.id &&
              duplicatePlan.matches.has(
                JSON.stringify([policy.id, entry.snapshot.snapshotId, r.id]),
              ),
          ).length;
          if (matching) {
            row.append(
              button(`* ${matching} matching`, () =>
                openExplore("duplicates", {
                  sourceId: policy.id,
                  categoryId: category.id,
                }),
              ),
            );
            row.classList.toggle(
              "duplicate-category",
              matching ===
                entry.snapshot.records.filter(
                  (r) => r.categoryId === category.id,
                ).length,
            );
            row.title =
              "Likely matching source locations are retained for comparison; only one selected copy is drawn.";
          }
          const ownIcon = annotationIcon(state, {
              iconId: null,
              category: entry.mapping[category.id] ?? "Unmapped",
            }),
            sourceIcon = legacy
              .find((source) => source.id === policy.id)
              ?.getSnapshot()
              ?.categories.find((c) => c.id === category.id)?.icon;
          if (ownIcon || sourceIcon) {
            const image = el("img");
            image.src = ownIcon
              ? `data:image/png;base64,${ownIcon.base64}`
              : sourceIcon!;
            image.alt = "";
            image.width = image.height = 24;
            row.insertBefore(image, check);
          }
          group.append(row);
        }
        group.append(
          button(
            "Show source categories",
            () =>
              changeVisibility("All source categories shown", (value) =>
                setSourceAll(
                  value,
                  policy.id,
                  entry.snapshot.categories.map((c) => c.id),
                  true,
                ),
              ),
            `${prefix}key-source-show-${policy.id}`,
          ),
          button(
            "Hide source categories",
            () =>
              changeVisibility("Source categories hidden", (value) =>
                setSourceAll(
                  value,
                  policy.id,
                  entry.snapshot.categories.map((c) => c.id),
                  false,
                ),
              ),
            `${prefix}key-source-hide-${policy.id}`,
          ),
        );
        host.append(group);
      }
      const selectedAsset = state.basemaps.find(
          (b) => b.id === selectedBackgroundId,
        ),
        selectedRegistration = state.registrations.find(
          (r) => r.id === selectedAsset?.registrationId,
        );
      if (
        selectedBackgroundId &&
        (!selectedAsset ||
          !registrationMatches(selectedAsset.frame, selectedRegistration) ||
          comparisonSignature !==
            JSON.stringify([selectedAsset.id, selectedRegistration]))
      ) {
        backgroundRequest++;
        comparison.clear();
        selectedBackgroundId = "";
        comparisonSignature = "";
      }
      const choice = select(
        [
          { value: "", label: "Canonical background" },
          ...state.basemaps.map((b) => ({ value: b.id, label: b.description })),
        ],
        selectedBackgroundId,
      );
      choice.id = prefix + "comparison-background";
      const opacity = input(String(comparisonOpacity), "range");
      opacity.min = "0";
      opacity.max = "100";
      opacity.id = prefix + "comparison-opacity";
      opacity.addEventListener("input", () => {
        comparisonOpacity = Number(opacity.value);
        comparison.setOpacity(comparisonOpacity / 100);
        for (const other of document.querySelectorAll<HTMLInputElement>(
          "#comparison-opacity,#layers-comparison-opacity",
        ))
          other.value = String(comparisonOpacity);
      });
      choice.addEventListener("change", async () => {
        const request = ++backgroundRequest;
        try {
          if (!choice.value) {
            comparison.clear();
            selectedBackgroundId = "";
            comparisonSignature = "";
            renderKey();
            return;
          }
          const asset = state.basemaps.find((b) => b.id === choice.value)!,
            registration = state.registrations.find(
              (r) => r.id === asset.registrationId,
            );
          if (!registrationMatches(asset.frame, registration))
            throw new Error(
              "Calibrate this background in My workspace → Sources before comparison.",
            );
          const blob = await store?.readResource(asset.id);
          if (disposed || request !== backgroundRequest) return;
          if (!blob)
            throw new Error(
              "Background bytes missing. Restore the matching authorized local file.",
            );
          selectedBackgroundId = asset.id;
          comparisonSignature = JSON.stringify([asset.id, registration]);
          const shown = await comparison.show(
            blob,
            registration,
            comparisonOpacity / 100,
          );
          if (!shown || disposed || request !== backgroundRequest) return;
          notice(
            "Calibrated background loaded. Use100% to switch or adjust opacity to compare.",
          );
          renderKey();
        } catch (e) {
          if (disposed || request !== backgroundRequest) return;
          choice.value = "";
          selectedBackgroundId = "";
          comparisonSignature = "";
          comparison.clear();
          renderKey();
          error(e);
        }
      });
      host.append(
        field("Compare local background", choice),
        field("Background opacity (100% switches view)", opacity),
      );
    }
    controls(extras, "");
    controls(dialogExtras, "layers-");
    // One transaction for a category across sources; no duplicate records are created.
    const combined = el("details");
    combined.id = "combined-map-categories";
    combined.dataset.menuSection = "combined";
    combined.open = disclosureState.get("combined") ?? false;
    combined.append(el("summary", "All map categories"),note("Types combine source categories. Original labels remain under each website."));
    const categoryInputs: CategoryInput[] = [];
    const addCategory = (sourceId:string, categoryId:string, path:string[]) => categoryInputs.push({sourceId,categoryId,path});
    for(const source of legacy){
      const entries=state.snapshots.filter(e=>e.snapshot.sourceId===source.id);
      const selected=entries.find(e=>e.key===selectedSnapshots.get(source.id))??entries.at(-1);
      if(selected&&!selected.legacy)continue;
      for(const c of source.getSnapshot()?.categories??[])addCategory(source.id,c.id,[c.group,c.name]);
    }
    for(const policy of Object.values(sourcePolicies)) {
      const entries=state.snapshots.filter(e=>e.snapshot.sourceId===policy.id);
      const entry=entries.find(e=>e.key===selectedSnapshots.get(policy.id)) ?? entries.at(-1);
      if(entry&&!entry.legacy) for(const c of entry.snapshot.categories) addCategory(policy.id,c.id,c.path);
    }
    const categories = new Map(groupMapCategories(categoryInputs).map(category=>[category.id,category]));
    const sectionBulk = (id:string, label:string, members:{sourceId:string;categoryId:string}[]) => {
      const bulk=el('div',undefined,'layer-bulk section-layer-bulk');
      for(const [text,show] of [['Show all',true],['Hide all',false]] as const){
        const action=button(text,()=>changeVisibility(`${label} categories ${show?'shown':'hidden'}`,value=>{
          const sources=new Map<string,string[]>();
          for(const member of members){const ids=sources.get(member.sourceId)??[];ids.push(member.categoryId);sources.set(member.sourceId,ids);}
          for(const [sourceId,ids] of sources){
            value.categoryMask[sourceId]={...value.categoryMask[sourceId],...Object.fromEntries(ids.map(id=>[id,show]))};
            if(show)value.sourceEnabled[sourceId]=true;
          }
        }),`key-section-${id}-${show?'show':'hide'}`);
        action.setAttribute('aria-label',`${text} ${label} categories`);
        action.disabled=members.length===0;bulk.append(action);
      }
      return bulk;
    };
    combined.append(sectionBulk('combined','combined',[...categories.values()].flatMap(c=>c.members)));
    const combinedList=el('details');combinedList.dataset.menuSection='combined-list';combinedList.className='category-sublist';combinedList.append(el('summary',`Categories (${categories.size})`));combined.append(combinedList);
    for(const [key, category] of [...categories].sort((a,b)=>a[1].name.localeCompare(b[1].name))) {
      const check=input("","checkbox");
      check.dataset.combinedCategory=key;
      check.id=`combined-category-${encodeURIComponent(key)}`;
      const selected=category.members.filter(m=>visibility().sourceEnabled[m.sourceId]!==false&&visibility().categoryMask[m.sourceId]?.[m.categoryId]!==false).length;
      check.checked=selected===category.members.length;
      check.indeterminate=selected>0&&selected<category.members.length;
      check.addEventListener("change",()=>{const show=check.checked;void changeVisibility("Combined categories saved",value=>{
        for(const m of category.members){value.categoryMask[m.sourceId]??={};value.categoryMask[m.sourceId][m.categoryId]=show;if(show)value.sourceEnabled[m.sourceId]=true;}
      }).catch(error);});
      combinedList.append(field(`${category.name} · ${category.members.length} source categories`,check));
    }
    if(!categories.size) combined.append(note("No captured categories available."));
    keyPane.prepend(combined);
    // Stable wrappers survive rerenders; native disclosures provide keyboard access.
    for(const node of keyPane.querySelectorAll<HTMLElement>(":scope > .key-source, :scope > .workspace-provider-card")) {
      const id=node.dataset.keySource ?? node.dataset.workspaceProvider!;
      let wrapper=keyPane.querySelector<HTMLDetailsElement>(`details[data-menu-section="source-${id}"]`);
      if(!wrapper){wrapper=el("details");wrapper.dataset.menuSection=`source-${id}`;wrapper.append(el("summary",sourcePolicies[id]?.name ?? id));node.before(wrapper);}
      wrapper.append(node);
    }
    // Source visibility belongs with that source's categories, not a second flat list.
    for(const row of sourceOverview.querySelectorAll<HTMLElement>('.website-layer-row')) {
      const link=row.querySelector<HTMLAnchorElement>('a[id^="key-source-link-"]');
      const id=link?.id.slice('key-source-link-'.length);if(!id)continue;
      const wrapper=keyPane.querySelector<HTMLDetailsElement>(`details[data-menu-section="source-${id}"]`);
      if(wrapper){wrapper.querySelector(':scope > .website-layer-row')?.remove();wrapper.querySelector('summary')!.after(row);}
    }
    let review=keyPane.querySelector<HTMLDetailsElement>('details[data-menu-section="comparison"]');
    if(!review){review=el('details');review.dataset.menuSection='comparison';review.append(el('summary','Duplicate comparison'));}
    review.append(sourceOverview);combined.after(review);
    keyPane.querySelectorAll(':scope > details[data-menu-section^="source-"] > .snapshot-category-list').forEach(node=>node.remove());
    keyPane.querySelectorAll<HTMLElement>(':scope > details[data-menu-section^="source-"] > .workspace-provider-card').forEach(node=>{node.hidden=false;});
    for(const group of extras.querySelectorAll<HTMLElement>(":scope > fieldset[data-snapshot-source]")) {
      const id=group.dataset.snapshotSource!;
      let wrapper=keyPane.querySelector<HTMLDetailsElement>(`details[data-menu-section="source-${id}"]`);
      if(!wrapper){wrapper=el('details');wrapper.dataset.menuSection=`source-${id}`;wrapper.append(el('summary',sourcePolicies[id]?.name??id));keyPane.append(wrapper);}
      wrapper.querySelector(':scope > .snapshot-category-list')?.remove();
      const list=el('details');list.dataset.menuSection=`snapshot-categories-${id}`;list.className='category-sublist snapshot-category-list';list.append(el('summary','Snapshot categories'),group);wrapper.append(list);
      const placeholder=wrapper.querySelector<HTMLElement>(':scope > .workspace-provider-card');if(placeholder)placeholder.hidden=true;
    }
    for(const wrapper of keyPane.querySelectorAll<HTMLDetailsElement>('details[data-menu-section^="source-"]')) {
      const id=wrapper.dataset.menuSection!.slice('source-'.length);
      wrapper.querySelector(':scope > .section-layer-bulk')?.remove();
      const members=[...categories.values()].flatMap(c=>c.members).filter(m=>m.sourceId===id);
      wrapper.querySelector('summary')!.after(sectionBulk(id,sourcePolicies[id]?.name??id,members));
      for(const group of wrapper.querySelectorAll<HTMLElement>('.key-source > fieldset')) {
        const name=group.querySelector('legend')?.textContent??'Categories';
        const list=el('details');list.className='category-sublist';list.dataset.menuSection=`categories-${id}-${name}`;list.append(el('summary',name));group.before(list);list.append(group);
      }
    }
    for(const node of keyPane.querySelectorAll<HTMLDetailsElement>("details[data-menu-section]")) node.open=disclosureState.get(node.dataset.menuSection!) ?? node.classList.contains('category-sublist');
    keyPane.scrollTop=keyScroll;
    if (focused) {
      const next = document.getElementById(focused.id);
      next?.focus();
      if (
        next instanceof HTMLInputElement &&
        focused.start !== null &&
        focused.end !== null &&
        next.type === "text"
      )
        next.setSelectionRange(focused.start, focused.end);
    }
  }
  const sourceEvent = (event: Event) => {
    if (applyingFilters || !store) return;
    const detail = (event as CustomEvent).detail;
    if (
      !legacy.some((source) => source.id === detail.sourceId) ||
      detail.origin !== "user"
    )
      return;
    if (retainedFailure) {
      applyLegacyFilters();
      return;
    }
    const master = detail.master,
      mask = Object.fromEntries(
        detail.categories.map((id: string) => [
          id,
          detail.enabled.includes(id),
        ]),
      );
    const value = structuredClone(visibility());
    value.sourceEnabled[detail.sourceId] = master;
    value.categoryMask[detail.sourceId] = mask;
    pendingVisibility = value;
    clearTimeout(filterTimer);
    clearTimeout(searchTimer);
    filterTimer = setTimeout(() => {
      void persistVisibility("Source masks saved", value).catch(error);
    }, 100);
  };
  document.addEventListener("map-source-filters", sourceEvent);
  const statusEvent = () => {
    if (applyingFilters || !hydrated) return;
    syncUnmigratedLegacy();
    applyLegacyFilters();
    renderMarkers();
    renderKey();
    refreshHighlight();
    if (dialog.open && active === "explore" && !dirty && !detailActive)
      usabilityUI.refreshSearch();
  };
  document.addEventListener("map-source-status", statusEvent);
  function syncUnmigratedLegacy() {
    if (
      pendingVisibility ||
      legacyMigrationCommitted ||
      state.migrations.includes("source-masks-v1") ||
      state.snapshots.some((e) => e.snapshot.sourceId === "official") ||
      !legacy[0]?.getSnapshot()
    )
      return;
    try {
      const plan = planLegacyMaskMigration(
        localStorage,
        { official: legacy[0].getFilters().categories },
        ["official"],
      );
      if (!plan.warnings.length) {
        state.visibility.sourceEnabled.official =
          plan.visibility.sourceEnabled.official;
        state.visibility.categoryMask.official =
          plan.visibility.categoryMask.official;
      }
    } catch {
      /* Private editing still works when only localStorage is unavailable. */
    }
  }
  function applyLegacyFilters(persistLegacy = false) {
    applyingFilters = true;
    try {
      computeDisplayPlan();
      for (const source of legacy) {
        const filters = source.getFilters();
        const id = source.id;
        const selected =
          selectedSnapshots.get(id) ??
          state.snapshots.filter((e) => e.snapshot.sourceId === id).at(-1)?.key;
        const workspaceSource = state.snapshots.find((e) => e.key === selected);
        const replaced = !!workspaceSource && !workspaceSource.legacy;
        source.setLegacyPersistence(
          !legacyMigrationCommitted &&
            !state.migrations.includes("source-masks-v1") &&
            !replaced,
        );
        const keySlot = document.querySelector<HTMLElement>(
          `[data-key-source="${id}"]`,
        );
        const layerSlot = document.querySelector<HTMLElement>(
          `[data-source-slot="${id}"]`,
        );
        if (keySlot) keySlot.hidden = replaced;
        if (layerSlot) layerSlot.hidden = replaced;
        source.setFilters({
          suppressed: new Set(
            (source.getSnapshot()?.records.filter(r=>r.x!==null&&r.y!==null) ?? [])
              .filter((r) => duplicatePlan.suppressed.has(loadedKey(id, r.id)))
              .map((r) => r.id),
          ),
          duplicates: new Map(
            (source.getSnapshot()?.records.filter(r=>r.x!==null&&r.y!==null) ?? [])
              .filter((r) => duplicatePlan.matches.has(loadedKey(id, r.id)))
              .map((r) => [
                r.id,
                duplicatePlan.matches.get(loadedKey(id, r.id))!,
              ]),
          ),
          master:
            !capacityExcluded.has(id) &&
            (!workspaceSource || workspaceSource.legacy) &&
            visibility().sourceEnabled[id] !== false,
          enabled: filters.categories.filter(
            (id) => visibility().categoryMask[source.id]?.[id] !== false,
          ),
          query: visibility().query,
          persistLegacy,
        });
      }
    } finally {
      applyingFilters = false;
    }
  }
  const bulk = (show: boolean) => {
    clearTimeout(filterTimer);
    const categories: Record<string, string[]> = Object.fromEntries(
      legacy.map((source) => [source.id, source.getFilters().categories]),
    );
    for (const entry of state.snapshots)
      categories[entry.snapshot.sourceId] = entry.snapshot.categories.map(
        (c) => c.id,
      );
    void changeVisibility(
      show ? "All layers shown" : "All layers hidden",
      (value) => globalVisibility(value, categories, show),
    ).catch(error);
  };
  const show = () => bulk(true),
    hide = () => bulk(false);
  document.querySelector("#key-show-all")!.addEventListener("click", show);
  document.querySelector("#key-hide-all")!.addEventListener("click", hide);
  const popupOpened = () => { selectionOpen = true; };
  const popupClosed = () => {
    selectionOpen=false;
    if(deferredLegacyFilters&&!disposed){deferredLegacyFilters=false;applyLegacyFilters();}
    if(deferredMapRedraw&&!redrawQueued){redrawQueued=true;queueMicrotask(()=>{
      redrawQueued=false;
      if(!disposed&&!selectionOpen&&deferredMapRedraw)renderMarkers();
    });}
  };
  viewer.map.on("popupopen", popupOpened);
  viewer.map.on("popupclose", popupClosed);
  const disposeSelection=mountSelectionPane(viewer.map,{canReleaseClosed:()=>usabilityDetail&&!dirty&&!unsaved&&!disposed&&!suspended,selectionIdentity:popup=>{const source=(popup as L.Popup & {_source?:L.Layer & {getElement?:()=>HTMLElement}})._source,element=source?.getElement?.(),sourceId=element?.dataset.sourceId,recordId=element?.dataset.sourceMarkerId;if(sourceId&&recordId){const record=getExplorerRecords().find(r=>r.sourceId===sourceId&&r.id===recordId);return record?highlightSignature(record):'source-record-unavailable';}return JSON.stringify(['workspace-selection',revision,backgroundRequest]);},request:intent=>{const result=paneHost?.request(intent);if(result===false&&paneHost?.snapshot().pending?.id!==intent.id)intent.cancel?.();return result;},canInspect:()=>canInspect()&&!unsaved&&!pendingVisibility&&!disposed&&!suspended,showDetail:(node,cleanup)=>{const content=el('section');content.id='ui-selection-detail';content.append(button('Back to map task',closeDetail,'ui-selection-back'),node);showOwnedDetail(content,cleanup,false);return()=>{if(!disposed&&body.contains(node)&&usabilityDetail&&!dirty)closeDetail();};},onError:error});

  const zoom = () => { if(selectionOpen) deferredMapRedraw=true; else renderMarkers(); };
  viewer.map.on("zoomend moveend", zoom);
  const beforeUnload = (event: BeforeUnloadEvent) => {
    const preferenceSave =
      !!failedLabel &&
      /visibility|Source masks|categories|All layers|Search/.test(failedLabel);
    if (
      dirty ||
      processing ||
      (unsaved && !preferenceSave) ||
      (pendingVisibility &&
        (legacyMigrationCommitted ||
          state.migrations.includes("source-masks-v1")))
    ) {
      event.preventDefault();
      event.returnValue = "";
    }
  };
  window.addEventListener("beforeunload", beforeUnload);
  const suspendView=()=>{if(disposed)return;captureCleanView();suspended=true;viewGeneration++;operationOwner.invalidate();paneHost?.suspend();processing?.abort();};
  const resumeView=async(event:PageTransitionEvent)=>{if(!event.persisted||disposed)return;suspended=false;viewGeneration++;if(writing||unconfirmedWrite){notice('A save is still pending confirmation. Keep the retained draft; do not submit it again.');paneHost?.refresh();return;}try{const saved=(await store?.read())?.current;if(disposed||suspended)return;if(saved&&saved.revision!==revision){validateWorkspace(saved.data);if(dirty||unsaved){error('The saved workspace changed while this page was away. Your draft is kept; review backups or reload before another save.');return;}state=saved.data;revision=saved.revision;viewCache.clear();dialog.dataset.revision=String(revision);}const reconcile=reconcileConfirmedEditor;reconcileConfirmedEditor=undefined;reconcile?.();applyLegacyFilters();refresh();paneHost?.refresh();}catch(cause){error(cause);}};
  window.addEventListener('pagehide',suspendView);window.addEventListener('pageshow',resumeView);
  const guardedLink=(event:MouseEvent)=>{if(!paneHost||!dialog.open||event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;const anchor=(event.target as Element)?.closest<HTMLAnchorElement>('a[href]');if(!anchor||anchor.target&&anchor.target!=='_self'||anchor.hasAttribute('download'))return;const url=new URL(anchor.href,location.href);if(!['http:','https:'].includes(url.protocol))return;if(url.origin===location.origin&&url.pathname===location.pathname&&url.search===location.search&&url.hash&&dialog.contains(document.getElementById(url.hash.slice(1))))return;if(!dirty&&!detailActive&&!processing&&!interactionLocks&&!unsaved&&!pendingVisibility)return;event.preventDefault();event.stopImmediatePropagation();const href=url.href;paneHost.request({id:'native-link',label:'Open the selected page',run:()=>location.assign(href),revalidate:()=>!disposed&&anchor.isConnected&&anchor.href===href});};
  document.addEventListener('click',guardedLink,true);
  const initialized = (async () => {
    try {
      store = await openWorkspace({ prepare: preparer.prepare });
      const history = await store.read();
      legacyMigrationCommitted = await store.hasLegacyMigration();
      if (history.current) {
        validateWorkspace(history.current.data);
        state = history.current.data;
        pendingVisibility = undefined;
        revision = history.current.revision;
        dialog.dataset.revision = String(revision);
      }
      syncUnmigratedLegacy();
      hydrated = true;
      dialog.dataset.ready = "true";
      openButton.disabled = false;
      if(paneHost){document.documentElement.dataset.uiMounted='071-v1';document.documentElement.dataset.uiAdapter='map-pane';}
      findButton.disabled = false;
      notice("Private workspace ready.");
      refresh();
      applyLegacyFilters();
      void plannerUI?.loadLocalGraph();plannerUI?.initialShare();
    } catch (e) {
      openButton.disabled = false;
      if(paneHost){document.documentElement.dataset.uiMounted='071-v1';document.documentElement.dataset.uiAdapter='map-pane';}
      findButton.disabled = false;
      error(e);
      refresh();
    }
  })();
  function openTool(target:ToolTarget):boolean{
      const destination=workspaceDestination(target);
      if(!destination)return false;
      if(disposed||suspended||!hydrated)throw new Error('Workspace tools could not open. Check local storage and the workspace status, then try My workspace again.');
      if(paneHost){if(currentTool===target){openWorkspacePane();return true;}if(dirty||(detailActive&&!usabilityDetail)||processing||interactionLocks||unsaved||pendingVisibility){paneHost.request({id:`tool:${target}`,label:`Open ${target.replaceAll('-',' ')}`,run:()=>{openTool(target);},revalidate:()=>!disposed&&hydrated});return true;}}
      if(dirty||(detailActive&&!usabilityDetail)||processing||interactionLocks||unsaved||pendingVisibility)throw new Error('Save or cancel your current draft before opening another tool.');
      captureCleanView();
      currentTool=target;dialog.dataset.uiToolTarget=target;
      if(destination.plannerSection){plannerUI!.open(destination.plannerSection);const heading=body.querySelector<HTMLElement>('h3');if(heading){heading.tabIndex=-1;heading.focus();}return true;}
      active=destination.tab;
      if(destination.section)usabilityUI.openSection(destination.section);
      renderPanel();
      if(modern)viewCache.restore(viewTask());
      if(!dialog.open)openWorkspacePane();
      const focus=destination.focus?body.querySelector<HTMLElement>('#'+destination.focus):nav.querySelector<HTMLElement>(`[data-tab="${active}"]`);
      focus?.focus();
      if(destination.focus)focus?.scrollIntoView({block:'center'});
      return true;
    }
  return {
    ready: initialized,
    showInformation(node:HTMLElement){if(!paneHost)return false;if(body.contains(node)&&usabilityDetail){openWorkspacePane();return true;}const parent=node.parentNode,next=node.nextSibling;return paneHost.request({id:'map-information',label:'Open map information',revalidate:()=>!disposed&&node.isConnected,run:()=>{const root=el('section');root.append(button('Back to map task',closeDetail,'ui-information-back'),node);showOwnedDetail(root,()=>{if(parent?.isConnected)parent.insertBefore(node,next?.parentNode===parent?next:null);},false);}});},
    showLayers(target:"key"|"layers"|"grid"|"updates"="layers"){paneHost?.layers(target);},
    openTool,
    services,
    destroy() {
      disposed=true;
      disposeSelection();
      disposeActiveEditor?.();
      reconcileConfirmedEditor=undefined;
      plannerUI?.destroy();plannerPick=undefined;document.removeEventListener('map-planner-record',plannerRecord);
      usabilityUI.destroy();
      updatesUI.destroy();
      backgroundRequest++;
      disposed = true;
      operationOwner.dispose();
      paneHost?.destroy();
      viewCache.clear();
      document.removeEventListener('click',guardedLink,true);
      window.removeEventListener('pagehide',suspendView);window.removeEventListener('pageshow',resumeView);
      findButton.remove();
      searchHighlight.remove();
      document.removeEventListener("map-duplicate-details", duplicateDetails);
      document.removeEventListener("map-record-details", recordDetails);
      window.removeEventListener("beforeunload", beforeUnload);
      processing?.abort();
      clearTimeout(filterTimer);
      clearTimeout(searchTimer);
      clearTimeout(toastTimer);
      detailCleanup?.();
      comparison.destroy();
      preparer.destroy();
      store?.close();
      viewer.map.off("click", mapPick);
      document.removeEventListener('keydown',cancelMapTool,true);cancelPress();viewer.map.getContainer().removeEventListener('pointerdown',press);viewer.map.getContainer().removeEventListener('pointermove',movePress);viewer.map.getContainer().removeEventListener('pointerup',cancelPress);viewer.map.getContainer().removeEventListener('pointercancel',cancelPress);
      viewer.map.off("contextmenu", rightClickPoint);
      viewer.map.off("zoomend moveend", zoom);
      viewer.map.off("popupopen", popupOpened);
      viewer.map.off("popupclose", popupClosed);
      document.removeEventListener("workspace-error", errorListener);
      document.removeEventListener("map-source-filters", sourceEvent);
      document.removeEventListener("map-source-status", statusEvent);
      document
        .querySelector("#key-show-all")
        ?.removeEventListener("click", show);
      document
        .querySelector("#key-hide-all")
        ?.removeEventListener("click", hide);
      customLayer.remove();
      sourceLayer.remove();
      reviewedLayer.remove();
      dialog.remove();
      openButton.remove();
      extras.remove();
      sourceOverview.remove();
      dialogExtras.remove();
      keySlots.forEach((slot) => slot.remove());
      toast.remove();
    },
  };
}
