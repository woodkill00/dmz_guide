import { validateIconDesign, designedPNG, type IconDesign } from './icon-design.ts';
// Narrow compatibility boundary: native normalization has no database or UI side effects.
import {
  normalizeRaster,
  decodeRaster,
} from "../../../../src/client/raster-editor.mjs";
import {
  imageInfo,
  base64FromBytes,
  bytesFromBase64,
} from "../../../../src/content/portable.mjs";
import type { IconAsset, Workspace } from "./model.ts";
import { sha256 } from "./import.ts";
export const iconBytes = (icon: IconAsset): Uint8Array =>
  bytesFromBase64(icon.base64);
export function validateStoredIcon(icon: IconAsset) {
  if (
    !icon ||
    !/^[a-f0-9]{64}$/.test(icon.id) ||
    typeof icon.description !== "string" ||
    !icon.description.trim() ||
    icon.description.length > 200 ||
    typeof icon.rightsDeclaration !== "string" ||
    !icon.rightsDeclaration.trim() ||
    icon.rightsDeclaration.length > 4000
  )
    throw new Error("Invalid custom icon metadata.");
  if(icon.design!==undefined)validateIconDesign(icon.design);
  const bytes = iconBytes(icon),
    info = imageInfo(bytes);
  if (
    info.mime !== "image/png" ||
    info.width > 256 ||
    info.height > 256 ||
    info.width !== icon.width ||
    info.height !== icon.height
  )
    throw new Error("Icon must be a sanitized PNG no larger than256 pixels.");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let offset = 8; offset + 12 <= bytes.length; ) {
    const length = view.getUint32(offset),
      kind = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    if (!["IHDR", "PLTE", "tRNS", "IDAT", "IEND"].includes(kind))
      throw new Error("Icon contains non-image metadata.");
    offset += length + 12;
  }
  return bytes;
}
export async function verifyIcon(icon: IconAsset, signal?: AbortSignal) {
  const bytes = validateStoredIcon(icon);
  if ((await sha256(bytes)) !== icon.id)
    throw new Error("Icon digest mismatch.");
  await decodeRaster(bytes, "image/png", signal);
}
export async function stageIcon(
  file: File,
  declaration: string,
  description: string,
  signal?: AbortSignal,
): Promise<IconAsset> {
  if (
    !declaration.trim() ||
    declaration.length > 4000 ||
    !description.trim() ||
    description.length > 200
  )
    throw new Error(
      "Provide an icon description and ownership/authorization declaration.",
    );
  if (file.size <= 0 || file.size > 2 * 1024 * 1024)
    throw new Error("Icon file exceeds2MiB.");
  if (signal?.aborted) throw new Error("Import cancelled.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (signal?.aborted) throw new Error("Import cancelled.");
  const normalized = await normalizeRaster(bytes, {
    signal,
    maxDimension: 256,
  });
  const icon: IconAsset = {
    id: normalized.sha256,
    base64: base64FromBytes(normalized.bytes),
    width: normalized.width,
    height: normalized.height,
    description,
    rightsDeclaration: declaration,
  };
  validateStoredIcon(icon);
  return icon;
}
export function commitIcon(state: Workspace, icon: IconAsset) {
  validateStoredIcon(icon);
  const existing=state.icons.find(i=>i.id===icon.id);
  if(existing){if(!existing.design&&icon.design)existing.design=validateIconDesign(icon.design);return;}
  const bytes =
    state.icons.reduce((n, i) => n + iconBytes(i).byteLength, 0) +
    iconBytes(icon).byteLength;
  if (state.icons.length >= 32 || bytes > 8 * 1024 * 1024)
    throw new Error("Icon count or8MiB total limit reached.");
  state.icons.push(structuredClone(icon));
}
export function deleteIcon(
  state: Workspace,
  id: string,
  replacementId: string | null,
) {
  const references =
    state.annotations.filter((a) => a.iconId === id).length +
    state.categoryIcons.filter((c) => c.iconId === id).length;
  if (references && !replacementId)
    throw new Error(
      `This icon has${references} references. Select a replacement or cancel.`,
    );
  if (
    replacementId &&
    (replacementId === id || !state.icons.some((i) => i.id === replacementId))
  )
    throw new Error("Replacement icon unavailable.");
  state.annotations.forEach((a) => {
    if (a.iconId === id) a.iconId = replacementId;
  });
  state.categoryIcons.forEach((c) => {
    if (c.iconId === id) c.iconId = replacementId!;
  });
  state.icons = state.icons.filter((i) => i.id !== id);
}
export function annotationIcon(
  state: Workspace,
  annotation: { iconId: string | null; category: string },
) {
  const id =
    annotation.iconId ??
    state.categoryIcons.find((c) => c.category === annotation.category)?.iconId;
  return state.icons.find((i) => i.id === id);
}

export async function stageDesignedIcon(design:IconDesign,description:string,signal?:AbortSignal):Promise<IconAsset>{
 const recipe=validateIconDesign(design),png=await designedPNG(recipe,description,signal);
 const icon=await stageIcon(new File([png],'created-icon.png',{type:'image/png'}),'Original icon composed locally from built-in vector primitives.',description.trim(),signal);
 icon.design=recipe;return icon;
}
