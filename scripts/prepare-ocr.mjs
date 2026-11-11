import { mkdir, copyFile, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), ".."),
  out = join(root, "src/vendor/ocr");
await mkdir(out, { recursive: true });
const files = [
  ["tesseract.js/dist/tesseract.esm.min.js", "tesseract.esm.min.js"],
  ["tesseract.js/dist/worker.min.js", "worker.min.js"],
  ["tesseract.js/dist/worker.min.js.LICENSE.txt", "worker.LICENSE.txt"],
  [
    "tesseract.js-core/tesseract-core-lstm.wasm.js",
    "tesseract-core-lstm.wasm.js",
  ],
  [
    "@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz",
    "eng.traineddata.gz",
  ],
  ["tesseract.js/LICENSE.md", "TESSERACT-LICENSE.md"],
  ["tesseract.js-core/LICENSE", "CORE-LICENSE.txt"],
  ["@tesseract.js-data/eng/package.json", "ENGLISH-PACKAGE.json"],
  ["@tesseract.js-data/eng/README.md", "ENGLISH-README.md"],
];
const hashes = {};
for (const [source, name] of files) {
  const from = join(root, "node_modules", source);
  await copyFile(from, join(out, name));
  hashes[name] = createHash("sha256")
    .update(await readFile(from))
    .digest("hex");
}
await writeFile(
  join(out, "provenance.json"),
  JSON.stringify(
    {
      packages: { "tesseract.js": "7.0.0", "@tesseract.js-data/eng": "1.0.0" },
      source: "https://github.com/naptha/tesseract.js",
      purpose:
        "Local screenshot OCR; no screen capture or remote image processing",
      hashes,
    },
    null,
    2,
  ),
);
console.log("Prepared local OCR assets and provenance");
