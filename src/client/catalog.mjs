import {
  matchesTokens,
  readHomeSearch,
  writeHomeSearch,
} from "../domain/reader-flow.mjs";
const home = document.querySelector(".home-search");
if (home)
  home.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      location.assign(
        writeHomeSearch(document.querySelector("#home-search").value),
      );
    } catch {
      document.querySelector("#home-search-status").textContent =
        "Search transfer unavailable. Open the catalog and enter your search there.";
    }
  });
const form = document.querySelector("#catalog-filters");
if (form && document.documentElement?.dataset?.uiVariant === "modern")
  mountModernCatalog(form);
else if (form) {
  const query = form.querySelector("#catalog-search"),
    type = form.querySelector('[name="type"]'),
    pack = form.querySelector('[name="pack"]'),
    sort = form.querySelector("#catalog-sort");
  const cards = [...document.querySelectorAll("[data-record-card]")];
  const allowed = (field, value) =>
    [...field.options].some((option) => option.value === value);
  function writeURL() {
    const params = new URLSearchParams();
    if (type.value && allowed(type, type.value)) params.set("type", type.value);
    if (allowed(pack, pack.value)) params.set("pack", pack.value);
    if (sort && allowed(sort, sort.value)) params.set("sort", sort.value);
    history.replaceState(
      null,
      "",
      location.pathname + (params.size ? "?" + params : ""),
    );
  }
  function readURL() {
    const params = new URLSearchParams(location.search);
    query.value = (params.get("q") || "").slice(0, 200);
    type.value = allowed(type, params.get("type")) ? params.get("type") : "";
    pack.value = allowed(pack, params.get("pack"))
      ? params.get("pack")
      : form.dataset.defaultPack || "";
    if (sort)
      sort.value = allowed(sort, params.get("sort"))
        ? params.get("sort")
        : "name";
    const token = params.get("search");
    // Strip arbitrary query/token/unknown params even if transfer parsing fails.
    writeURL();
    let transferError = false;
    if (token !== null) {
      try {
        query.value = readHomeSearch(token);
      } catch {
        transferError = true;
        query.value = "";
      }
    }
    filter(false);
    if (transferError)
      document.querySelector("#catalog-count").textContent =
        "Search transfer unavailable. Enter your search here.";
  }
  function filter(update) {
    for (const anchor of document.querySelectorAll(".site-nav a[href]")) {
      const target = new URL(anchor.href, location.href);
      if (pack.value && allowed(pack, pack.value))
        target.searchParams.set("pack", pack.value);
      else target.searchParams.delete("pack");
      anchor.href = target.href;
    }
    if (sort)
      for (const container of document.querySelectorAll(".item-directory")) {
        const current = [...container.querySelectorAll("[data-record-card]")];
        const rows = [...current];
        rows.sort(
          (a, b) =>
            (a.dataset[sort.value] || "").localeCompare(
              b.dataset[sort.value] || "",
            ) || a.dataset.name.localeCompare(b.dataset.name),
        );
        // A search input's change event can fire on pointer-down blur. Moving
        // an already ordered row then detaches the pressed anchor and cancels
        // its native click. Reorder only when the sequence actually changes.
        if (rows.some((row, index) => row !== current[index]))
          container.append(...rows);
      }
    let count = 0;
    for (const card of cards) {
      const show =
        matchesTokens(card.dataset.search, query.value) &&
        (!type.value || card.dataset.type === type.value) &&
        (!pack.value || card.dataset.pack === pack.value);
      card.hidden = !show;
      if (show) count++;
    }
    for (const section of document.querySelectorAll("[data-catalog-section]"))
      section.hidden = ![
        ...section.querySelectorAll("[data-record-card]"),
      ].some((card) => !card.hidden);
    document.querySelector("#catalog-count").textContent =
      `${count} matching record${count === 1 ? "" : "s"}. Coverage not established.`;
    document.querySelector("#catalog-empty").hidden = count !== 0;
    if (update) writeURL();
  }
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    filter(true);
  });
  form.addEventListener("input", () => filter(true));
  form.addEventListener("change", () => filter(true));
  window.addEventListener("popstate", readURL);
  readURL();
}

/** The catalog owns its complete public row model before any row is detached. */
function mountModernCatalog(form) {
  const query = form.querySelector("#catalog-search"),
    type = form.querySelector('[name="type"]'),
    pack = form.querySelector('[name="pack"]'),
    sort = form.querySelector("#catalog-sort");
  const cards = [...document.querySelectorAll("[data-record-card]")],
    owned = new Set(cards),
    groups = new Map();
  for (const card of cards) {
    const parent = card.parentElement;
    if (!groups.has(parent)) groups.set(parent, []);
    groups.get(parent).push(card);
  }
  const count = document.querySelector("#catalog-count"),
    empty = document.querySelector("#catalog-empty"),
    nav = document.createElement("nav"),
    previous = document.createElement("button"),
    next = document.createElement("button"),
    label = document.createElement("label"),
    sizeChoice = document.createElement("select"),
    pageStatus = document.createElement("span");
  nav.id = "catalog-pagination";
  nav.className = "toolbar";
  nav.setAttribute("aria-label", "Catalog pages");
  nav.setAttribute("aria-describedby", count.id);
  count.tabIndex = -1;
  previous.type = next.type = "button";
  previous.textContent = "Previous page";
  next.textContent = "Next page";
  label.textContent = "Rows per page";
  sizeChoice.id = "catalog-page-size";
  label.htmlFor = sizeChoice.id;
  for (const value of [25, 50, 100]) {
    const option = document.createElement("option");
    option.value = String(value);
    option.textContent = String(value);
    sizeChoice.append(option);
  }
  pageStatus.id = "catalog-page-status";
  nav.append(previous, label, sizeChoice, pageStatus, next);
  count.after(nav);
  let size = 50,
    page = 0,
    signature = "",
    returnHref = null,
    fallbackView = null,
    sessionOnly = false;
  const allowed = (field, value) =>
    [...field.options].some((option) => option.value === value);
  const editable = (card) =>
    !!card.querySelector(
      'input,select,textarea,[contenteditable]:not([contenteditable="false"])',
    );
  const state = () => ({
    version: 1,
    path: location.pathname,
    query: query.value.slice(0, 200),
    type: type.value,
    pack: pack.value,
    sort: sort?.value ?? "",
    size,
    page,
    returnHref,
  });
  const saveView = () => {
    const params = new URLSearchParams();
    if (type.value && allowed(type, type.value)) params.set("type", type.value);
    if (allowed(pack, pack.value)) params.set("pack", pack.value);
    if (sort && allowed(sort, sort.value)) params.set("sort", sort.value);
    if (size !== 50) params.set("size", String(size));
    if (page) params.set("page", String(page + 1));
    fallbackView = state();
    try {
      const current = history.state;
      const plain =
        current === null ||
        (typeof current === "object" &&
          !Array.isArray(current) &&
          [Object.prototype, null].includes(Object.getPrototypeOf(current)));
      const safe =
        plain &&
        (current?.dmzCatalog071 === undefined ||
          validView(current.dmzCatalog071));
      sessionOnly = !safe;
      // Unknown/oversized namespaces and non-object foreign state are preserved,
      // including their exact payload. Only the approved public URL is normalized.
      history.replaceState(
        safe ? { ...current, dmzCatalog071: fallbackView } : current,
        "",
        location.pathname + (params.size ? "?" + params : ""),
      );
    } catch {
      sessionOnly = true;
    }
  };
  const hrefs = new Set(
    cards
      .flatMap((card) =>
        [...card.querySelectorAll("h3 a[href]")].map((anchor) =>
          anchor.getAttribute("href"),
        ),
      )
      .filter((href) => {
        try {
          return (
            href.startsWith("/") &&
            !href.startsWith("//") &&
            new URL(href, location.href).origin === location.origin
          );
        } catch {
          return false;
        }
      }),
  );
  function validView(saved) {
    try {
      if (
        !saved ||
        typeof saved !== "object" ||
        Array.isArray(saved) ||
        Object.keys(saved).sort().join(",") !==
          "pack,page,path,query,returnHref,size,sort,type,version" ||
        new TextEncoder().encode(JSON.stringify(saved)).length > 16384
      )
        return false;
      if (
        saved.version !== 1 ||
        saved.path !== location.pathname ||
        typeof saved.query !== "string" ||
        saved.query.length > 200 ||
        !allowed(type, saved.type) ||
        !allowed(pack, saved.pack) ||
        (sort && !allowed(sort, saved.sort)) ||
        ![25, 50, 100].includes(saved.size) ||
        !Number.isSafeInteger(saved.page) ||
        saved.page < 0 ||
        !(saved.returnHref === null || hrefs.has(saved.returnHref))
      )
        return false;
      const matches = cards.filter(
        (card) =>
          matchesTokens(card.dataset.search, saved.query) &&
          (!saved.type || card.dataset.type === saved.type) &&
          (!saved.pack || card.dataset.pack === saved.pack),
      ).length;
      return saved.page < Math.max(1, Math.ceil(matches / saved.size));
    } catch {
      return false;
    }
  }
  function render(focus = false) {
    const before = document.activeElement;
    query.value = query.value.slice(0, 200);
    const currentSignature = JSON.stringify([
      query.value,
      type.value,
      pack.value,
      sort?.value,
    ]);
    if (signature && currentSignature !== signature) {
      page = 0;
      returnHref = null;
    }
    signature = currentSignature;
    const ordered = [],
      orderedGroups = new Map();
    for (const [parent, rows] of groups) {
      const sorted = [...rows];
      if (sort)
        sorted.sort(
          (a, b) =>
            (a.dataset[sort.value] || "").localeCompare(
              b.dataset[sort.value] || "",
            ) || (a.dataset.name || "").localeCompare(b.dataset.name || ""),
        );
      ordered.push(...sorted);
      orderedGroups.set(parent, sorted);
    }
    const matches = ordered.filter(
      (card) =>
        matchesTokens(card.dataset.search, query.value) &&
        (!type.value || card.dataset.type === type.value) &&
        (!pack.value || card.dataset.pack === pack.value),
    );
    const pages = Math.max(1, Math.ceil(matches.length / size));
    page = Math.min(Math.max(0, page), pages - 1);
    const selected = new Set(matches.slice(page * size, (page + 1) * size));
    let retained = 0;
    for (const card of ordered)
      if (editable(card)) {
        if (!selected.has(card)) retained++;
        selected.add(card);
      }
    for (const [parent, rows] of orderedGroups) {
      const wanted = rows.filter((card) => selected.has(card));
      const current = [...parent.children].filter((node) => owned.has(node));
      if (
        current.length !== wanted.length ||
        current.some((node, index) => node !== wanted[index])
      ) {
        for (const node of current) if (!selected.has(node)) node.remove();
        let cursor = parent.firstChild;
        for (const node of wanted) {
          while (cursor && !owned.has(cursor)) cursor = cursor.nextSibling;
          if (node !== cursor) parent.insertBefore(node, cursor);
          cursor = node.nextSibling;
        }
      }
      for (const node of wanted) node.hidden = false;
      const section = parent.closest("[data-catalog-section]");
      if (section) section.hidden = !wanted.length;
    }
    saveView();
    const message = `${matches.length} matching record${matches.length === 1 ? "" : "s"}. Coverage not established. Showing ${matches.length ? page * size + 1 : 0}–${Math.min(matches.length, (page + 1) * size)}; page ${page + 1} of ${pages}.${retained ? ` ${retained} editable rows retained outside this page/filter; their values are unchanged.` : ""}${sessionOnly ? " View context is session-only; existing navigation data was kept." : ""}`;
    if (count.textContent !== message) count.textContent = message;
    pageStatus.textContent = `Page ${page + 1} of ${pages}`;
    previous.disabled = page === 0;
    next.disabled = page + 1 === pages;
    sizeChoice.value = String(size);
    empty.hidden = matches.length !== 0;
    for (const anchor of document.querySelectorAll(".site-nav a[href]")) {
      const target = new URL(anchor.href, location.href);
      if (pack.value && allowed(pack, pack.value))
        target.searchParams.set("pack", pack.value);
      else target.searchParams.delete("pack");
      anchor.href = target.href;
    }
    if (
      focus ||
      (before instanceof HTMLElement &&
        (!before.isConnected || before.closest("[hidden]")))
    )
      count.focus({ preventScroll: true });
  }
  function readURL() {
    const params = new URLSearchParams(location.search);
    let recorded = null;
    try {
      recorded = history.state?.dmzCatalog071;
    } catch {
      sessionOnly = true;
    }
    const saved = validView(recorded)
      ? recorded
      : validView(fallbackView)
        ? fallbackView
        : null;
    const valid = !!saved;
    query.value = valid ? saved.query : (params.get("q") || "").slice(0, 200);
    type.value = valid
      ? saved.type
      : allowed(type, params.get("type"))
        ? params.get("type")
        : "";
    pack.value = valid
      ? saved.pack
      : allowed(pack, params.get("pack"))
        ? params.get("pack")
        : form.dataset.defaultPack || "";
    if (sort)
      sort.value = valid
        ? saved.sort
        : allowed(sort, params.get("sort"))
          ? params.get("sort")
          : "name";
    size = valid
      ? saved.size
      : [25, 50, 100].includes(Number(params.get("size")))
        ? Number(params.get("size"))
        : 50;
    const requested = Number(params.get("page"));
    page = valid
      ? saved.page
      : Number.isSafeInteger(requested) && requested > 0 && requested <= 1000000
        ? requested - 1
        : 0;
    returnHref = valid ? saved.returnHref : null;
    let transferError = false;
    if (params.has("search")) {
      try {
        query.value = readHomeSearch(params.get("search"));
        page = 0;
      } catch {
        query.value = "";
        transferError = true;
      }
    }
    signature = "";
    render();
    if (transferError)
      count.textContent =
        "Search transfer unavailable. Enter your search here.";
    if (returnHref) {
      const anchor = [
        ...document.querySelectorAll("[data-record-card] a[href]"),
      ].find((anchor) => anchor.getAttribute("href") === returnHref);
      anchor?.focus({ preventScroll: true });
    }
  }
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    render();
  });
  form.addEventListener("input", () => render());
  form.addEventListener("change", () => render());
  previous.addEventListener("click", () => {
    page--;
    returnHref = null;
    render(true);
  });
  next.addEventListener("click", () => {
    page++;
    returnHref = null;
    render(true);
  });
  sizeChoice.addEventListener("change", () => {
    page = Math.floor((page * size) / Number(sizeChoice.value));
    size = Number(sizeChoice.value);
    returnHref = null;
    render(true);
  });
  document.addEventListener(
    "click",
    (event) => {
      const anchor =
        event.target instanceof Element
          ? event.target.closest("[data-record-card] a[href]")
          : null;
      if (anchor && hrefs.has(anchor.getAttribute("href"))) {
        returnHref = anchor.getAttribute("href");
        saveView();
      }
    },
    true,
  );
  window.addEventListener("popstate", readURL);
  window.addEventListener("pagehide", saveView);
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) readURL();
  });
  readURL();
}
