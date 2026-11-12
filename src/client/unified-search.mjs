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
    more = document.querySelector("#unified-more");
  let index,
    offset = 0;
  let controller = new AbortController();
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
    const { rows, total } = searchEntries(
      index,
      query.value,
      type.value,
      offset,
    );
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
  }
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    offset = 0;
    render();
  });
  form.addEventListener("input", () => {
    try {
      sessionStorage.setItem(
        "dmz-unified-search-query",
        query.value.slice(0, 200),
      );
    } catch {}
    offset = 0;
    render();
  });
  form.addEventListener("change", (event) => {
    if (event.target !== type) return;
    offset = 0;
    render();
  });
  more.addEventListener("click", () => {
    offset += 100;
    render();
    status.focus();
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
