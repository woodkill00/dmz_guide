import { canonicalWeaponHref } from "../domain/weapon-routes.mjs";
import { decodeHTML } from "../domain/site-topology.mjs";
const escape = (value) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function canonicalizeWeaponAnchors(html, ids) {
  return html.replace(
    /<!--[\s\S]*?-->|<(script|style|textarea|title)\b(?:[^>"']|"[^"]*"|'[^']*')*>[\s\S]*?<\/\1\s*>|<a\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi,
    (tag) =>
      !/^<a\b/i.test(tag)
        ? tag
        : tag.replace(
            /(\s+)([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'<>`]+)))?/g,
            (attribute, space, name, double, single, bare) => {
              if (
                name.toLowerCase() !== "href" ||
                (double ?? single ?? bare) === undefined
              )
                return attribute;
              const original = decodeHTML(double ?? single ?? bare),
                target = canonicalWeaponHref(original, ids);
              return target === original
                ? attribute
                : `${space}href="${escape(target)}"`;
            },
          ),
  );
}
