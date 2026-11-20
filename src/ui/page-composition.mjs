import { validatePageDocument } from "../domain/page-document.mjs";
const e = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
// Only called on our own escaped renderer output, never on imported markup.
export function pageProjectionParts(html) {
  const parts = {};
  let depth = 0,
    start = 0,
    last = 0,
    index = 0;
  const loose = [];
  for (const match of html.matchAll(/<\/?section\b[^>]*>/g)) {
    if (!match[0].startsWith("</")) {
      if (depth++ === 0) {
        loose.push(html.slice(last, match.index));
        start = match.index;
      }
    } else if (--depth === 0) {
      const body = html.slice(start, match.index + match[0].length);
      const title = (
        /<h2[^>]*>([\s\S]*?)<\/h2>/.exec(body)?.[1] || `Details ${++index}`
      ).replace(/<[^>]+>/g, "");
      let key =
        "detail:" +
        title
          .toLowerCase()
          .replace(/&[^;]+;/g, "-")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 90);
      while (parts[key]) key += "-next";
      parts[key] = { title, html: body };
      last = match.index + match[0].length;
    }
  }
  loose.push(html.slice(last));
  if (loose.join("").trim())
    parts["detail:other"] = {
      title: "Additional details",
      html: loose.join(""),
    };
  return parts;
}
export function renderPageComposition(
  document,
  {
    projections = {},
    imageURL = () => null,
    referenceURL = () => null,
    editorMarkers = false,
  } = {},
) {
  validatePageDocument(document);
  const image = (b) => {
    const url = imageURL(b.assetId);
    const caption = [
      b.caption,
      b.fit === "cover" ? "Fill frame may crop or enlarge" : "",
    ]
      .filter(Boolean)
      .map(e)
      .join(" · ");
    return `<figure class="page-photo page-fit-${b.fit} page-focus-${Math.round(b.focalX * 4)}-${Math.round(b.focalY * 4)}">${url ? `<a href="${e(url)}" target="_blank" rel="noopener noreferrer"><img src="${e(url)}" alt="${e(b.alt)}" loading="lazy" decoding="async"></a>` : '<span class="page-missing-image">Picture unavailable; saved placement retained</span>'}<figcaption>${caption}</figcaption></figure>`;
  };
  let expansionBytes = 0;
  const block = (b) => {
    const raw = rawBlock(b);
    const html = editorMarkers
      ? `<div data-pe-block="${e(b.id)}" data-pe-type="${e(b.type)}">${raw}</div>`
      : raw;
    expansionBytes += new TextEncoder().encode(html).length;
    if (expansionBytes > 8388608)
      throw Error(
        "Page exceeds the 8MiB rendered-block budget. Use links instead of repeating large canonical sections.",
      );
    return html;
  };
  function rawBlock(b) {
    switch (b.type) {
      case "paragraph":
        return `<p class="page-prose">${e(b.text)}</p>`;
      case "heading":
        return `<h${b.level}>${e(b.text)}</h${b.level}>`;
      case "list":
        return `<${b.ordered ? "ol" : "ul"}>${b.entries.map((t) => `<li>${e(t)}</li>`).join("")}</${b.ordered ? "ol" : "ul"}>`;
      case "steps":
        return `<ol>${b.entries.map((t) => `<li id="${t.id}">${e(t.text)}</li>`).join("")}</ol>`;
      case "callout":
        return `<aside class="page-callout page-callout-${b.tone}">${e(b.text)}</aside>`;
      case "image":
        return image(b);
      case "gallery":
        return `<div class="page-gallery">${b.entries.map(image).join("")}</div>`;
      case "table":
        return `<div class="page-table" role="region" aria-label="Custom reference table" tabindex="0"><table><thead><tr>${b.columns.map((c) => `<th scope="col">${e(c)}</th>`).join("")}</tr></thead><tbody>${b.rows.map((r) => `<tr>${r.map((c) => `<td>${e(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
      case "reference": {
        const url = referenceURL(b.target);
        return url
          ? `<p><a href="${e(url)}">${e(b.label)}</a></p>`
          : `<p>${e(b.label)} · Link unavailable</p>`;
      }
      case "group":
        return `<div class="page-two-column">${b.children.map(block).join("")}</div>`;
      case "managed": {
        const value = projections[b.projection];
        if (value === undefined)
          throw Error("Unresolved managed page projection: " + b.projection);
        return value.html ?? value;
      }
      default:
        throw Error("Unknown page block");
    }
  }
  const html = `<div class="page-composition">${document.sections
    .map((s) => {
      const content = s.blocks.map(block).join(""),
        provenance =
          s.kind === "custom"
            ? '<small class="page-authored-note">Authored guide notes · not independently verified</small>'
            : "";
      return s.collapsed
        ? `<details id="${s.id}" class="page-section"><summary>${e(s.title)}</summary><div class="page-section-${s.layout}">${provenance}${content}</div></details>`
        : `<section id="${s.id}" class="page-section"><h2>${e(s.title)}</h2>${s.kind === "custom" ? '<small class="page-authored-note">Authored guide notes · not independently verified</small>' : ""}<div class="page-section-${s.layout}">${content}</div></section>`;
    })
    .join(
      "",
    )}${document.deletedAnchors.map((id) => `<span id="${id}" class="page-retired-anchor">This guide section was removed.</span>`).join("")}</div>`;
  const seen = new Set();
  for (const [, id] of html.matchAll(/\sid="([^"]+)"/g)) {
    if (seen.has(id))
      throw Error(
        "Repeated canonical section anchors. Remove the repeated managed block or choose another source section.",
      );
    seen.add(id);
  }
  return html;
}
