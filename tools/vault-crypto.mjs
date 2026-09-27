import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from 'node:crypto';

export const iterations = 600_000;
const wrapContext = Buffer.from('arithmetic-atlas:data-key:v2');

function derive(secret, salt) {
  if (secret.length < 16) throw new Error('Use a password or recovery code of at least 16 characters.');
  return pbkdf2Sync(secret, salt, iterations, 32, 'sha256');
}

export function wrapDataKey(dataKey, secret) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', derive(secret, salt), iv);
  cipher.setAAD(wrapContext);
  const encrypted = Buffer.concat([cipher.update(dataKey), cipher.final()]);
  return { salt:salt.toString('hex'), wrapped:Buffer.concat([iv, encrypted, cipher.getAuthTag()]).toString('base64') };
}

export function unwrapDataKey(envelope, secret) {
  const bytes = Buffer.from(envelope.wrapped, 'base64');
  if (bytes.length !== 60 || !/^[0-9a-f]{32}$/i.test(envelope.salt)) throw new Error('Invalid vault envelope.');
  const decipher = createDecipheriv('aes-256-gcm', derive(secret, Buffer.from(envelope.salt, 'hex')), bytes.subarray(0, 12));
  decipher.setAAD(wrapContext);
  decipher.setAuthTag(bytes.subarray(-16));
  return Buffer.concat([decipher.update(bytes.subarray(12,-16)), decipher.final()]);
}

export function encryptDocument(input, id, dataKey) {
  if (input.subarray(0,5).toString() !== '%PDF-') throw new Error(`${id}: invalid PDF header`);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', dataKey, iv);
  cipher.setAAD(Buffer.from(id));
  return Buffer.concat([Buffer.from('ATLASPDF2'),iv,cipher.update(input),cipher.final(),cipher.getAuthTag()]);
}

export function decryptDocument(data, id, dataKey) {
  if (data.subarray(0,9).toString() !== 'ATLASPDF2') throw new Error('Unknown vault format.');
  const decipher = createDecipheriv('aes-256-gcm', dataKey, data.subarray(9,21));
  decipher.setAAD(Buffer.from(id));
  decipher.setAuthTag(data.subarray(-16));
  return Buffer.concat([decipher.update(data.subarray(21,-16)),decipher.final()]);
}
