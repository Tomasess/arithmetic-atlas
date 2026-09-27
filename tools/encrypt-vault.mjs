// Usage: node tools/encrypt-vault.mjs /path/to/pdfs /path/to/password-file /path/to/recovery-code-file
// Keep both secrets outside this public repository. Never publish unencrypted PDFs.
import { randomBytes } from 'node:crypto';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { encryptDocument, iterations, wrapDataKey } from './vault-crypto.mjs';

const [inputDir, passwordFile, recoveryFile] = process.argv.slice(2);
if (!inputDir || !passwordFile || !recoveryFile) throw new Error('Provide PDF directory, password file and recovery-code file.');
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = join(projectRoot,'public');
const siteRoot = await access(join(sourceRoot,'pdf-catalog.js')).then(() => sourceRoot, () => projectRoot);
const { pdfCatalog } = await import(pathToFileURL(join(siteRoot,'pdf-catalog.js')).href);
const password = (await readFile(passwordFile,'utf8')).trim();
const recovery = (await readFile(recoveryFile,'utf8')).trim();
if (password === recovery) throw new Error('Password and recovery code must differ.');
const dataKey = randomBytes(32);
const config = { version:2, kdf:{name:'PBKDF2',hash:'SHA-256',iterations}, password:wrapDataKey(dataKey,password), recovery:wrapDataKey(dataKey,recovery) };
const encrypted = [];
for (const item of pdfCatalog) {
  const input = await readFile(resolve(inputDir,item.filename));
  encrypted.push([item.id,encryptDocument(input,item.id,dataKey)]);
}
const outputDir = join(siteRoot,'vault');
await mkdir(outputDir,{recursive:true});
for (const [id,data] of encrypted) {
  await writeFile(join(outputDir,`${id}.atlas`),data,{mode:0o644});
  console.log(`${id}: encrypted ${data.length} bytes`);
}
await writeFile(join(outputDir,'config.json'),JSON.stringify(config,null,2)+'\n',{mode:0o644});
console.log('Vault updated. Password and recovery code were not written into the repository.');
