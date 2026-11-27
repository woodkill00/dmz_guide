import { readPublicJSON } from "./public-data.mjs";
import {
  searchEntries,
  validateSearchIndex,
} from "../domain/navigation-hub.mjs";
const form = document.querySelector("#unified-search");
if (form) {
  const query = document.querySelector("#unified-query"),
    type = document.querySelector("#unified-type"),
    status = document.querySelector("#unified-status"),
    results = document.querySelector("#unified-results"),
    more = document.querySelector("#unified-more"),
    previous = document.querySelector("#unified-prev");
  let index,
    offset = 0;
  let controller = new AbortController();
  let inputTimer;
  window.addEventListener("pagehide", () => controller.abort());
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      controller = new AbortController();
      if (!index) loadIndex();
    }
  });
  const params = new URL(location.href).searchParams;
  query.value = (params.get("q") || "").slice(0, 200);
  try {
    if (!params.has("q"))
      query.value = (
        sessionStorage.getItem("dmz-unified-search-query") || ""
      ).slice(0, 200);
    const raw = sessionStorage.getItem("dmz-unified-search-transfer");
    sessionStorage.removeItem("dmz-unified-search-transfer");
    if (raw && raw.length < 2048) {
      const v = JSON.parse(raw);
      if (typeof v.query === "string" && v.query.length <= 200)
        query.value = v.query;
    }
    sessionStorage.setItem("dmz-unified-search-query", query.value);
  } catch {}
  if ([...type.options].some((o) => o.value === params.get("type")))
    type.value = params.get("type");
  const a = (url, text) => {
    const a = document.createElement("a");
    a.href = url;
    a.textContent = text;
    if (url.startsWith("http:")) {
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    }
    return a;
  };
  function render() {
    if (!index) return;
    let { rows, total } = searchEntries(index, query.value, type.value, offset);
    const last = Math.max(0, Math.ceil(total / 100) - 1) * 100;
    if (offset > last) {
      offset = last;
      ({ rows, total } = searchEntries(index, query.value, type.value, offset));
    }
    results.replaceChildren();
    status.textContent = `${total} matching records/tools · showing ${Math.min(offset + 1, total)}–${Math.min(offset + 100, total)}. ${index.limited ? `Limited index: ${index.indexedCount} of ${index.eligibleCount} eligible public records. Missing results may be outside this index.` : "Public index loaded; source coverage remains incomplete."}`;
    for (const kind of [...new Set(rows.map((r) => r.type))]) {
      const section = document.createElement("section"),
        h = document.createElement("h2");
      h.textContent = kind;
      section.append(h);
      for (const r of rows.filter((r) => r.type === kind)) {
        const item = document.createElement("article");
        item.className = "search-result";
        const title = document.createElement("h3"),
          p = document.createElement("p"),
          actions = document.createElement("div");
        title.append(a(r.url, r.title));
        p.textContent = r.summary;
        actions.className = "actions";
        actions.append(a(r.url, "Open details"));
        if (r.mapUrl) actions.append(a(r.mapUrl, "Show grid on map ↗"));
        if (r.planUrl)
          actions.append(
            a(
              r.planUrl,
              r.type === "key" ? "Stash and trip" : "Review collection needs",
            ),
          );
        item.append(title, p, actions);
        section.append(item);
      }
      results.append(section);
    }
    more.hidden = offset + 100 >= total;
    previous.hidden = offset === 0;
  }
  function writeURL() {
    const url = new URL(location.href);
    if (query.value.trim())
      url.searchParams.set("q", query.value.trim().slice(0, 200));
    else url.searchParams.delete("q");
    if (type.value) url.searchParams.set("type", type.value);
    else url.searchParams.delete("type");
    if (offset) url.searchParams.set("page", String(offset / 100 + 1));
    else url.searchParams.delete("page");
    const next = url.pathname + url.search + url.hash;
    if (next !== location.pathname + location.search + location.hash)
      history.pushState(null, "", next);
  }
  function readURL() {
    const p = new URL(location.href).searchParams;
    query.value = (p.get("q") || "").slice(0, 200);
    type.value = [...type.options].some((o) => o.value === p.get("type"))
      ? p.get("type")
      : "";
    const page = Number(p.get("page") || 1);
    offset =
      Number.isInteger(page) && page >= 1 && page <= 100 ? (page - 1) * 100 : 0;
  }
  const pageParam = Number(params.get("page") || 1);
  if (Number.isInteger(pageParam) && pageParam >= 1 && pageParam <= 100)
    offset = (pageParam - 1) * 100;
  function apply() {
    offset = 0;
    render();
    writeURL();
  }
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    clearTimeout(inputTimer);
    apply();
  });
  query.addEventListener("input", () => {
    try {
      sessionStorage.setItem(
        "dmz-unified-search-query",
        query.value.slice(0, 200),
      );
    } catch {}
    clearTimeout(inputTimer);
    inputTimer = setTimeout(apply, 120);
  });
  type.addEventListener("change", () => {
    clearTimeout(inputTimer);
    apply();
  });
  more.addEventListener("click", () => {
    offset += 100;
    render();
    writeURL();
    status.tabIndex = -1;
    status.focus();
  });
  previous.addEventListener("click", () => {
    offset = Math.max(0, offset - 100);
    render();
    writeURL();
    status.tabIndex = -1;
    status.focus();
  });
  document.querySelector("#unified-clear").addEventListener("click", () => {
    clearTimeout(inputTimer);
    query.value = "";
    type.value = "";
    apply();
    query.focus();
  });
  window.addEventListener("popstate", () => {
    clearTimeout(inputTimer);
    readURL();
    render();
  });
  function loadIndex() {
    const own = controller;
    return readPublicJSON(
      "/assets/content/unified-search.json",
      2097152,
      own.signal,
    )
      .then((v) => {
        if (own !== controller || own.signal.aborted) return;
        index = validateSearchIndex(v);
        render();
        document.dispatchEvent(new Event("directory-ready"));
      })
      .catch(() => {
        if (own === controller && !own.signal.aborted)
          status.textContent =
            "Search data could not load. Browse All features or the catalog; refresh to retry.";
      });
  }
  void loadIndex();
}
