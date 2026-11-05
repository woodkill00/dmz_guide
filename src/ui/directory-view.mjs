/**
 * Explicit progressive enhancement for owner-approved directories only.
 * Pagination detaches clean inactive rows; existing controls/rows are never
 * cloned. Editable rows remain attached because this helper cannot certify a
 * domain owner's durable/dirty state. Do not opt live DOM-enumerating filters
 * into pagination without first adapting their full-row ownership model.
 */
const mounted = new WeakMap();
let identity = 0;
const rowSelector = "tr,[data-record-card],[data-ui-directory-row]";
const editableSelector =
  "input,select,textarea,[contenteditable]:not([contenteditable=false])";
const normal = (text) => text.normalize("NFKC").toLocaleLowerCase().trim();
const isRow = (element) =>
  element.nodeType === 1 && element.matches(rowSelector);

function mount(host) {
  const doc = host.ownerDocument,
    win = doc.defaultView;
  if (host.closest("[data-ui-variant]")?.dataset.uiVariant !== "modern")
    return null;
  const body = [...host.querySelectorAll("[data-ui-directory-rows]")].find(
    (element) => element.closest("[data-ui-directory]") === host,
  );
  if (!body || host.hasAttribute("data-ui-directory-mounted")) return null;
  const searchField = [
    ...host.querySelectorAll("input[data-ui-directory-search]"),
  ].find((element) => element.closest("[data-ui-directory]") === host);
  const scroll = [...host.querySelectorAll("[data-ui-directory-scroll]")].find(
    (element) => element.closest("[data-ui-directory]") === host,
  );
  const paginated = host.dataset.uiDirectoryPagination === "true";
  const search = paginated ? searchField : null;
  const parsedLimit = Number(host.dataset.uiDirectoryPageLimit);
  const limit =
    Number.isSafeInteger(parsedLimit) && parsedLimit > 0
      ? Math.min(100, parsedLimit)
      : 100;
  const sizes = [
    ...new Set([25, 50, 100].map((size) => Math.min(size, limit))),
  ];
  const requestedSize = Number(host.dataset.uiDirectoryPageSize);
  let size = sizes.includes(requestedSize)
    ? requestedSize
    : Math.min(50, limit);
  let rows = [...body.children].filter(isRow),
    page = 0,
    query = "",
    timer = null,
    disposed = false;
  const parked = new Set(),
    abort = new win.AbortController(),
    signal = abort.signal;
  const ownedAttributes = new Map();
  const status = doc.createElement("p");
  status.dataset.uiDirectoryStatus = "";
  status.className = "ui-directory-status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  const navigation = doc.createElement("nav");
  navigation.dataset.uiDirectoryPaginationControls = "";
  navigation.setAttribute(
    "aria-label",
    `${host.getAttribute("aria-label") || "Directory"} pages`,
  );
  const button = (text) => {
    const element = doc.createElement("button");
    element.type = "button";
    element.textContent = text;
    return element;
  };
  const previous = button("Previous page"),
    next = button("Next page");
  const label = doc.createElement("label"),
    choice = doc.createElement("select");
  label.textContent = "Rows per page";
  for (const value of sizes) {
    const option = doc.createElement("option");
    option.value = String(value);
    option.textContent = String(value);
    choice.append(option);
  }
  choice.value = String(size);
  const pageLabel = doc.createElement("span");
  pageLabel.className = "ui-directory-page-label";
  navigation.append(previous, label, choice, pageLabel, next);
  do {
    status.id = `ui-directory-status-${++identity}`;
  } while (doc.getElementById(status.id));
  choice.id = `${status.id}-size`;
  label.htmlFor = choice.id;
  navigation.setAttribute("aria-describedby", status.id);
  host.append(status);
  if (paginated) host.append(navigation);
  const table = body.closest("table");
  const previousColumns =
    table?.style.getPropertyValue("--ui-directory-columns") || "";
  const previousColumnsPriority =
    table?.style.getPropertyPriority("--ui-directory-columns") || "";
  const previousHead =
    scroll?.style.getPropertyValue("--ui-directory-head-height") || "";
  const previousHeadPriority =
    scroll?.style.getPropertyPriority("--ui-directory-head-height") || "";
  const previousIdentityWidth =
    scroll?.style.getPropertyValue("--ui-directory-identity-width") || "";
  const previousIdentityPriority =
    scroll?.style.getPropertyPriority("--ui-directory-identity-width") || "";
  const previousIdentityFit = host.getAttribute(
    "data-ui-directory-identity-fit",
  );
  let focusFrame = 0,
    rendering = false;
  const columns = table?.tHead
    ? Math.max(
        1,
        ...[...table.tHead.rows].map((row) =>
          [...row.cells].reduce((sum, cell) => sum + cell.colSpan, 0),
        ),
      )
    : 1;
  if (table) table.style.setProperty("--ui-directory-columns", String(columns));

  function rememberAttributes(row) {
    if (ownedAttributes.has(row)) return;
    ownedAttributes.set(row, {
      page: row.getAttribute("data-ui-directory-on-page"),
      match: row.getAttribute("data-ui-directory-match"),
    });
  }
  const protectedRow = (row) =>
    row.contains(doc.activeElement) ||
    row.isContentEditable ||
    (row.hasAttribute("data-ui-directory-dirty") &&
      row.dataset.uiDirectoryDirty !== "false") ||
    !!row.querySelector(editableSelector);
  const observer = new win.MutationObserver(() => refresh());
  function observe() {
    if (!disposed)
      observer.observe(body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: [
          "hidden",
          "data-ui-directory-search-text",
          "data-ui-directory-dirty",
          "disabled",
          "readonly",
        ],
      });
  }
  function readRows() {
    // Detached-by-us rows remain owned; an externally removed/moved live row does not.
    rows = rows.filter((row) => parked.has(row) || row.parentElement === body);
    for (const row of [...body.children].filter(isRow))
      if (!rows.includes(row)) rows.push(row);
  }
  function measureHeading() {
    if (disposed || !scroll) return;
    if (table?.tHead)
      scroll.style.setProperty(
        "--ui-directory-head-height",
        `${table.tHead.getBoundingClientRect().height}px`,
      );
    const first = body.querySelector("tr > :first-child");
    const target = doc.activeElement;
    const targetRow = target?.closest?.("tr");
    const outsideIdentity =
      targetRow &&
      targetRow.parentElement === body &&
      !targetRow.firstElementChild.contains(target);
    const required = outsideIdentity
      ? target.getBoundingClientRect().width
      : 44;
    const gap = Math.max(
      8,
      parseFloat(win.getComputedStyle(doc.documentElement).fontSize) / 2,
    );
    const width = first?.getBoundingClientRect().width || 0;
    const fit =
      host.dataset.uiDirectoryStickyIdentity === "true" &&
      !win.matchMedia("(max-width:700px)").matches &&
      width + required + gap * 2 <= scroll.clientWidth;
    host.dataset.uiDirectoryIdentityFit = String(fit);
    scroll.style.setProperty(
      "--ui-directory-identity-width",
      `${fit ? width : 0}px`,
    );
  }
  function revealFocused() {
    focusFrame = 0;
    if (disposed || !scroll) return;
    measureHeading();
    const target = doc.activeElement;
    if (!target || !body.contains(target)) return;
    const row = target.closest("tr");
    if (
      !row ||
      row.parentElement !== body ||
      row.firstElementChild.contains(target)
    )
      return;
    const area = scroll.getBoundingClientRect(),
      rect = target.getBoundingClientRect();
    const first = row.firstElementChild.getBoundingClientRect();
    const gap = Math.max(
      8,
      parseFloat(win.getComputedStyle(doc.documentElement).fontSize) / 2,
    );
    const left =
      host.dataset.uiDirectoryIdentityFit === "true"
        ? first.right + gap
        : area.left + gap;
    const right = area.right - gap;
    if (rect.left < left) scroll.scrollLeft += rect.left - left;
    else if (rect.right > right) scroll.scrollLeft += rect.right - right;
  }
  function currentQuery() {
    if (!search) return true;
    if (search.value.length > 256) {
      status.textContent = "Search is too long. Shorten it to 256 characters.";
      return false;
    }
    const nextQuery = normal(search.value);
    if (nextQuery !== query) {
      query = nextQuery;
      page = 0;
    }
    return true;
  }
  function cancelTimer() {
    if (timer !== null) win.clearTimeout(timer);
    timer = null;
    status.removeAttribute("aria-busy");
  }
  function render() {
    if (disposed || rendering) return;
    rendering = true;
    observer.disconnect();
    const tokens = query.split(/\s+/).filter(Boolean);
    const matches = rows.filter(
      (row) =>
        !row.hidden &&
        (!tokens.length ||
          (row.hasAttribute("data-ui-directory-search-text") &&
            tokens.every((token) =>
              normal(row.dataset.uiDirectorySearchText).includes(token),
            ))),
    );
    const pages = Math.max(1, Math.ceil(matches.length / size));
    page = Math.max(0, Math.min(page, pages - 1));
    const selected = new Set(
      paginated ? matches.slice(page * size, (page + 1) * size) : matches,
    );
    const matching = new Set(matches);
    const protectedRows = new Set(
      rows.filter((row) => !row.hidden && protectedRow(row)),
    );
    const desired = rows.filter(
      (row) => !row.hidden && (selected.has(row) || protectedRows.has(row)),
    );
    const desiredSet = new Set(desired);
    for (const row of rows) {
      rememberAttributes(row);
      row.dataset.uiDirectoryOnPage = String(selected.has(row));
      row.dataset.uiDirectoryMatch = String(matching.has(row));
      if (paginated && row.parentElement === body && !desiredSet.has(row)) {
        // Domain-hidden rows retain their hidden attribute; only clean rows detach.
        if (protectedRow(row)) continue;
        row.remove();
        parked.add(row);
      }
    }
    // Avoid moving already-correct nodes, especially a focused input/row.
    let before = null;
    for (let i = paginated ? desired.length - 1 : -1; i >= 0; i--) {
      const row = desired[i];
      if (row.parentElement !== body || row.nextElementSibling !== before)
        body.insertBefore(row, before);
      parked.delete(row);
      before = row;
    }
    const extra = desired.filter((row) => !selected.has(row)).length;
    const start = matches.length ? (paginated ? page * size + 1 : 1) : 0;
    const end = paginated
      ? Math.min((page + 1) * size, matches.length)
      : matches.length;
    status.textContent = matches.length
      ? `Showing ${start}–${end} of ${matches.length} available rows.`
      : rows.length
        ? "No matching rows. Clear the search or the owner's filters."
        : "No rows supplied.";
    if (extra)
      status.textContent += ` ${extra} focused or form-owned ${extra === 1 ? "row remains" : "rows remain"} available outside this page or filter.`;
    pageLabel.textContent = `Page ${page + 1} of ${pages}`;
    const focused = doc.activeElement;
    previous.disabled = page === 0;
    next.disabled = page >= pages - 1;
    if (focused === previous && previous.disabled)
      (next.disabled ? choice : next).focus();
    else if (focused === next && next.disabled)
      (previous.disabled ? choice : previous).focus();
    measureHeading();
    rendering = false;
    observe();
  }
  function refresh() {
    if (disposed) return;
    cancelTimer();
    readRows();
    if (currentQuery()) render();
  }
  previous.addEventListener(
    "click",
    () => {
      cancelTimer();
      if (!currentQuery() || page <= 0) return;
      page--;
      render();
    },
    { signal },
  );
  next.addEventListener(
    "click",
    () => {
      cancelTimer();
      if (!currentQuery()) return;
      page++;
      render();
    },
    { signal },
  );
  choice.addEventListener(
    "change",
    () => {
      cancelTimer();
      if (!currentQuery() || !sizes.includes(Number(choice.value))) return;
      size = Number(choice.value);
      page = 0;
      render();
    },
    { signal },
  );
  search?.addEventListener(
    "input",
    () => {
      cancelTimer();
      status.setAttribute("aria-busy", "true");
      timer = win.setTimeout(() => {
        timer = null;
        status.removeAttribute("aria-busy");
        if (currentQuery()) render();
      }, 180);
    },
    { signal },
  );
  host.addEventListener("ui-directory-refresh", refresh, { signal });
  host.addEventListener(
    "focusin",
    () => {
      measureHeading();
      if (focusFrame) win.cancelAnimationFrame(focusFrame);
      focusFrame = win.requestAnimationFrame(revealFocused);
      // Focus changes can release a clean row previously pinned outside its page.
      if (
        rows.some(
          (row) =>
            row.parentElement === body &&
            row.dataset.uiDirectoryOnPage === "false",
        )
      )
        render();
    },
    { signal },
  );
  const resize = new win.ResizeObserver(measureHeading);
  if (table?.tHead) resize.observe(table.tHead);
  if (scroll) resize.observe(scroll);
  host.dataset.uiDirectoryMounted = "071-v1";
  currentQuery();
  render();
  const cleanup = () => {
    if (disposed) return;
    readRows();
    disposed = true;
    cancelTimer();
    abort.abort();
    observer.disconnect();
    resize.disconnect();
    if (focusFrame) win.cancelAnimationFrame(focusFrame);
    // Restore every still-owned node in source order without cloning or replacing forms.
    let before = null;
    for (let i = rows.length - 1; i >= 0; i--) {
      const row = rows[i];
      if (
        paginated &&
        (row.parentElement !== body || row.nextElementSibling !== before)
      )
        body.insertBefore(row, before);
      const old = ownedAttributes.get(row);
      for (const [name, value] of [
        ["data-ui-directory-on-page", old?.page ?? null],
        ["data-ui-directory-match", old?.match ?? null],
      ]) {
        if (value === null) row.removeAttribute(name);
        else row.setAttribute(name, value);
      }
      before = row;
    }
    status.remove();
    navigation.remove();
    host.removeAttribute("data-ui-directory-mounted");
    if (table) {
      if (previousColumns)
        table.style.setProperty(
          "--ui-directory-columns",
          previousColumns,
          previousColumnsPriority,
        );
      else table.style.removeProperty("--ui-directory-columns");
    }
    if (scroll) {
      if (previousHead)
        scroll.style.setProperty(
          "--ui-directory-head-height",
          previousHead,
          previousHeadPriority,
        );
      else scroll.style.removeProperty("--ui-directory-head-height");
    }
    if (scroll) {
      if (previousIdentityWidth)
        scroll.style.setProperty(
          "--ui-directory-identity-width",
          previousIdentityWidth,
          previousIdentityPriority,
        );
      else scroll.style.removeProperty("--ui-directory-identity-width");
    }
    if (previousIdentityFit === null)
      host.removeAttribute("data-ui-directory-identity-fit");
    else
      host.setAttribute("data-ui-directory-identity-fit", previousIdentityFit);
    mounted.delete(host);
  };
  mounted.set(host, cleanup);
  return cleanup;
}

/** Each call owns only newly mounted hosts; repeated calls do not duplicate controllers. */
export function mountDirectories(root = document) {
  const hosts = [...root.querySelectorAll("[data-ui-directory]")];
  if (root.nodeType === 1 && root.matches("[data-ui-directory]"))
    hosts.unshift(root);
  const cleanups = hosts
    .filter((host) => !mounted.has(host))
    .map(mount)
    .filter(Boolean);
  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    for (const cleanup of cleanups) cleanup();
  };
}
