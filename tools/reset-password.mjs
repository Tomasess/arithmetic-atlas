// Usage: node tools/reset-password.mjs /path/to/recovery-code-file /path/to/new-password-file
// Run only in an authorized checkout, then publish vault/config.json. The public site cannot commit resets.
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decryptDocument, unwrapDataKey, wrapDataKey } from './vault-crypto.mjs';

const [recoveryFile,passwordFile] = process.argv.slice(2);
if (!recoveryFile || !passwordFile) throw new Error('Provide recovery-code file and new-password file.');
const root = join(dirname(fileURLToPath(import.meta.url)),'..');
const path = join(root,'vault/config.json');
const config = JSON.parse(await readFile(path,'utf8'));
if (config.version !== 2) throw new Error('Unknown vault configuration.');
const recovery = (await readFile(recoveryFile,'utf8')).trim();
const password = (await readFile(passwordFile,'utf8')).trim();
const dataKey = unwrapDataKey(config.recovery,recovery);
const sample = await readFile(join(root,'vault/dadda-1965.atlas'));
if (decryptDocument(sample,'dadda-1965',dataKey).subarray(0,5).toString() !== '%PDF-') throw new Error('Recovery code does not unlock the vault.');
config.password = wrapDataKey(dataKey,password);
await writeFile(path,JSON.stringify(config,null,2)+'\n');
console.log('Password envelope updated. Publish vault/config.json to apply the reset on the website.');
