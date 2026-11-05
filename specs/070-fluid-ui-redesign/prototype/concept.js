const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
let activeTask = "layers",
  returnTask = "layers",
  selected = "",
  zoom = 1,
  reached = 0,
  dirty = false,
  pendingTask = null,
  pendingNavigation = null,
  returnFocusId = "",
  routeName = "Example route";
const states = {
  layers: {},
  search: { query: "", scroll: 0 },
  route: {},
  details: {},
};
const nav = $("#mobile-nav");
nav.addEventListener("click", () => {
  const open = $("#global-nav").classList.toggle("open");
  nav.setAttribute("aria-expanded", String(open));
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && $("#global-nav").classList.contains("open")) {
    $("#global-nav").classList.remove("open");
    nav.setAttribute("aria-expanded", "false");
    nav.focus();
  }
});
$("#density").onclick = () => {
  const on = document.body.classList.toggle("compact");
  $("#density").setAttribute("aria-pressed", String(on));
  $("#density").textContent = on ? "Comfortable" : "Compact";
};
$("#theme").onclick = () => {
  const on = document.body.classList.toggle("light");
  $("#theme").setAttribute("aria-pressed", String(on));
  $("#theme").textContent = on ? "Dark" : "Light";
};
const draftDialog = document.createElement("dialog");
draftDialog.setAttribute("aria-labelledby", "draft-heading");
draftDialog.innerHTML =
  '<h2 id="draft-heading">Keep your route-name edit?</h2><p>This is a synthetic draft. Choose how to continue.</p><div class="detail-actions"><button id="draft-save">Save and continue</button><button id="draft-discard">Discard edit</button><button id="draft-stay">Stay here</button></div><p id="draft-error" role="status"></p>';
document.body.append(draftDialog);
function continueIntent() {
  const destination = pendingNavigation;
  pendingNavigation = null;
  const task = pendingTask;
  pendingTask = null;
  if (destination) {
    location.hash = destination;
    navigate();
  } else if (task) showTask(task);
}
$("#draft-save").onclick = () => {
  const value = $("#route-name")?.value.trim();
  if (!value) {
    $("#draft-error").textContent =
      "Enter a route name before saving, or choose Discard.";
    return;
  }
  routeName = value;
  dirty = false;
  draftDialog.close();
  continueIntent();
};
$("#draft-discard").onclick = () => {
  dirty = false;
  draftDialog.close();
  continueIntent();
};
$("#draft-stay").onclick = () => {
  draftDialog.close();
  pendingTask = null;
  pendingNavigation = null;
};
function remember() {
  states[activeTask].scroll = $("#task-body").scrollTop;
  if (activeTask === "layers") {
    states.layers.open = $$("#task-body details").map((n) => n.open);
    const fields = $$("[data-layer]");
    if (fields.length)
      states.layers.values = Object.fromEntries(
        fields.map((n) => [n.dataset.layer, n.checked]),
      );
  }
}
function requestTask(task) {
  $(".map-layout").classList.remove("focus", "peek");
  $("#focus-map").setAttribute("aria-pressed", "false");
  $("#focus-map").textContent = "Focus map";
  $("#sheet-size").setAttribute("aria-expanded", "true");
  $("#sheet-size").textContent = "Minimize panel";
  if (task === activeTask) return;
  if (dirty && task !== "route") {
    pendingTask = task;
    $("#draft-error").textContent = "";
    draftDialog.showModal();
    return;
  }
  showTask(task);
}
function showTask(task) {
  remember();
  activeTask = task;
  $("#task-title").textContent = {
    layers: "Layers",
    search: "Find locations",
    route: "Route",
    details: selected,
  }[task];
  $$("[data-task]").forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.task === task)),
  );
  const body = $("#task-body");
  if (task === "layers") {
    body.innerHTML =
      '<p class="muted">Visibility belongs here. Updates and imports would live under Tools.</p><details open><summary>Combined layers <span class="tag">Demo</span></summary><div class="bulk"><button data-bulk="all">Show all</button><button data-bulk="none">Hide all</button></div><label class="check-row"><input type="checkbox" checked data-layer="a">Reference markers</label><label class="check-row"><input type="checkbox" checked data-layer="b">Route context</label></details><details><summary>Example source A</summary><p>Synthetic source label; production retains original attribution and matching evidence.</p><label class="check-row"><input type="checkbox" checked>Example category</label></details><details><summary>My points & reviewed map</summary><p>Private and reviewed layers retain their separate controls and state.</p></details>';
    if (states.layers.open)
      $$("#task-body details").forEach(
        (n, i) => (n.open = states.layers.open[i] ?? false),
      );
    $$("[data-bulk]").forEach(
      (b) =>
        (b.onclick = () => {
          $$("[data-layer]").forEach((c) => {
            c.checked = b.dataset.bulk === "all";
          });
          syncLayers();
        }),
    );
    $$("[data-layer]").forEach((c) => {
      c.checked = states.layers.values?.[c.dataset.layer] ?? true;
      c.onchange = syncLayers;
    });
    syncLayers();
  } else if (task === "search") {
    body.innerHTML =
      '<label>Find a location<input id="map-query" type="search" placeholder="Try Reference A"></label><p id="search-count" class="muted" role="status"></p><div id="map-results"></div>';
    $("#map-query").value = states.search.query;
    $("#map-query").oninput = () => {
      states.search.query = $("#map-query").value;
      paintResults();
    };
    paintResults();
  } else if (task === "route") {
    body.innerHTML =
      '<p class="muted">Manual tracking. No GPS, game detection or road solving is connected.</p><label>Route name<input id="route-name" maxlength="80"></label><div class="detail-actions"><button id="save-demo-route">Save name</button><button id="cancel-demo-route">Cancel edit</button></div><p id="save-state" role="status">Example only · nothing written to storage</p><ol class="route-list"><li><span>1 · Reference A</span><button aria-label="Move Reference A down">↓</button></li><li><span>2 · Reference B</span><button aria-label="Move Reference B up">↑</button></li><li><span>3 · Reference C</span></li></ol><p class="muted">Production retains Up/Down and drag reorder, route identity and bounded road-gap diagnostics.</p>';
    $("#route-name").value = routeName;
    $("#route-name").oninput = () => {
      dirty = true;
      $("#save-state").textContent = "Unsaved example draft";
    };
    $("#save-demo-route").onclick = () => {
      const value = $("#route-name").value.trim();
      if (!value) {
        $("#save-state").textContent = "Enter a route name.";
        $("#route-name").focus();
        return;
      }
      const b = $("#save-demo-route");
      b.disabled = true;
      $("#save-state").textContent = "Saving example…";
      setTimeout(() => {
        routeName = value;
        dirty = false;
        b.disabled = false;
        $("#save-state").textContent =
          "Example name updated · not saved to a profile";
      }, 650);
    };
    $("#cancel-demo-route").onclick = () => {
      dirty = false;
      $("#route-name").value = routeName;
      $("#save-state").textContent = "Example edit cancelled";
    };
    $$(".route-list button").forEach(
      (b) =>
        (b.onclick = () => {
          const row = b.closest("li"),
            list = row.parentElement;
          if (b.textContent === "↓" && row.nextElementSibling)
            list.insertBefore(row.nextElementSibling, row);
          else if (b.textContent === "↑" && row.previousElementSibling)
            list.insertBefore(row, row.previousElementSibling);
          $("#save-state").textContent =
            "Example rows reordered · no route calculation";
          b.focus();
        }),
    );
  } else {
    body.innerHTML =
      '<button id="detail-back"></button><p class="eyebrow">SELECTED LOCATION · DEMO</p><h3 id="selected-title"></h3><span class="tag">Unknown evidence</span><p class="muted">An example of a long description. The marker selection changes this pane, never the camera. Source uncertainty remains visible instead of being buried in another popup.</p><div class="detail-actions"><button id="locate-example">Locate</button><button id="select-route">Open route</button></div><details><summary>Source and verification</summary><p>Synthetic record. Not a real location, source claim or verified map coordinate.</p></details>';
    $("#detail-back").textContent =
      "← Back to " +
      { layers: "Layers", search: "Find locations", route: "Route" }[
        returnTask
      ];
    $("#detail-back").onclick = () => {
      showTask(returnTask);
      (
        document.getElementById(returnFocusId) ??
        document.querySelector(`[data-task="${returnTask}"]`)
      )?.focus();
    };
    $("#selected-title").textContent =
      selected === "Reference B"
        ? "Reference B — an intentionally long example location name"
        : selected;
    $("#locate-example").onclick = () => {
      $("#task-status").textContent =
        "Locate requested explicitly. Production would focus this location.";
    };
    $("#select-route").onclick = () => requestTask("route");
  }
  body.scrollTop = states[task].scroll ?? 0;
  $("#task-status").textContent = "Illustrative controls · session only";
}
function syncLayers() {
  $(".pin-a").hidden = !$('[data-layer="a"]').checked;
  $(".pin-b").hidden = !$('[data-layer="a"]').checked;
  $("#task-status").textContent = "Example layer visibility updated";
}
function paintResults() {
  const list = $("#map-results");
  list.replaceChildren();
  const found = ["Reference A", "Reference B"].filter((n) =>
    n.toLowerCase().includes(states.search.query.toLowerCase()),
  );
  $("#search-count").textContent = found.length + " synthetic results";
  for (const name of found) {
    const b = document.createElement("button");
    b.className = "result";
    b.textContent = name + " · Unknown evidence";
    b.id = "result-" + name.replaceAll(" ", "-");
    b.onclick = () => selectRecord(name, b.id);
    list.append(b);
  }
  if (!found.length) list.textContent = "No example matches. Try Reference A.";
}
function selectRecord(name, origin) {
  returnFocusId = origin ?? document.activeElement?.id ?? "";
  if (dirty) {
    pendingTask = "details";
    selected = name;
    returnTask = activeTask;
    draftDialog.showModal();
    return;
  }
  returnTask = activeTask === "details" ? returnTask : activeTask;
  selected = name;
  $$(".map-pin").forEach((p) =>
    p.setAttribute("aria-pressed", String(p.dataset.record === name)),
  );
  $(".map-layout").classList.remove("focus", "peek");
  $("#focus-map").setAttribute("aria-pressed", "false");
  $("#focus-map").textContent = "Focus map";
  $("#sheet-size").setAttribute("aria-expanded", "true");
  $("#sheet-size").textContent = "Minimize panel";
  showTask("details");
  $("#task-title").tabIndex = -1;
  $("#task-title").focus();
}
$$("[data-task]").forEach(
  (b) => (b.onclick = () => requestTask(b.dataset.task)),
);
$$("[data-record]").forEach(
  (b) => (b.onclick = () => selectRecord(b.dataset.record, b.id)),
);
$("#open-route").onclick = () => requestTask("route");
$("#focus-map").onclick = () => {
  const on = $(".map-layout").classList.toggle("focus");
  $("#focus-map").setAttribute("aria-pressed", String(on));
  $("#focus-map").textContent = on ? "Restore panel" : "Focus map";
};
$("#sheet-size").onclick = () => {
  const on = $(".map-layout").classList.toggle("peek");
  $("#sheet-size").setAttribute("aria-expanded", String(!on));
  $("#sheet-size").textContent = on ? "Expand panel" : "Minimize panel";
};
$("#route-minimize").onclick = () => {
  $(".route-slot").classList.add("compact-route");
  $("#route-restore").hidden = false;
  $("#route-restore").focus();
};
$("#route-restore").onclick = () => {
  $(".route-slot").classList.remove("compact-route");
  $("#route-restore").hidden = true;
  $("#route-minimize").focus();
};
$("#mark-reached").onclick = () => {
  reached = Math.min(3, reached + 1);
  $("#mark-reached").disabled = reached === 3;
  $("#route-progress").textContent = reached + " / 3 · manual";
  $("#next-stop").textContent =
    reached === 3
      ? "Example route complete"
      : "Next: Reference " + ["A", "B", "C"][reached];
};
$("#zoom-in").onclick = () => {
  zoom = Math.min(1.6, zoom + 0.1);
  $(".terrain").style.setProperty("--zoom", zoom);
};
$("#zoom-out").onclick = () => {
  zoom = Math.max(0.8, zoom - 0.1);
  $(".terrain").style.setProperty("--zoom", zoom);
};
let currentView = "home";
const directoryData = {
  fob: [
    ["Example upgrade family I", "Needed", "2 example units"],
    ["Example upgrade family II", "Ready", "0"],
    ["Example capacity family II", "Needed", "4 example units"],
  ],
  guide: [
    ["Example mission group", "Unknown", "Source review"],
    ["Example key", "Reference", "Prerequisites"],
    ["Example story page", "Reference", "Spoiler controls"],
  ],
  weapons: [
    ["Example rifle", "*WZ · untested DMZ", "Unknown damage"],
    ["Example attachment", "Unknown", "No verified value"],
    ["Example saved build", "Private example", "No profile loaded"],
  ],
};
function renderDirectory() {
  const list = directoryData[currentView] ?? directoryData.fob;
  const q = $("#record-search").value.toLowerCase(),
    filter = $("#record-filter").value,
    tbody = $("#records");
  tbody.replaceChildren();
  let count = 0;
  for (const row of list) {
    if (
      !row[0].toLowerCase().includes(q) ||
      (filter === "needed" && row[1] !== "Needed")
    )
      continue;
    count++;
    const tr = document.createElement("tr");
    for (const value of row.slice(0, 3)) {
      const td = document.createElement("td");
      td.textContent = value;
      tr.append(td);
    }
    const td = document.createElement("td");
    const details = document.createElement("details"),
      summary = document.createElement("summary");
    summary.textContent = "Expand";
    details.append(summary);
    const p = document.createElement("p");
    p.textContent =
      "Synthetic detail. Production would show full requirements, uses and evidence here.";
    details.append(p);
    if (currentView === "fob") {
      const label = document.createElement("label");
      label.className = "check-row";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.onchange = () => {
        $("#record-feedback").textContent = checkbox.checked
          ? "Example stage complete · local demo only"
          : "Example completion cleared";
      };
      label.append(checkbox, document.createTextNode("Mark example complete"));
      details.append(label);
    }
    td.append(details);
    tr.append(td);
    tbody.append(tr);
  }
  $("#result-count").textContent = count + " example rows";
  $("#empty-results").hidden = count > 0;
}
function navigate() {
  const target = location.hash.slice(1) || "home";
  const next = ["home", "map", "fob", "guide", "weapons"].includes(target)
    ? target
    : "home";
  if (dirty && next !== currentView) {
    pendingNavigation = next;
    pendingTask = null;
    history.replaceState(null, "", "#" + currentView);
    if (!draftDialog.open) draftDialog.showModal();
    return;
  }
  currentView = next;
  $("#home-view").hidden = next !== "home";
  $("#map-view").hidden = next !== "map";
  $("#directory-view").hidden = ["home", "map"].includes(next);
  $$("#global-nav a").forEach((a) => {
    if (a.hash === "#" + next) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  $("#global-nav").classList.remove("open");
  nav.setAttribute("aria-expanded", "false");
  if (["guide", "fob", "weapons"].includes(next)) {
    $("#directory-context").textContent = {
      fob: "DMZ FOB / UPGRADES",
      guide: "DMZ GUIDE / REFERENCE",
      weapons: "DMZ WEAPONS / ROSTER",
    }[next];
    $("#directory-title").textContent = {
      fob: "Your next progression.",
      guide: "The detail, without the clutter.",
      weapons: "Build from clear information.",
    }[next];
    $("#table-caption").textContent =
      "Synthetic " + next + " examples, not a complete game catalog";
    renderDirectory();
  }
}
$("#record-search").oninput = renderDirectory;
$("#record-filter").onchange = renderDirectory;
window.addEventListener("hashchange", navigate);
showTask("layers");
navigate();

const searchDialog = document.createElement("dialog");
searchDialog.setAttribute("aria-labelledby", "search-heading");
searchDialog.innerHTML =
  '<h2 id="search-heading">Search this concept</h2><label for="global-query">Find a section</label><input id="global-query" type="search" placeholder="Map, upgrades, weapons…"><div id="global-results" class="search-links"></div><button id="close-global-search">Close search</button>';
document.body.append(searchDialog);
function globalResults() {
  const rows = [
      ["Home", "home"],
      ["Map · layers, routes and locations", "map"],
      ["DMZ Guide · missions and keys", "guide"],
      ["DMZ FOB · upgrades and inventory", "fob"],
      ["DMZ Weapons · roster and attachments", "weapons"],
    ],
    list = $("#global-results");
  list.replaceChildren();
  for (const [label, hash] of rows.filter((r) =>
    r[0].toLowerCase().includes($("#global-query").value.toLowerCase()),
  )) {
    const a = document.createElement("a");
    a.href = "#" + hash;
    a.textContent = label;
    a.onclick = () => searchDialog.close();
    list.append(a);
  }
  if (!list.children.length) list.textContent = "No matching section.";
}
$("#global-search").onclick = () => {
  globalResults();
  searchDialog.showModal();
  $("#global-query").focus();
};
$("#global-query").oninput = globalResults;
$("#close-global-search").onclick = () => searchDialog.close();
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && $("#utility-menu").open) {
    $("#utility-menu").open = false;
    $("#utility-menu summary").focus();
  }
});
document.addEventListener("click", (e) => {
  if (!$("#utility-menu").contains(e.target)) $("#utility-menu").open = false;
});
const originalSizeClick = $("#sheet-size").onclick;
$("#sheet-size").onclick = () => {
  if (matchMedia("(max-width:700px)").matches) originalSizeClick();
  else $("#focus-map").click();
};
