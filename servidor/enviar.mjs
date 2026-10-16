// Envia as notificações agendadas do app "Meu dia a dia".
// Roda a cada 5 minutos no GitHub Actions. Configuração vem dos secrets:
//   VAPID_PRIVATE_KEY  chave privada do servidor (a pública fica em app.js)
//   LEMBRETES          (opcional) código "MDD1:..." gerado em Ajustes > Notificações no app.
// Sem LEMBRETES, lê servidor/lembretes.enc, gravado pelo próprio app ao salvar as notificações.
// Formato "E1:": o app cifra com a chave PÚBLICA VAPID (ECDH P-256 + AES-256-GCM); só a privada abre.
// Formato antigo (sem prefixo): AES-256-GCM com chave sha256('lembretes:' + privada), de servidor/cifrar.mjs.
// Nunca falha o workflow (falha gera e-mail do GitHub): problemas aparecem no resumo da execução.
import webpush from 'web-push';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash, createDecipheriv, createECDH } from 'node:crypto';

const PUBLICA = 'BGXe3EXAwHodbQcgqXHow0tC4FKPs3QuqoYd4vNTL3LIJwQ1GXqpQrGvXoD3tItyIqNGvN9Vb6MI5_aCdX4PPso';
const JANELA = 30; // minutos de atraso aceitos (o agendador do GitHub atrasa às vezes)
const ESTADO = new URL('./estado.json', import.meta.url);

const privada = (process.env.VAPID_PRIVATE_KEY || '').trim();
const CIFRADO = new URL('./lembretes.enc', import.meta.url);
let status = { chave: !!privada, config: false, inscricao: null, erro: null };
function gravarStatus() {
  if (!existsSync(ESTADO)) writeFileSync(ESTADO, JSON.stringify({ enviados: [] }) + '\n'); // o cache precisa do arquivo
  const linhas = [!status.chave ? '⚠️ Falta o secret VAPID_PRIVATE_KEY.' : status.erro ? '⚠️ Não consegui abrir servidor/lembretes.enc.' : status.config ? '✅ Lembretes configurados.' : 'Ainda sem lembretes salvos pelo app.'];
  if (status.inscricao === 'expirada') linhas.push('⚠️ O iPhone recusou o aviso: ative as notificações de novo no app e salve.');
  if (process.env.GITHUB_STEP_SUMMARY) try { writeFileSync(process.env.GITHUB_STEP_SUMMARY, linhas.join('\n') + '\n', { flag: 'a' }); } catch (e) { }
}
function decifrar() {
  if (!privada || !existsSync(CIFRADO)) return '';
  const txt = readFileSync(CIFRADO, 'utf8').trim();
  let b, chave;
  if (txt.startsWith('E1:')) {
    const t = Buffer.from(txt.slice(3), 'base64'), ec = createECDH('prime256v1');
    ec.setPrivateKey(Buffer.from(privada, 'base64url'));
    chave = createHash('sha256').update(Buffer.concat([Buffer.from('lembretes:'), ec.computeSecret(t.subarray(0, 65))])).digest();
    b = t.subarray(65);
  } else {
    b = Buffer.from(txt, 'base64');
    chave = createHash('sha256').update('lembretes:' + privada).digest();
  }
  const d = createDecipheriv('aes-256-gcm', chave, b.subarray(0, 12));
  d.setAuthTag(b.subarray(b.length - 16));
  return Buffer.concat([d.update(b.subarray(12, b.length - 16)), d.final()]).toString('utf8');
}
let codigo = (process.env.LEMBRETES || '').trim();
if (!codigo) try { codigo = decifrar().trim(); } catch (e) { status.erro = 'nao_decifrou'; console.error('Não consegui abrir servidor/lembretes.enc:', e.message); }
if (!codigo.startsWith('MDD1:') || !privada) { gravarStatus(); console.log(privada ? 'Sem configuração de lembretes; nada a fazer.' : 'Falta o secret VAPID_PRIVATE_KEY.'); process.exit(0); }
status.config = true; status.erro = null;
let cfg;
try {
  cfg = JSON.parse(Buffer.from(codigo.slice(5), 'base64').toString('utf8'));
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'https://github.com', PUBLICA, privada);
} catch (e) { status.erro = 'config'; gravarStatus(); console.error('Configuração inválida:', e.message); process.exit(0); }

// data e hora locais no fuso do usuário
const partes = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: cfg.tz || 'America/Fortaleza', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, weekday: 'short' })
  .formatToParts(new Date()).map(p => [p.type, p.value]));
const hoje = `${partes.year}-${partes.month}-${partes.day}`;
const agora = (+partes.hour % 24) * 60 + +partes.minute;
const diaSemana = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(partes.weekday);
const amanha = (() => { const d = new Date(hoje + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); })();
const min = h => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };

const avisos = []; // [hora, título, texto, url]
if (cfg.ponto && cfg.ponto.dias.includes(diaSemana)) for (const [h, t] of cfg.ponto.horas) avisos.push([h, t, 'Registre no ponto da empresa e no app.', './#/ponto']);
if (cfg.feira && cfg.feira.dia === diaSemana) avisos.push([cfg.feira.hora, 'Dia de feira 🛒', 'Confira a lista de compras antes de sair.', './#/feira']);
if (cfg.tarefas) avisos.push([cfg.tarefas.hora, 'Tarefas de casa', 'Veja o que falta fazer hoje.', './#/tarefas']);
for (const p of cfg.prazos || []) {
  if (p.d === hoje) avisos.push(['09:00', 'Hoje: ' + p.t, 'Não esqueça!', './#/painel']);
  if (p.d === amanha) avisos.push(['09:00', 'Amanhã: ' + p.t, 'Prepare-se com antecedência.', './#/painel']);
}

const estado = existsSync(ESTADO) ? JSON.parse(readFileSync(ESTADO, 'utf8')) : { enviados: [] };
const enviados = new Set(estado.enviados.filter(k => k.startsWith(hoje)));
let mudou = false;
for (const [h, titulo, texto, url] of avisos) {
  const atraso = agora - min(h);
  if (atraso < 0 || atraso > JANELA) continue;
  const chave = hoje + ':' + createHash('sha256').update(h + titulo).digest('hex').slice(0, 12);
  if (enviados.has(chave)) continue;
  try {
    await webpush.sendNotification(cfg.sub, JSON.stringify({ title: titulo, body: texto, url, tag: chave }), { TTL: 3600 });
    console.log('Enviado:', h); status.inscricao = 'ok'; status.ultimoEnvio = new Date().toISOString();
  } catch (e) {
    console.error('Falha ao enviar', h, e.statusCode || '', e.body || e.message);
    if (e.statusCode === 404 || e.statusCode === 410) status.inscricao = 'expirada';
    if (e.statusCode === 404 || e.statusCode === 410) console.error('A inscrição expirou: ative de novo as notificações no app e envie um novo código.');
    continue;
  }
  enviados.add(chave); mudou = true;
}
gravarStatus();
writeFileSync(ESTADO, JSON.stringify({ enviados: [...enviados] }, null, 1) + '\n');
