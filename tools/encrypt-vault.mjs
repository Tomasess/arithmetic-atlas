// Usage: node tools/encrypt-vault.mjs /path/to/pdf-dir /path/to/64-hex-key-file
// Keep the key file outside this repository. Never publish unencrypted PDFs.
import { createCipheriv, randomBytes } from 'node:crypto';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const [inputDir, keyFile] = process.argv.slice(2);
if (!inputDir || !keyFile) throw new Error('Provide PDF directory and key file.');
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = join(projectRoot,'public');
const catalogPath = join(sourceRoot,'pdf-catalog.js');
const siteRoot = await access(catalogPath).then(() => sourceRoot, () => projectRoot);
const { pdfCatalog } = await import(pathToFileURL(join(siteRoot,'pdf-catalog.js')).href);
const hex = (await readFile(keyFile, 'utf8')).trim();
if (!/^[a-f\d]{64}$/i.test(hex)) throw new Error('Key file must contain 64 hexadecimal characters.');
const key = Buffer.from(hex, 'hex');
const outputDir = join(siteRoot,'vault');
await mkdir(outputDir, { recursive:true });
for (const item of pdfCatalog) {
  const input = await readFile(resolve(inputDir, item.filename));
  if (!input.subarray(0,5).equals(Buffer.from('%PDF-'))) throw new Error(`${item.id}: invalid PDF header`);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const content = Buffer.concat([cipher.update(input),cipher.final()]);
  const output = Buffer.concat([Buffer.from('ATLASPDF1'),iv,content,cipher.getAuthTag()]);
  await writeFile(resolve(outputDir, `${item.id}.atlas`), output, {mode:0o644});
  console.log(`${item.id}: ${input.length} bytes → ${output.length} encrypted bytes`);
}
