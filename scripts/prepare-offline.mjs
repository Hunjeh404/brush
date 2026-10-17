import {readFile, writeFile, mkdir, rename} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname} from 'node:path';

const checksums = JSON.parse(await readFile(new URL('../ASSET-CHECKSUMS.json', import.meta.url)));
const root = new URL('../', import.meta.url);
const files = [
  ['vendor/wasm/vision_wasm_internal.wasm', 'node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_internal.wasm'],
  ['vendor/wasm/vision_wasm_nosimd_internal.wasm', 'node_modules/@mediapipe/tasks-vision/wasm/vision_wasm_nosimd_internal.wasm'],
  ['models/face_landmarker.task', 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'],
];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
for (const [path, source] of files) {
  const target = new URL(path, root);
  let existing;
  try { existing = await readFile(target); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  if (existing && hash(existing) === checksums[path]) {
    console.log(`Verified ${path}`);
    continue;
  }
  let bytes;
  if (source.startsWith('https:')) {
    const response = await fetch(source, {signal: AbortSignal.timeout(120000)});
    if (!response.ok) throw new Error(`Model download failed: ${response.status}`);
    bytes = Buffer.from(await response.arrayBuffer());
  } else {
    bytes = await readFile(new URL(source, root));
  }
  if (hash(bytes) !== checksums[path]) throw new Error(`Checksum mismatch: ${path}`);
  await mkdir(new URL(dirname(path) + '/', root), {recursive: true});
  const temporary = new URL(path + '.tmp', root);
  await writeFile(temporary, bytes);
  await rename(temporary, target);
  console.log(`Prepared and verified ${path}`);
}
