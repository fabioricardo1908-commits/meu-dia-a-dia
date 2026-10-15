// Uso: VAPID_PRIVATE_KEY=... node servidor/cifrar.mjs "MDD1:..."  > servidor/lembretes.enc
import { createHash, createCipheriv, randomBytes } from 'node:crypto';
const privada = (process.env.VAPID_PRIVATE_KEY || '').trim(), codigo = (process.argv[2] || '').trim();
if (!privada || !codigo.startsWith('MDD1:')) { console.error('Informe VAPID_PRIVATE_KEY e o código MDD1:...'); process.exit(1); }
JSON.parse(Buffer.from(codigo.slice(5), 'base64').toString('utf8')); // valida
const chave = createHash('sha256').update('lembretes:' + privada).digest(), iv = randomBytes(12);
const c = createCipheriv('aes-256-gcm', chave, iv);
const corpo = Buffer.concat([c.update(codigo, 'utf8'), c.final()]);
console.log(Buffer.concat([iv, corpo, c.getAuthTag()]).toString('base64'));
