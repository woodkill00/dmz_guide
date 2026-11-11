import { commitRecord, readRecord } from "../storage/store.mjs";
import {
  base64FromBytes,
  bytesFromBase64,
  hashBytes,
  imageInfo,
} from "../content/portable.mjs";
export async function validateFieldPhoto(photo) {
  if (
    !photo ||
    Object.keys(photo).sort().join() !==
      "base64,height,id,mime,revision,sha256,width" ||
    typeof photo.id !== "string" ||
    !/^[-a-f0-9]{36}$/i.test(photo.id) ||
    typeof photo.base64 !== "string" ||
    photo.base64.length > 400000 ||
    photo.mime !== "image/webp" ||
    !Number.isSafeInteger(photo.revision) ||
    photo.revision < 0
  )
    throw Error("Invalid discovery photo");
  const bytes = bytesFromBase64(photo.base64),
    info = imageInfo(bytes);
  if (
    bytes.length > 300000 ||
    info.mime !== photo.mime ||
    info.width !== photo.width ||
    info.height !== photo.height ||
    info.width * info.height > 2000000 ||
    (await hashBytes(bytes)) !== photo.sha256
  )
    throw Error("Discovery photo metadata does not match its bytes");
  let expired = false,
    timer;
  const loading = createImageBitmap(new Blob([bytes], { type: photo.mime }));
  loading
    .then((bitmap) => {
      if (expired) bitmap.close();
    })
    .catch(() => {});
  let bitmap;
  try {
    bitmap = await Promise.race([
      loading,
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          expired = true;
          reject(Error("Discovery photo decoding timed out"));
        }, 10000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }

  try {
    if (bitmap.width !== photo.width || bitmap.height !== photo.height)
      throw Error("Decoded photo dimensions do not match");
  } finally {
    bitmap.close();
  }
  return photo;
}
export async function makeFieldPhoto(file) {
  const { decodeStashImage } = await import("./stash-ocr.mjs"),
    { canvas } = await decodeStashImage(file);
  const scale = Math.min(1, 1200 / Math.max(canvas.width, canvas.height)),
    small = document.createElement("canvas");
  small.width = Math.round(canvas.width * scale);
  small.height = Math.round(canvas.height * scale);
  small.getContext("2d").drawImage(canvas, 0, 0, small.width, small.height);
  const blob = await new Promise((resolve) =>
    small.toBlob(resolve, "image/webp", 0.75),
  );
  if (!blob) throw Error("Photo encoding unavailable");
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return validateFieldPhoto({
    id: crypto.randomUUID(),
    revision: 0,
    mime: "image/webp",
    width: small.width,
    height: small.height,
    base64: base64FromBytes(bytes),
    sha256: await hashBytes(bytes),
  });
}
export const readFieldPhoto = async (id) =>
  (await readRecord("content", "field-photo:" + id))?.value;
export async function saveFieldPhoto(photo) {
  await validateFieldPhoto(photo);
  const old = await readFieldPhoto(photo.id);
  if (old) {
    if (old.sha256 !== photo.sha256)
      throw Error("A photo with this identity has different bytes");
    return;
  }
  await commitRecord("content", "field-photo:" + photo.id, photo, 0);
}
