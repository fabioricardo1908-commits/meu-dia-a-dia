// Envia as notificações agendadas do app "Meu dia a dia".
// Roda a cada 5 minutos no GitHub Actions. Configuração vem dos secrets:
//   LEMBRETES          código "MDD1:..." gerado em Ajustes > Notificações no app
//   VAPID_PRIVATE_KEY  chave privada do servidor (a pública fica em app.js)
import webpush from 'web-push';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const PUBLICA = 'BGXe3EXAwHodbQcgqXHow0tC4FKPs3QuqoYd4vNTL3LIJwQ1GXqpQrGvXoD3tItyIqNGvN9Vb6MI5_aCdX4PPso';
const JANELA = 30; // minutos de atraso aceitos (o agendador do GitHub atrasa às vezes)
const ESTADO = new URL('./estado.json', import.meta.url);

const codigo = (process.env.LEMBRETES || '').trim();
const privada = (process.env.VAPID_PRIVATE_KEY || '').trim();
if (!codigo.startsWith('MDD1:') || !privada) { console.log('Sem configuração de lembretes; nada a fazer.'); process.exit(0); }
const cfg = JSON.parse(Buffer.from(codigo.slice(5), 'base64').toString('utf8'));
webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'https://github.com', PUBLICA, privada);

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
    console.log('Enviado:', h);
  } catch (e) {
    console.error('Falha ao enviar', h, e.statusCode || '', e.body || e.message);
    if (e.statusCode === 404 || e.statusCode === 410) console.error('A inscrição expirou: ative de novo as notificações no app e envie um novo código.');
    continue;
  }
  enviados.add(chave); mudou = true;
}
if (mudou) writeFileSync(ESTADO, JSON.stringify({ enviados: [...enviados] }, null, 1) + '\n');
