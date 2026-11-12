let worker = null,
  sequence = 0;
let cancelCurrent = null,
  progressSink = null,
  workerSession = null;
export async function stopStashOCR() {
  sequence++;
  cancelCurrent?.(new Error("OCR canceled"));
  cancelCurrent = null;
  progressSink = null;
  workerSession = null;
  const current = worker;
  worker = null;
  if (current) await current.terminate();
}
export async function recognizeStash(canvas, onProgress = () => {}) {
  const token = ++sequence;
  const { default: Tesseract } = await import(
    "../vendor/ocr/tesseract.esm.min.js"
  );
  const { createWorker } = Tesseract;
  let timeout, cancel;
  progressSink = onProgress;
  const canceled = new Promise((_, reject) => {
    cancel = reject;
    cancelCurrent = reject;
  });
  try {
    const work = (async () => {
      if (!worker) {
        const session = Symbol("ocr-worker");
        workerSession = session;
        const created = await createWorker("eng", 1, {
          workerPath: "/assets/src/vendor/ocr/worker.min.js",
          corePath: "/assets/src/vendor/ocr/tesseract-core-lstm.wasm.js",
          langPath: "/assets/src/vendor/ocr",
          workerBlobURL: false,
          gzip: true,
          logger: (message) => {
            if (workerSession === session)
              progressSink?.(
                message.status,
                Math.round((message.progress || 0) * 100),
              );
          },
        });
        if (token !== sequence) {
          await created.terminate();
          throw Error("OCR canceled");
        }
        worker = created;
      }
      if (token !== sequence) throw Error("OCR canceled");
      await worker.setParameters({ preserve_interword_spaces: "1" });
      const result = await worker.recognize(canvas);
      if (token !== sequence) throw Error("OCR canceled");
      return result.data;
    })();
    return await Promise.race([
      work,
      canceled,
      new Promise((_, reject) => {
        timeout = setTimeout(() => {
          void stopStashOCR();
          reject(
            Error(
              "OCR timed out. Crop a smaller image or enter the recognized text manually.",
            ),
          );
        }, 90000);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
    if (cancelCurrent === cancel) cancelCurrent = null;
    if (token === sequence) progressSink = null;
  }
}
export async function decodeStashImage(file) {
  if (
    !file ||
    file.size > 10 * 1024 * 1024 ||
    !["image/png", "image/jpeg", "image/webp"].includes(file.type)
  )
    throw Error("Choose a PNG, JPEG or WebP up to 10 MiB");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { imageInfo, hashBytes } = await import("../content/portable.mjs");
  const info = imageInfo(bytes, { dimension: 5000, pixels: 12000000 });
  if (
    info.mime !== file.type ||
    info.width * info.height > 12000000 ||
    info.width > 5000 ||
    info.height > 5000
  )
    throw Error("Screenshot dimensions/type exceed the supported limit");
  let decodeExpired = false,
    decodeTimer;
  const loading = createImageBitmap(file);
  loading
    .then((bitmap) => {
      if (decodeExpired) bitmap.close();
    })
    .catch(() => {});
  let bitmap;
  try {
    bitmap = await Promise.race([
      loading,
      new Promise((_, reject) => {
        decodeTimer = setTimeout(() => {
          decodeExpired = true;
          reject(Error("Image decoding timed out"));
        }, 10000);
      }),
    ]);
  } finally {
    clearTimeout(decodeTimer);
  }

  try {
    const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height)),
      canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas
      .getContext("2d")
      .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return { canvas, fingerprint: await hashBytes(bytes) };
  } finally {
    bitmap.close();
  }
}
window.addEventListener("pagehide", () => {
  void stopStashOCR();
});
