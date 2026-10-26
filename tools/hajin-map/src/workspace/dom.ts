export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text?: string,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
export function button(
  text: string,
  action: () => void | Promise<unknown>,
  id?: string,
) {
  const b = el("button", text);
  b.type = "button";
  if (id) b.id = id;
  b.addEventListener("click", () => {
    try {
      void Promise.resolve(action()).catch((error) =>
        document.dispatchEvent(
          new CustomEvent("workspace-error", { detail: error }),
        ),
      );
    } catch (error) {
      document.dispatchEvent(
        new CustomEvent("workspace-error", { detail: error }),
      );
    }
  });
  return b;
}
let fieldNumber = 0;
export function field(
  label: string,
  input: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
) {
  const row = el("div", undefined, "workspace-field"),
    caption = el("label", label);
  input.id ||= `workspace-field-${++fieldNumber}`;
  caption.htmlFor = input.id;
  row.append(caption, input);
  return row;
}
export function input(value = "", type = "text", max = 200) {
  const node = el("input");
  node.type = type;
  node.value = value;
  if (type === "text") node.maxLength = max;
  return node;
}
export function select(
  options: { value: string; label: string }[],
  value?: string,
) {
  const node = el("select");
  for (const option of options) {
    const o = el("option", option.label);
    o.value = option.value;
    node.append(o);
  }
  if (value !== undefined) node.value = value;
  return node;
}
export function note(text: string) {
  return el("p", text, "workspace-note");
}
export function download(
  name: string,
  text: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = el("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const errorText = (error: unknown) =>
  error instanceof Error ? error.message : String(error);
export function pagedList<T>(
  items: T[],
  label: string,
  searchText: (item: T) => string,
  renderItem: (item: T) => HTMLElement,
  size = 50,
) {
  const root = el("section"),
    query = input(""),
    list = el("div");
  query.dataset.workspaceSearch = "true";
  let page = 0;
  const render = () => {
    const filtered = items.filter((item) =>
      searchText(item)
        .toLocaleLowerCase()
        .includes(query.value.toLocaleLowerCase()),
    );
    page = Math.max(0, Math.min(page, Math.ceil(filtered.length / size) - 1));
    list.replaceChildren(
      note(
        `${filtered.length} items · page ${page + 1}/${Math.max(1, Math.ceil(filtered.length / size))}`,
      ),
    );
    for (const item of filtered.slice(page * size, (page + 1) * size))
      list.append(renderItem(item));
    list.append(
      button("Previous page", () => {
        page--;
        render();
      }),
      button("Next page", () => {
        page++;
        render();
      }),
    );
  };
  query.addEventListener("input", () => {
    page = 0;
    render();
  });
  root.append(field(label, query), list);
  render();
  return root;
}
