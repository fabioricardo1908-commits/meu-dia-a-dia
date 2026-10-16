'use strict';
/* Meu dia a dia: app pessoal que roda 100% no navegador (dados no localStorage). */

// ================= utilidades =================
const $ = (s, r = document) => r.querySelector(s);
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pad = n => String(n).padStart(2, '0');
const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const diffDias = (a, b) => Math.round((parseISO(b) - parseISO(a)) / 864e5);
const hoje = () => iso(new Date());
const inicioSemana = d => addDays(d, -((d.getDay() + 6) % 7)); // segunda-feira
const toMin = t => {
  if (t == null || t === '') return null;
  const s = String(t).trim(), neg = s.startsWith('-');
  const [h, m] = s.replace(/^[-+]/, '').split(':').map(Number);
  if (isNaN(h)) return null;
  const v = h * 60 + (m || 0);
  return neg ? -v : v;
};
const minToHHMM = m => `${m < 0 ? '-' : ''}${pad(Math.floor(Math.abs(m) / 60))}:${pad(Math.abs(m) % 60)}`;
const fmtDur = m => { const s = m < 0 ? '-' : ''; m = Math.abs(Math.round(m)); return `${s}${Math.floor(m / 60)}h${pad(m % 60)}`; };
const fmtSaldo = m => (m > 0 ? '+' : '') + fmtDur(m);
const fmtHora = m => `${pad(Math.floor(m / 60) % 24)}:${pad(Math.round(m) % 60)}`;
const cls = v => v > 0 ? 'pos' : v < 0 ? 'neg' : '';
const brl = v => (+v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const num = (v, d = 1) => (+v || 0).toLocaleString('pt-BR', { maximumFractionDigits: d });
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtData = (s, o = { weekday: 'short', day: '2-digit', month: '2-digit' }) => s ? parseISO(s).toLocaleDateString('pt-BR', o) : '';
const agoraHM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const dur = (a, b) => { const x = toMin(a), y = toMin(b); return x != null && y != null && y > x ? y - x : 0; };
const toast = msg => { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2200); };
function mostrarTexto(titulo, txt, extra = '') {
  const d = $('#dlg2');
  d.innerHTML = `<form class="form"><h2>${esc(titulo)}</h2><label class="field wide"><span>Selecione e copie o texto abaixo</span><textarea id="txt-copia" rows="10" readonly>${esc(txt)}</textarea></label><div class="form-actions">${extra}<span class="sp"></span><button type="button" class="btn" data-x>Fechar</button><button type="button" class="btn primary" data-copy>Copiar</button></div></form>`;
  d.querySelector('[data-x]').onclick = () => d.close();
  d.querySelector('[data-copy]').onclick = () => copiar(txt, true);
  d.showModal(); const ta = d.querySelector('textarea'); ta.focus(); ta.select();
  return d;
}
const copiar = (txt, noFallback) => {
  const falhou = () => noFallback ? (document.querySelector('#txt-copia')?.select(), toast('Use Ctrl+C / Copiar do celular')) : mostrarTexto('Copiar texto', txt);
  try { navigator.clipboard.writeText(txt).then(() => toast('Copiado!'), falhou); } catch (e) { falhou(); }
};
function aviso(titulo, msg) {
  const d = $('#dlg2');
  d.innerHTML = `<form class="form"><h2>${esc(titulo)}</h2><p class="wide" style="margin:0;white-space:pre-line">${esc(msg)}</p><div class="form-actions"><span class="sp"></span><button type="button" class="btn primary" data-x>Entendi</button></div></form>`;
  d.querySelector('[data-x]').onclick = () => d.close();
  d.showModal();
}
function confirmar(msg, sim, rotulo = 'Confirmar') {
  const d = $('#dlg2');
  d.innerHTML = `<form class="form"><h2>Tem certeza?</h2><p class="wide" style="margin:0">${esc(msg)}</p><div class="form-actions"><span class="sp"></span><button type="button" class="btn" data-x>Cancelar</button><button type="button" class="btn primary danger-bg" data-ok>${esc(rotulo)}</button></div></form>`;
  d.querySelector('[data-x]').onclick = () => d.close();
  d.querySelector('[data-ok]').onclick = () => { d.close(); sim(); };
  d.showModal();
}

// ================= dados =================
const KEY = 'meu-dia-a-dia:v1';
const CATS = {
  vasta: { n: 'Trabalho (Vasta)', c: '#3b82f6' }, freela: { n: 'Freelance', c: '#8b5cf6' },
  igreja: { n: 'Igreja (música)', c: '#f59e0b' }, banda: { n: 'Banda', c: '#ef4444' },
  pilates: { n: 'Pilates', c: '#10b981' }, namorada: { n: 'Namorada', c: '#ec4899' },
  casa: { n: 'Casa', c: '#a16207' }, games: { n: 'Videogame', c: '#06b6d4' },
  estudo: { n: 'Estudos', c: '#6366f1' }, vagas: { n: 'Vagas/Entrevistas', c: '#14b8a6' },
  feira: { n: 'Feira/Compras', c: '#84cc16' }, saude: { n: 'Saúde', c: '#22c55e' },
  pessoal: { n: 'Pessoal', c: '#94a3b8' },
};
const catOpts = Object.entries(CATS).map(([k, v]) => [k, v.n]);
const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DIAS_LONGOS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const defaults = () => ({
  settings: { nome: 'Fábio', jornada: [0, 480, 480, 480, 480, 480, 0], almoco: 60, tolerancia: 10, saldoInicial: 0, metas: { pilates: 2, namorada: 8, games: 4, freela: 6, estudo: 3, casa: 3 } },
  eventos: [], ponto: {}, tarefas: [], itens: [], compras: [], musicas: [], habilidades: [], atividades: [], freelas: [], vagas: [], abastecimentos: [],
});
let S;
function carregar() {
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(KEY)); } catch (e) { /* vazio */ }
  carregarDe(raw);
}
function carregarDe(raw) {
  S = Object.assign(defaults(), raw || {});
  S.settings = Object.assign(defaults().settings, S.settings || {});
  S.google = Object.assign({ eventos: [], sync: null, cats: {} }, S.google || {});
  S.lembretes = Object.assign(defLembretes(), S.lembretes || {});
  // versões antigas marcavam dados de exemplo; agora tudo é tratado como dado seu
  for (const c of ['eventos', 'tarefas', 'itens', 'compras', 'musicas', 'habilidades', 'atividades', 'freelas', 'vagas']) for (const x of (S[c] || [])) delete x.exemplo;
  for (const r of Object.values(S.ponto || {})) delete r.exemplo;
}
function salvarLocal() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('Não consegui salvar no navegador!'); }
}
function save() {
  salvarLocal();
  agendarSync(); // prazos e horários mudam: mantém o servidor de lembretes em dia sozinho
  agendarDados(); // e os outros aparelhos
}
carregar();

// ================= agenda =================
function ocorrencias(dataISO) {
  const wd = parseISO(dataISO).getDay();
  return S.eventos.filter(e => {
    if (!e.data || e.data > dataISO || (e.ate && dataISO > e.ate)) return false;
    if (e.rec === 'diaria') return true;
    if (e.rec === 'semanal') return (e.dias && e.dias.length) ? e.dias.map(String).includes(String(wd)) : parseISO(e.data).getDay() === wd;
    return e.data === dataISO;
  }).concat(googleNoDia(dataISO)).sort((a, b) => (a.inicio || '').localeCompare(b.inicio || ''));
}
function horasPorCat(inicio, dias = 7) {
  const tot = {};
  for (let i = 0; i < dias; i++) {
    for (const e of ocorrencias(iso(addDays(inicio, i)))) tot[e.cat] = (tot[e.cat] || 0) + dur(e.inicio, e.fim);
  }
  return tot;
}
const evAct = e => e.google ? `data-act="verGoogle" data-id="${esc(e.gid)}"` : `data-act="editEvento" data-id="${e.id}"`;
const evHTML = (e, d) => `<div class="ev" style="border-color:${CATS[e.cat]?.c || '#999'}" ${evAct(e)}><b>${esc(e.titulo)}</b><span class="muted">${e.inicio ? esc(e.inicio) + (e.fim ? '–' + esc(e.fim) : '') : 'Dia todo'}${e.rec && e.rec !== 'nenhuma' ? ' ↻' : ''}${e.google ? ' <span class="gtag">Google</span>' : ''}</span></div>`;

// ================= Google Agenda (via conector do Claude) =================
const GCAL = 'Google Calendar';
let mcpApi = null, gStatus = '', gSincronizando = false;
const G_PALAVRAS = [
  ['vagas', /entrevista|vaga|processo seletivo|recrutador/i],
  ['pilates', /pilates/i],
  ['igreja', /culto|louvor|igreja|minist[eé]rio|escala|c[eé]lula|ebd/i],
  ['banda', /banda|show|gig|quarteto|tocar|apresenta[cç]/i],
  ['freela', /freela|cliente|or[cç]amento|entrega/i],
  ['vasta', /vasta|reuni[aã]o|daily|alinhamento|sprint|1:1/i],
  ['saude', /m[eé]dic|consulta|dentista|exame|academia|treino/i],
  ['estudo', /aula|curso|estud|prova|faculdade/i],
  ['namorada', /namorada|anivers[aá]rio de namoro|date/i],
  ['games', /game|jogo|jogar|playstation|xbox/i],
  ['feira', /feira|mercado|compras/i],
  ['casa', /faxina|limpeza|arrumar/i],
];
function catGoogle(titulo) {
  const fixa = S.google.cats[titulo];
  if (fixa && CATS[fixa]) return fixa;
  for (const [c, re] of G_PALAVRAS) if (re.test(titulo)) return c;
  return 'pessoal';
}
function googleNoDia(d) {
  return S.google.eventos.filter(g => g.data <= d && d <= (g.dataFim || g.data))
    .map(g => ({ ...g, id: 'g:' + g.gid, google: true, cat: catGoogle(g.titulo), rec: 'nenhuma', inicio: g.data === d ? g.inicio : '', fim: g.data === d ? g.fim : '' }));
}
function converterGoogle(ev) {
  const ini = ev.start?.dateTime || ev.start?.date, fim = ev.end?.dateTime || ev.end?.date || ini;
  if (!ini || !ev.id) return null;
  const diaTodo = !ev.start?.dateTime;
  const g = { gid: ev.id, titulo: String(ev.summary || '(sem título)').trim(), data: ini.slice(0, 10), local: ev.location || '', link: ev.htmlLink || '', meet: ev.conferenceUrl || '' };
  if (diaTodo) { g.inicio = ''; g.fim = ''; g.dataFim = fim.slice(0, 10) > g.data ? iso(addDays(parseISO(fim.slice(0, 10)), -1)) : g.data; }
  else { g.inicio = ini.slice(11, 16); g.fim = fim.slice(0, 10) === g.data ? fim.slice(11, 16) : '23:59'; g.dataFim = g.data; }
  return g;
}
function msgErroGoogle(e) {
  switch (e && e.code) {
    case 'server_not_connected': case 'server_not_found': case 'selection_required':
      return 'O Google Agenda não está conectado ao seu Claude. Conecte em Configurações > Conectores no claude.ai e tente de novo.';
    case 'needs_reauth': return 'O acesso ao Google Agenda expirou. Reconecte em Configurações > Conectores no claude.ai.';
    case 'not_in_manifest': case 'approval_required': case 'consent_required':
      return 'O app precisa da sua permissão para ler o Google Agenda. Toque em Sincronizar e permita o acesso.';
    case 'blocked_by_policy': return 'Sua organização bloqueou o acesso ao Google Agenda por aqui.';
    case 'server_unavailable': case 'rate_limited': return 'O Google Agenda não respondeu agora. Tente de novo em instantes.';
    case 'tool_error': return 'O Google Agenda recusou a consulta: ' + (e.message || '');
    case 'not_granted': case 'capability_disabled': case 'capability_removed':
      mcpApi = null; return 'A sincronização não está disponível nesta tela.';
    default: return 'Não consegui sincronizar agora. Tente de novo em instantes.';
  }
}
async function syncGoogle(manual) {
  if (!mcpApi || gSincronizando) return;
  gSincronizando = true; gStatus = ''; render();
  const inicio = iso(addDays(new Date(), -14)) + 'T00:00:00', fim = iso(addDays(new Date(), 90)) + 'T23:59:00';
  const lista = [];
  try {
    let token = null;
    for (let pag = 0; pag < 8; pag++) {
      const input = { startTime: inicio, endTime: fim, pageSize: 250, orderBy: 'startTime' };
      if (token) input.pageToken = token;
      const r = await mcpApi.callTool(GCAL, 'list_events', input, { cache: false });
      const pl = (r && r.payload) || {};
      for (const ev of (pl.events || [])) {
        if (ev.status === 'cancelled' || String(ev.summary || '').startsWith('⏰')) continue;
        if ((ev.attendees || []).some(a => a.self && a.responseStatus === 'declined')) continue;
        const g = converterGoogle(ev); if (g) lista.push(g);
      }
      token = pl.nextPageToken; if (!token) break;
    }
    S.google.eventos = lista; S.google.sync = new Date().toISOString(); save();
    if (manual) toast(`${lista.length} eventos trazidos do Google Agenda`);
  } catch (e) { gStatus = msgErroGoogle(e); }
  gSincronizando = false; if (!dlg.open) render();
}
function gBarHTML() {
  const qtd = S.google.eventos.length;
  const quando = S.google.sync ? new Date(S.google.sync).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : null;
  if (!mcpApi) return quando ? `<div class="gbar small muted">Google Agenda: ${qtd} eventos, atualizado em ${quando}. Para atualizar, abra o app pelo Claude.</div>` : '';
  return `<div class="gbar"><button class="btn sm" data-act="syncGoogle" ${gSincronizando ? 'disabled' : ''}>${gSincronizando ? 'Sincronizando…' : '↻ Sincronizar Google Agenda'}</button>
    <span class="small ${gStatus ? 'neg' : 'muted'}">${gStatus ? esc(gStatus) : quando ? `${qtd} eventos do Google, atualizado em ${quando}` : 'Traga seus eventos do Google Agenda para cá'}</span></div>`;
}
function verGoogle(gid) {
  const g = S.google.eventos.find(x => x.gid === gid); if (!g) return;
  const cat = catGoogle(g.titulo);
  dlg.innerHTML = `<form class="form"><h2>${esc(g.titulo)}</h2>
    <p class="wide" style="margin:0">${fmtData(g.data, { weekday: 'long', day: 'numeric', month: 'long' })}${g.dataFim && g.dataFim !== g.data ? ' até ' + fmtData(g.dataFim) : ''}${g.inicio ? ` · ${g.inicio}–${g.fim}` : ' · dia todo'}${g.local ? `<br><span class="muted">${esc(g.local)}</span>` : ''}</p>
    <label class="field wide"><span>Categoria neste app (vale para todos os eventos com esse nome)</span><select id="g-cat">${catOpts.map(([v, l]) => `<option value="${v}"${v === cat ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
    <p class="wide muted small" style="margin:0">Este evento vem do Google Agenda. Para mudar data ou horário, edite lá e sincronize de novo.</p>
    <div class="form-actions">${g.link ? `<a class="btn" href="${esc(g.link)}" target="_blank" rel="noopener">Abrir no Google</a>` : ''}${g.meet ? `<a class="btn" href="${esc(g.meet)}" target="_blank" rel="noopener">Entrar na chamada</a>` : ''}<span class="sp"></span><button type="button" class="btn ghost" data-cancel>Fechar</button><button class="btn primary">Salvar categoria</button></div></form>`;
  const form = dlg.querySelector('form');
  form.onsubmit = e => { e.preventDefault(); S.google.cats[g.titulo] = $('#g-cat').value; save(); dlg.close(); render(); };
  dlg.querySelector('[data-cancel]').onclick = () => dlg.close();
  dlg.showModal();
}

// ================= ponto =================
const MARCAS = [['e1', 'Entrada'], ['s1', 'Saída almoço'], ['e2', 'Volta almoço'], ['s2', 'Saída']];
function calcDia(d) {
  const r = S.ponto[d] || {}, tipo = r.tipo || 'normal';
  let esperado = S.settings.jornada[parseISO(d).getDay()] || 0;
  if (tipo === 'folga' || tipo === 'feriado') esperado = 0;
  let trab = dur(r.e1, r.s1) + dur(r.e2, r.s2);
  if (r.e1 && !r.s1 && !r.e2 && r.s2) trab = dur(r.e1, r.s2); // sem almoço
  if (tipo === 'atestado') trab = esperado;
  const completo = tipo !== 'normal' || !!r.s2 || (!!r.s1 && !r.e2 && d < hoje());
  let saldo = trab - esperado;
  if (Math.abs(saldo) <= (S.settings.tolerancia || 0)) saldo = 0;
  return { r, tipo, esperado, trab, saldo, completo };
}
function trabAteAgora(d) {
  const c = calcDia(d), r = c.r, now = toMin(agoraHM());
  let t = c.trab;
  if (d === hoje()) {
    if (r.e1 && !r.s1 && !r.s2) t += Math.max(0, now - toMin(r.e1));
    else if (r.e2 && !r.s2) t += Math.max(0, now - toMin(r.e2));
  }
  return t;
}
function previsaoSaida(d) {
  const c = calcDia(d), r = c.r, esp = c.esperado, alm = +S.settings.almoco || 0;
  if (!r.e1 || !esp) return null;
  if (r.s2) return `saiu ${r.s2}`;
  const e1 = toMin(r.e1);
  if (!r.s1) return fmtHora(e1 + esp + alm);
  const manha = toMin(r.s1) - e1;
  if (!r.e2) return fmtHora(toMin(r.s1) + alm + esp - manha);
  return fmtHora(toMin(r.e2) + esp - manha);
}
function saldoTotal() {
  let t = +S.settings.saldoInicial || 0;
  for (const d of Object.keys(S.ponto)) { const c = calcDia(d); if (c.completo) t += c.saldo; }
  return t;
}
function baterPonto() {
  const d = hoje(), r = S.ponto[d] ||= {};
  const k = MARCAS.find(([k]) => !r[k]);
  if (!k) return toast('Os 4 registros de hoje já foram feitos.');
  r[k[0]] = agoraHM(); save(); render(); toast(`${k[1]} registrada às ${r[k[0]]}`);
}

// ================= tarefas =================
function feita(t) {
  if (!t.feitaEm) return false;
  const h = hoje();
  if (t.rec === 'diaria') return t.feitaEm === h;
  if (t.rec === 'semanal') return iso(inicioSemana(parseISO(t.feitaEm))) === iso(inicioSemana(parseISO(h)));
  if (t.rec === 'mensal') return t.feitaEm.slice(0, 7) === h.slice(0, 7);
  return true;
}
const REC_LBL = { nenhuma: '', diaria: 'todo dia', semanal: 'toda semana', mensal: 'todo mês' };
const tarefaHTML = t => {
  const f = feita(t);
  return `<div class="li ${f ? 'done' : ''}" data-act="editTarefa" data-id="${t.id}"><input type="checkbox" ${f ? 'checked' : ''} data-act="toggleTarefa" data-id="${t.id}"><span class="dot" style="background:${CATS[t.cat]?.c || '#999'}"></span><div class="grow"><div class="t">${esc(t.titulo)}</div><div class="small muted">${[REC_LBL[t.rec || 'nenhuma'], t.data ? 'até ' + fmtData(t.data) : ''].filter(Boolean).join(' · ')}</div></div></div>`;
};

// ================= feira =================
function itemInfo(it) {
  const cs = S.compras.filter(c => c.itemId === it.id).sort((a, b) => a.data.localeCompare(b.data));
  let porDia = null, fonte = '';
  if (+it.consumoSemana > 0) { porDia = it.consumoSemana / 7; fonte = 'informado'; }
  else if (cs.length >= 2) {
    const dias = diffDias(cs[0].data, cs.at(-1).data);
    const q = cs.slice(0, -1).reduce((s, c) => s + (+c.qtd || 0), 0);
    if (dias > 0 && q > 0) { porDia = q / dias; fonte = 'histórico de compras'; }
  }
  const base = +it.estoque || 0, desde = it.estoqueData || hoje();
  const passados = Math.max(0, diffDias(desde, hoje()));
  const atual = porDia ? Math.max(0, base - porDia * passados) : base;
  const diasRest = porDia ? atual / porDia : null;
  const acabaEm = diasRest != null ? iso(addDays(new Date(), Math.floor(diasRest))) : null;
  let status = 'ok';
  if (atual <= 0.0001) status = 'falta';
  else if ((diasRest != null && diasRest <= 7) || (+it.minimo && atual <= +it.minimo)) status = 'acabando';
  const ultimo = cs.at(-1);
  const precoUnit = ultimo && +ultimo.qtd > 0 ? ultimo.valor / ultimo.qtd : null;
  const sugerido = ultimo ? +ultimo.qtd : (porDia ? Math.ceil(porDia * 7) : 1);
  return { porDia, fonte, atual, diasRest, acabaEm, status, ultimo, precoUnit, sugerido, compras: cs };
}
const STATUS_LBL = { ok: 'Ok', acabando: 'Acabando', falta: 'Em falta' };
const naLista = (it, inf) => it.comprar || inf.status !== 'ok';
function gastoEntre(a, b) { return S.compras.filter(c => c.data >= a && c.data <= b).reduce((s, c) => s + (+c.valor || 0), 0); }
function gastoMes(ym) { return S.compras.filter(c => c.data.startsWith(ym)).reduce((s, c) => s + (+c.valor || 0), 0); }

// ================= formulários genéricos =================
const dlg = $('#dlg');
function fieldHTML(f, val) {
  val = val ?? f.def ?? '';
  const id = 'f_' + f.k;
  let input;
  switch (f.type) {
    case 'textarea': input = `<textarea id="${id}" name="${f.k}" rows="3" placeholder="${esc(f.ph || '')}">${esc(val)}</textarea>`; break;
    case 'select': input = `<select id="${id}" name="${f.k}">${f.options.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(val) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`; break;
    case 'checks': {
      const arr = Array.isArray(val) ? val.map(String) : [];
      input = `<div class="checks">${f.options.length ? f.options.map(([v, l]) => `<label class="chk"><input type="checkbox" name="${f.k}" value="${esc(v)}"${arr.includes(String(v)) ? ' checked' : ''}> ${esc(l)}</label>`).join('') : `<span class="muted small">${esc(f.vazio || 'Nada cadastrado ainda')}</span>`}</div>`;
      return `<div class="field${f.wide ? ' wide' : ''}"><span>${esc(f.label)}</span>${input}</div>`;
    }
    case 'checkbox':
      return `<div class="field${f.wide ? ' wide' : ''}"><span>${esc(f.label)}</span><label class="chk"><input type="checkbox" name="${f.k}"${val ? ' checked' : ''}> ${esc(f.text || 'Sim')}</label></div>`;
    default:
      input = `<input id="${id}" name="${f.k}" type="${f.type || 'text'}" value="${esc(val)}"${f.step ? ` step="${f.step}"` : ''}${f.req ? ' required' : ''} placeholder="${esc(f.ph || '')}">`;
  }
  return `<label class="field${f.wide ? ' wide' : ''}"><span>${esc(f.label)}</span>${input}</label>`;
}
function readField(form, f) {
  if (f.type === 'checks') return [...form.querySelectorAll(`input[name="${f.k}"]:checked`)].map(i => i.value);
  const el = form.elements[f.k];
  if (f.type === 'checkbox') return el.checked;
  if (f.type === 'number') return el.value === '' ? null : Number(el.value);
  return el.value.trim();
}
function openForm({ title, fields, value = {}, onSave, onDelete, nota }) {
  dlg.innerHTML = `<form class="form"><h2>${esc(title)}</h2>${nota ? `<p class="wide muted small" style="margin:0">${nota}</p>` : ''}${fields.map(f => fieldHTML(f, value[f.k])).join('')}
  <div class="form-actions">${onDelete ? '<button type="button" class="btn danger" data-del>Excluir</button>' : ''}<span class="sp"></span><button type="button" class="btn ghost" data-cancel>Cancelar</button><button class="btn primary">Salvar</button></div></form>`;
  const form = dlg.querySelector('form');
  form.onsubmit = e => {
    e.preventDefault();
    const out = {};
    for (const f of fields) out[f.k] = readField(form, f);
    if (onSave(out) === false) return;
    dlg.close(); save(); render();
  };
  dlg.querySelector('[data-cancel]').onclick = () => dlg.close();
  const del = dlg.querySelector('[data-del]');
  if (del) del.onclick = () => confirmar('Excluir este item?', () => { onDelete(); dlg.close(); save(); render(); }, 'Excluir');
  dlg.showModal();
}
function crud(coll, nome, fields, item, preset = {}, opts = {}) {
  openForm({
    title: (item ? 'Editar ' : 'Novo: ') + nome, fields, value: item || preset, nota: opts.nota,
    onSave: o => {
      if (opts.antes && opts.antes(o, item) === false) return false;
      if (item) Object.assign(item, o); else S[coll].push({ id: uid(), ...o });
    },
    onDelete: item ? () => { S[coll] = S[coll].filter(x => x !== item); } : null,
  });
}
const byId = (coll, id) => S[coll].find(x => x.id === id);

// ================= campos de cada cadastro =================
const F = {
  evento: [
    { k: 'titulo', label: 'Título', req: 1, wide: 1, ph: 'Ex.: Ensaio na igreja' },
    { k: 'cat', label: 'Categoria', type: 'select', options: catOpts },
    { k: 'data', label: 'Data (ou início da repetição)', type: 'date', req: 1 },
    { k: 'inicio', label: 'Início', type: 'time' },
    { k: 'fim', label: 'Fim', type: 'time' },
    { k: 'rec', label: 'Repetir', type: 'select', options: [['nenhuma', 'Não repete'], ['diaria', 'Todo dia'], ['semanal', 'Toda semana']] },
    { k: 'ate', label: 'Repetir até (opcional)', type: 'date' },
    { k: 'dias', label: 'Dias da semana (se repetir toda semana)', type: 'checks', options: DIAS.map((d, i) => [String(i), d]), wide: 1 },
    { k: 'local', label: 'Local', wide: 1 },
    { k: 'notas', label: 'Notas', type: 'textarea', wide: 1 },
  ],
  tarefa: [
    { k: 'titulo', label: 'Tarefa', req: 1, wide: 1, ph: 'Ex.: Lavar roupa' },
    { k: 'cat', label: 'Categoria', type: 'select', options: catOpts, def: 'casa' },
    { k: 'rec', label: 'Repetição', type: 'select', options: [['nenhuma', 'Uma vez'], ['diaria', 'Todo dia'], ['semanal', 'Toda semana'], ['mensal', 'Todo mês']] },
    { k: 'data', label: 'Prazo (opcional)', type: 'date' },
    { k: 'notas', label: 'Notas', type: 'textarea', wide: 1 },
  ],
  item: [
    { k: 'nome', label: 'Item', req: 1, ph: 'Ex.: Arroz' },
    { k: 'cat', label: 'Seção', type: 'select', options: ['Hortifruti', 'Mercearia', 'Carnes e ovos', 'Laticínios', 'Padaria', 'Bebidas', 'Limpeza', 'Higiene', 'Outros'].map(x => [x, x]) },
    { k: 'unid', label: 'Unidade', type: 'select', options: ['un', 'kg', 'g', 'L', 'pct', 'cx', 'dz', 'lata'].map(x => [x, x]) },
    { k: 'estoque', label: 'Quanto tem em casa agora', type: 'number', step: 'any' },
    { k: 'minimo', label: 'Estoque mínimo (opcional)', type: 'number', step: 'any' },
    { k: 'consumoSemana', label: 'Consumo por semana (opcional)', type: 'number', step: 'any', ph: 'Deixe vazio para calcular sozinho' },
    { k: 'comprar', label: 'Lista de compras', type: 'checkbox', text: 'Colocar na lista mesmo sem estar acabando' },
    { k: 'notas', label: 'Notas (marca preferida etc.)', type: 'textarea', wide: 1 },
  ],
  musica: [
    { k: 'titulo', label: 'Música', req: 1 },
    { k: 'artista', label: 'Artista / ministério' },
    { k: 'instrumento', label: 'Instrumento', type: 'select', options: [['baixo', 'Baixo'], ['teclado', 'Teclado'], ['ambos', 'Baixo e teclado']] },
    { k: 'onde', label: 'Onde toca', type: 'select', options: [['igreja', 'Igreja'], ['banda', 'Banda'], ['ambos', 'Igreja e banda']] },
    { k: 'tom', label: 'Tom', ph: 'Ex.: G' },
    { k: 'bpm', label: 'BPM', type: 'number' },
    { k: 'status', label: 'Status', type: 'select', options: [['aprender', 'Preciso aprender'], ['ensaiando', 'Ensaiando'], ['pronta', 'Pronta']] },
    { k: 'link', label: 'Link (cifra, vídeo, Spotify)', type: 'url' },
    { k: 'notas', label: 'Notas (estrutura, levadas, viradas)', type: 'textarea', wide: 1 },
  ],
  habilidade: [
    { k: 'nome', label: 'Habilidade', req: 1, ph: 'Ex.: Edição de vídeo no DaVinci' },
    { k: 'area', label: 'Área', ph: 'Ex.: Audiovisual, Design, Música' },
    { k: 'nivel', label: 'Nível', type: 'select', options: [['1', '1 · Iniciante'], ['2', '2 · Básico'], ['3', '3 · Intermediário'], ['4', '4 · Avançado'], ['5', '5 · Especialista']], def: '3' },
    { k: 'anos', label: 'Anos de experiência', type: 'number', step: 'any' },
    { k: 'ferramentas', label: 'Ferramentas', wide: 1, ph: 'Ex.: DaVinci Resolve, Figma, Premiere' },
    { k: 'notas', label: 'Provas / portfólio / observações', type: 'textarea', wide: 1 },
  ],
  freela: [
    { k: 'projeto', label: 'Projeto', req: 1 },
    { k: 'cliente', label: 'Cliente' },
    { k: 'status', label: 'Status', type: 'select', options: [['orcamento', 'Orçamento enviado'], ['andamento', 'Em andamento'], ['entregue', 'Entregue (a receber)'], ['pago', 'Pago'], ['cancelado', 'Cancelado']] },
    { k: 'valor', label: 'Valor (R$)', type: 'number', step: 'any' },
    { k: 'prazo', label: 'Prazo de entrega', type: 'date' },
    { k: 'pagoEm', label: 'Pago em', type: 'date' },
    { k: 'horasEst', label: 'Horas estimadas', type: 'number', step: 'any' },
    { k: 'horasGastas', label: 'Horas gastas', type: 'number', step: 'any' },
    { k: 'notas', label: 'Notas', type: 'textarea', wide: 1 },
  ],
  vaga: [
    { k: 'cargo', label: 'Cargo', req: 1 },
    { k: 'empresa', label: 'Empresa', req: 1 },
    { k: 'status', label: 'Etapa', type: 'select', options: [] },
    { k: 'data', label: 'Data da candidatura', type: 'date' },
    { k: 'link', label: 'Link da vaga', type: 'url' },
    { k: 'salario', label: 'Salário / faixa' },
    { k: 'proximo', label: 'Próximo passo', ph: 'Ex.: Entrevista com RH' },
    { k: 'proximoData', label: 'Data do próximo passo', type: 'date' },
    { k: 'notas', label: 'Notas', type: 'textarea', wide: 1 },
  ],
};
const VAGA_ETAPAS = [['interesse', 'Interesse'], ['aplicada', 'Aplicada'], ['entrevista', 'Entrevista'], ['teste', 'Teste/Case'], ['proposta', 'Proposta'], ['encerrada', 'Encerrada']];
F.vaga[2].options = VAGA_ETAPAS;
const FREELA_LBL = Object.fromEntries(F.freela[2].options);
const fAtividade = () => [
  { k: 'nome', label: 'Atividade / serviço', req: 1, wide: 1, ph: 'Ex.: Edição de Reels para marcas' },
  { k: 'tipo', label: 'Onde se aplica', type: 'select', options: [['ambos', 'Vasta e freela'], ['vasta', 'Vasta'], ['freela', 'Freela'], ['vagas', 'Para vagas']] },
  { k: 'valorHora', label: 'Valor de referência (R$/hora)', type: 'number', step: 'any' },
  { k: 'habs', label: 'Habilidades usadas', type: 'checks', options: S.habilidades.map(h => [h.id, h.nome]), wide: 1, vazio: 'Cadastre habilidades primeiro' },
  { k: 'descricao', label: 'Descrição', type: 'textarea', wide: 1 },
];

// ================= ações (cliques) =================
let agendaRef = hoje(), pontoMes = hoje().slice(0, 7), feiraTab = 'estoque';
const A = {
  baterPonto,
  syncGoogle: () => syncGoogle(true),
  ativarPush: () => ativarPush(),
  desativarPush: () => desativarPush(),
  testarPush: () => testarPush(),
  verGoogle: ({ id }) => verGoogle(id),
  novoEvento: ({ d, cat }) => crud('eventos', 'compromisso', F.evento, null, { data: d || hoje(), cat: cat || 'pessoal', rec: 'nenhuma' }),
  editEvento: ({ id }) => { const e = byId('eventos', id); crud('eventos', 'compromisso', F.evento, e, {}, { nota: e.rec !== 'nenhuma' ? 'Este compromisso se repete: a alteração vale para todas as ocorrências.' : '' }); },
  semana: ({ n }) => { agendaRef = n === '0' ? hoje() : iso(addDays(parseISO(agendaRef), 7 * +n)); render(); },
  mes: ({ n }) => { const [y, m] = pontoMes.split('-').map(Number); const d = new Date(y, m - 1 + +n, 1); pontoMes = n === '0' ? hoje().slice(0, 7) : `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; render(); },
  csvPonto: () => {
    const linhas = [['Data', 'Dia', 'Entrada', 'Saída almoço', 'Volta almoço', 'Saída', 'Tipo', 'Trabalhado', 'Saldo']];
    for (const d of diasDoMes(pontoMes)) { const c = calcDia(d); linhas.push([d, DIAS[parseISO(d).getDay()], c.r.e1 || '', c.r.s1 || '', c.r.e2 || '', c.r.s2 || '', c.tipo, minToHHMM(c.trab), minToHHMM(c.saldo)]); }
    arquivo(`Ponto ${pontoMes} (CSV)`, `ponto-${pontoMes}.csv`, linhas.map(l => l.join(';')).join('\n'), 'text/csv');
  },
  novaTarefa: () => crud('tarefas', 'tarefa', F.tarefa, null, { rec: 'nenhuma', cat: 'casa' }),
  editTarefa: ({ id }) => crud('tarefas', 'tarefa', F.tarefa, byId('tarefas', id)),
  toggleTarefa: ({ id }) => { const t = byId('tarefas', id); t.feitaEm = feita(t) ? null : hoje(); save(); render(); },
  feiraTab: ({ t }) => { feiraTab = t; render(); },
  novoItem: () => crud('itens', 'item da feira', F.item, null, { unid: 'un', cat: 'Mercearia', estoque: 0 }, { antes: o => { o.estoqueData = hoje(); } }),
  editItem: ({ id }) => {
    const it = byId('itens', id), inf = itemInfo(it);
    const atual = Math.round(inf.atual * 100) / 100;
    openForm({
      title: 'Editar ' + it.nome, fields: F.item, value: { ...it, estoque: atual },
      nota: inf.porDia ? `Consumo estimado: ${num(inf.porDia * 7, 2)} ${esc(it.unid)}/semana (${inf.fonte}). O estoque mostrado já desconta o consumo desde a última contagem; corrija se estiver diferente.` : '',
      onSave: o => { if (o.estoque !== atual) o.estoqueData = hoje(); else { o.estoque = it.estoque; } Object.assign(it, o); },
      onDelete: () => { S.itens = S.itens.filter(x => x !== it); S.compras = S.compras.filter(c => c.itemId !== it.id); },
    });
  },
  toggleComprar: ({ id }) => { const it = byId('itens', id); it.comprar = !it.comprar; save(); render(); },
  novaFeira: () => abrirFeira(),
  syncAgora: async (_, el) => { el.disabled = true; try { await sincronizar(); toast('Sincronizado'); } catch (e) { toast(syncStatus); } el.disabled = false; },
  syncOutro: () => mostrarTexto('Conectar outro aparelho', codigoConexao(), '<span class="small muted">No outro aparelho: Ajustes > Sincronizar aparelhos > cole o código. Não mande para ninguém: ele dá acesso aos seus dados.</span>'),
  syncDesligar: () => confirmar('Desligar a sincronização neste aparelho? Os dados daqui continuam aqui, mas param de ir e vir.', () => { try { localStorage.removeItem(SYNC_KEY); } catch (e) { } render(); }, 'Desligar'),
  syncCodigo: async (_, el) => {
    el.disabled = true; el.textContent = 'Conectando…';
    try { await conectarComCodigo($('#sync-cod').value); render(); toast('Aparelho conectado e sincronizado'); }
    catch (e) { try { localStorage.removeItem(SYNC_KEY); } catch (e2) { } el.disabled = false; el.textContent = 'Conectar'; const st = $('#sync-st'); if (st) { st.className = 'small neg'; st.textContent = SYNC_MSG[e.code] || syncStatus || GH_MSG[e.code] || GH_MSG.erro; } }
  },
  syncPrimeiro: async (_, el) => {
    el.disabled = true; el.textContent = 'Ligando…';
    try { await ligarPrimeiro(); render(); toast('Sincronização ligada'); }
    catch (e) { if (e.code !== 'ja_existe') try { localStorage.removeItem(SYNC_KEY); } catch (e2) { } el.disabled = false; el.textContent = 'Ligar a sincronização aqui'; const st = $('#sync-st'); if (st) { st.className = 'small neg'; st.textContent = SYNC_MSG[e.code] || GH_MSG[e.code] || GH_MSG.erro; } }
  },
  salvarGH: async (_, el) => {
    const token = ($('#gh-token')?.value || '').trim();
    if (!token) return toast('Cole o token do GitHub');
    el.disabled = true; el.textContent = 'Conferindo…';
    try {
      const repo = await ghApi('', {}, token);
      if (repo && repo.permissions && repo.permissions.push === false) throw { code: 'permissao' };
      try { localStorage.setItem(GH_KEY, JSON.stringify({ token })); localStorage.removeItem(GH_ULT); } catch (e) { }
      render(); toast('GitHub ligado!');
      if (S.push && S.push.sub) { const st = $('#l-status'); try { await sincronizarLembretes(true); if (st) { st.className = 'small pos'; st.textContent = 'Avisos salvos no servidor. Passam a valer em até 5 minutos.'; } } catch (err) { if (st) { st.className = 'small neg'; st.textContent = GH_MSG[err && err.code] || GH_MSG.erro; } } }
    } catch (err) { el.disabled = false; el.textContent = 'Ligar'; toast(GH_MSG[err && err.code] || GH_MSG.erro); }
  },
  desligarGH: () => confirmar('Desligar do GitHub neste aparelho? Os avisos já salvos continuam chegando, mas mudanças novas não serão enviadas.', () => { try { localStorage.removeItem(GH_KEY); localStorage.removeItem(GH_ULT); } catch (e) { } render(); }, 'Desligar'),
  novoAbast: () => abrirAbast(null),
  editAbast: ({ id }) => abrirAbast(byId('abastecimentos', id)),
  lerNota: () => lerNota(),
  copiarLista: () => {
    const linhas = S.itens.map(it => [it, itemInfo(it)]).filter(([it, i]) => naLista(it, i)).map(([it, i]) => `- ${it.nome} (${num(i.sugerido, 2)} ${it.unid})`);
    copiar(`🛒 Lista da feira (${fmtData(hoje(), { day: '2-digit', month: '2-digit' })})\n` + linhas.join('\n'));
  },
  apagarFeira: ({ k }) => {
    confirmar('Apagar esta feira do histórico? O estoque não é alterado.', () => { S.compras = S.compras.filter(c => `${c.data}|${c.local || ''}` !== k); save(); render(); }, 'Apagar');
  },
  novaMusica: () => crud('musicas', 'música', F.musica, null, { status: 'aprender', instrumento: 'baixo', onde: 'igreja' }),
  editMusica: ({ id }) => crud('musicas', 'música', F.musica, byId('musicas', id)),
  novaHab: () => crud('habilidades', 'habilidade', F.habilidade, null),
  editHab: ({ id }) => crud('habilidades', 'habilidade', F.habilidade, byId('habilidades', id)),
  novaAtiv: () => crud('atividades', 'atividade', fAtividade(), null, { tipo: 'ambos' }),
  editAtiv: ({ id }) => crud('atividades', 'atividade', fAtividade(), byId('atividades', id)),
  copiarResumo: () => copiar(resumoProfissional()),
  novoFreela: () => crud('freelas', 'freela', F.freela, null, { status: 'orcamento' }),
  editFreela: ({ id }) => crud('freelas', 'freela', F.freela, byId('freelas', id)),
  novaVaga: ({ s }) => crud('vagas', 'candidatura', F.vaga, null, { status: s || 'aplicada', data: hoje() }),
  editVaga: ({ id }) => crud('vagas', 'candidatura', F.vaga, byId('vagas', id)),
  moverVaga: ({ id, n }) => { const v = byId('vagas', id); const i = VAGA_ETAPAS.findIndex(e => e[0] === v.status); v.status = VAGA_ETAPAS[Math.max(0, Math.min(VAGA_ETAPAS.length - 1, i + +n))][0]; save(); render(); },
  exportar: () => arquivo('Backup dos dados', `meu-dia-a-dia-backup-${hoje()}.json`, JSON.stringify(S), 'application/json'),
  importar: () => {
    const d = $('#dlg2');
    d.innerHTML = `<form class="form"><h2>Importar backup</h2><label class="field wide"><span>Escolha o arquivo .json</span><input type="file" id="imp-file" accept=".json,application/json"></label><label class="field wide"><span>ou cole o texto do backup</span><textarea id="imp-txt" rows="6"></textarea></label><p class="wide muted small" style="margin:0">Isso substitui todos os dados atuais.</p><p class="wide neg small" id="imp-err" style="margin:0"></p><div class="form-actions"><span class="sp"></span><button type="button" class="btn" data-x>Cancelar</button><button class="btn primary">Importar</button></div></form>`;
    d.querySelector('[data-x]').onclick = () => d.close();
    d.querySelector('form').onsubmit = async e => {
      e.preventDefault();
      try {
        const f = $('#imp-file').files[0];
        const data = JSON.parse(f ? await f.text() : $('#imp-txt').value);
        if (!data || typeof data !== 'object' || !data.settings) throw new Error('não parece um backup deste app');
        try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e2) { /* segue só em memória */ }
        S = data; carregarDe(data); d.close(); render(); toast('Backup restaurado');
      } catch (err) { $('#imp-err').textContent = 'Não consegui ler o backup: ' + err.message; }
    };
    d.showModal();
  },
  apagarTudo: () => confirmar('Apagar TODOS os dados deste navegador? Faça um backup antes.', () => { try { localStorage.removeItem(KEY); } catch (e) { } S = null; carregarDe(null); save(); render(); toast('Dados apagados'); }, 'Apagar tudo'),
};
// ações por mudança de campo
const C = {
  ponto: ({ d, k }, el) => {
    const r = S.ponto[d] ||= {};
    if (el.value) r[k] = el.value; else delete r[k];
    if (!Object.keys(r).length || (Object.keys(r).length === 1 && r.tipo === 'normal')) delete S.ponto[d];
    save(); atualizarLinhaPonto(d);
  },
};
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el || !A[el.dataset.act]) return;
  if (el.tagName !== 'INPUT') e.preventDefault();
  e.stopPropagation();
  A[el.dataset.act](el.dataset, el);
});
document.addEventListener('change', e => {
  const el = e.target.closest('[data-chg]');
  if (el && C[el.dataset.chg]) C[el.dataset.chg](el.dataset, el);
});
function arquivo(titulo, nome, conteudo, tipo) {
  const d = mostrarTexto(titulo, conteudo, `<button type="button" class="btn" data-dl>Baixar arquivo</button>`);
  d.querySelector('[data-dl]').onclick = () => baixar(nome, conteudo, tipo);
}
function baixar(nome, conteudo, tipo) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + conteudo], { type: tipo }));
  a.download = nome; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// ================= telas =================
let rotaAtual = 'painel';
const head = (titulo, sub, botoes = '') => (rotaAtual !== 'painel' ? `<a class="voltar" href="#/painel" aria-label="Voltar ao início">‹ Início</a>` : '') + `<div class="head"><div><h1>${titulo}</h1>${sub ? `<div class="muted">${sub}</div>` : ''}</div><div class="btns">${botoes}</div></div>`;
const vazio = txt => `<div class="empty">${txt}</div>`;
// atalhos grandes do Início, com um resumo de cada área
function atalhosHTML() {
  const d = hoje(), ym = d.slice(0, 7), plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  const lista = S.itens.filter(it => naLista(it, itemInfo(it))).length, st = saldoTotal();
  const t = [
    ['agenda', '📅', 'Agenda', plural(ocorrencias(d).length, 'compromisso hoje', 'compromissos hoje')],
    ['ponto', '⏱️', 'Ponto', `banco ${fmtSaldo(st)}`],
    ['tarefas', '✅', 'Tarefas', plural(S.tarefas.filter(x => !feita(x)).length, 'pendente', 'pendentes')],
    ['feira', '🛒', 'Feira', lista ? plural(lista, 'item na lista', 'itens na lista') : 'lista em dia'],
    ['carro', '⛽', 'Combustível', `${brl(gastoComb(ym + '-01', ym + '-31'))} no mês`],
    ['musica', '🎸', 'Música', plural(S.musicas.length, 'música', 'músicas')],
    ['habilidades', '💡', 'Habilidades', plural(S.habilidades.length, 'cadastrada', 'cadastradas')],
    ['freela', '💼', 'Freelas', plural(S.freelas.filter(f => f.status === 'andamento').length, 'em andamento', 'em andamento')],
    ['vagas', '📨', 'Vagas', plural(S.vagas.filter(v => v.status !== 'encerrada').length, 'processo ativo', 'processos ativos')],
    ['config', '⚙️', 'Ajustes', 'jornada, avisos e backup'],
  ];
  return `<nav class="tiles section" aria-label="Áreas do app">${t.map(([r, ic, n, sub]) => `<a class="tile" href="#/${r}"><span class="ico" aria-hidden="true">${ic}</span><b>${n}</b><small>${esc(sub)}</small></a>`).join('')}</nav>`;
}

function cardPontoHoje() {
  const d = hoje(), c = calcDia(d), r = c.r, prev = previsaoSaida(d), st = saldoTotal();
  return `<div class="card"><div class="card-h"><h3>⏱️ Ponto de hoje</h3><a href="#/ponto" class="small">ver mês</a></div>
  <div class="punches">${MARCAS.map(([k, l]) => `<div class="punch ${r[k] ? 'on' : ''}"><span>${l}</span><b>${r[k] || '--:--'}</b></div>`).join('')}</div>
  <div class="row-stats"><div><span class="muted small">Trabalhado</span><b>${fmtDur(trabAteAgora(d))}</b></div>
  <div><span class="muted small">Saída prevista</span><b>${prev || '—'}</b></div>
  <div><span class="muted small">Banco de horas</span><b class="${cls(st)}">${fmtSaldo(st)}</b></div></div>
  ${c.esperado || c.r.e1 ? `<button class="btn primary block" data-act="baterPonto">Bater ponto agora</button>` : `<p class="muted small">Hoje não é dia de expediente.</p>`}</div>`;
}
function cardEquilibrio(inicio) {
  const h = horasPorCat(inicio), metas = S.settings.metas || {};
  const cats = Object.keys(CATS).filter(k => metas[k] > 0);
  if (!cats.length) return `<p class="muted small">Defina metas semanais em Ajustes.</p>`;
  return cats.map(k => {
    const feito = (h[k] || 0) / 60, meta = +metas[k], p = Math.min(100, feito / meta * 100);
    return `<div class="meta-row"><div class="lbl"><span><span class="dot" style="background:${CATS[k].c}"></span>${CATS[k].n}</span><span class="muted">${num(feito)}h / ${num(meta)}h</span></div><div class="bar"><i style="width:${p}%;background:${CATS[k].c}"></i></div></div>`;
  }).join('');
}

const V = {};
V.painel = () => {
  const d = hoje(), h = new Date().getHours();
  const saud = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  const evs = ocorrencias(d);
  const pend = S.tarefas.filter(t => !feita(t)).sort((a, b) => (a.data || '9').localeCompare(b.data || '9')).slice(0, 8);
  const infos = S.itens.map(it => [it, itemInfo(it)]).filter(([it, i]) => naLista(it, i));
  const prox = [];
  for (let i = 1; i <= 7; i++) { const dd = iso(addDays(new Date(), i)); for (const e of ocorrencias(dd)) if (['igreja', 'banda', 'freela', 'vagas'].includes(e.cat)) prox.push([dd, e.inicio, e.titulo, CATS[e.cat].c]); }
  for (const f of S.freelas) if (['orcamento', 'andamento'].includes(f.status) && f.prazo && f.prazo >= d && diffDias(d, f.prazo) <= 7) prox.push([f.prazo, '', `Entrega: ${f.projeto}`, CATS.freela.c]);
  for (const v of S.vagas) if (v.proximoData && v.proximoData >= d && diffDias(d, v.proximoData) <= 7 && v.status !== 'encerrada') prox.push([v.proximoData, '', `${v.proximo || 'Próximo passo'}: ${v.empresa}`, CATS.vagas.c]);
  prox.sort((a, b) => (a[0] + a[1]).localeCompare(b[0] + b[1]));
  return head(`${saud}, ${esc(S.settings.nome)}!`, fmtData(d, { weekday: 'long', day: 'numeric', month: 'long' }),
    `<button class="btn" data-act="novoEvento">+ Compromisso</button><button class="btn" data-act="novaTarefa">+ Tarefa</button>`) + atalhosHTML() + `<h2>Hoje</h2>` +

    `<div class="grid">
    ${cardPontoHoje()}
    <div class="card"><div class="card-h"><h3>📅 Hoje</h3><a href="#/agenda" class="small">semana</a></div>${gBarHTML()}${evs.map(e => evHTML(e, d)).join('') || vazio('Nada na agenda hoje')}</div>
    <div class="card"><div class="card-h"><h3>✅ Tarefas pendentes</h3><a href="#/tarefas" class="small">todas</a></div><div class="list">${pend.map(tarefaHTML).join('') || vazio('Tudo em dia 🎉')}</div></div>
    <div class="card"><div class="card-h"><h3>🛒 Feira</h3><a href="#/feira" class="small">abrir</a></div>
      <div class="row-stats" style="margin:0 0 10px"><div><span class="muted small">Gasto no mês</span><b>${brl(gastoMes(d.slice(0, 7)))}</b></div><div><span class="muted small">Precisa comprar</span><b>${infos.length} ${infos.length === 1 ? "item" : "itens"}</b></div></div>
      <div class="list">${infos.slice(0, 6).map(([it, i]) => `<div class="li" data-act="editItem" data-id="${it.id}"><div class="grow"><div class="t">${esc(it.nome)}</div><div class="small muted">${i.acabaEm ? 'acaba ' + fmtData(i.acabaEm) : 'sem previsão'}</div></div><span class="tag ${i.status}">${it.comprar && i.status === 'ok' ? 'Na lista' : STATUS_LBL[i.status]}</span></div>`).join('') || vazio('Despensa abastecida')}</div></div>
    ${S.abastecimentos.length ? cardCombustivel() : ''}
    <div class="card"><div class="card-h"><h3>🔜 Próximos 7 dias</h3></div><div class="list">${prox.slice(0, 8).map(([dd, hr, t, c]) => `<div class="li"><span class="dot" style="background:${c}"></span><div class="grow"><div class="t">${esc(t)}</div><div class="small muted">${fmtData(dd)}${hr ? ' · ' + hr : ''}</div></div></div>`).join('') || vazio('Sem ensaios, entregas ou entrevistas')}</div></div>
    <div class="card"><div class="card-h"><h3>⚖️ Equilíbrio da semana</h3></div>${cardEquilibrio(inicioSemana(new Date()))}</div>
  </div>`;
};

V.agenda = () => {
  const ini = inicioSemana(parseISO(agendaRef)), fim = addDays(ini, 6);
  const dias = [...Array(7)].map((_, i) => iso(addDays(ini, i)));
  const h = horasPorCat(ini);
  return head('Agenda', `Semana de ${fmtData(iso(ini), { day: '2-digit', month: '2-digit' })} a ${fmtData(iso(fim), { day: '2-digit', month: '2-digit' })}`,
    `<button class="btn" data-act="semana" data-n="-1">‹</button><button class="btn" data-act="semana" data-n="0">Hoje</button><button class="btn" data-act="semana" data-n="1">›</button><button class="btn primary" data-act="novoEvento">+ Compromisso</button>`) +
    gBarHTML() + `<div class="week section">${dias.map(d => `<div class="day ${d === hoje() ? 'today' : ''}"><div class="day-h"><span>${fmtData(d)}</span><button class="mini" data-act="novoEvento" data-d="${d}" title="Adicionar">+</button></div>${ocorrencias(d).map(e => evHTML(e, d)).join('') || '<p class="muted small">Livre</p>'}</div>`).join('')}</div>
    <div class="grid"><div class="card"><h3 style="margin-bottom:10px">Horas da semana por área</h3>${Object.entries(h).filter(([, m]) => m > 0).sort((a, b) => b[1] - a[1]).map(([k, m]) => `<div class="meta-row"><div class="lbl"><span><span class="dot" style="background:${CATS[k]?.c}"></span>${CATS[k]?.n || k}</span><b>${fmtDur(m)}</b></div></div>`).join('') || vazio('Sem compromissos com horário')}</div>
    <div class="card"><h3 style="margin-bottom:10px">Metas da semana</h3>${cardEquilibrio(ini)}</div></div>
    <p class="muted small">Dica: cadastre sua rotina fixa (sair para o trabalho, almoço, Pilates, culto) como compromisso que se repete toda semana.</p>`;
};

function diasDoMes(ym) {
  const [y, m] = ym.split('-').map(Number), n = new Date(y, m, 0).getDate();
  return [...Array(n)].map((_, i) => `${ym}-${pad(i + 1)}`);
}
function resumoPonto() {
  const ds = diasDoMes(pontoMes);
  let trab = 0, esp = 0, saldo = 0, dias = 0;
  for (const d of ds) { const c = calcDia(d); if (!c.completo) continue; trab += c.trab; esp += c.esperado; saldo += c.saldo; dias++; }
  const st = saldoTotal();
  return `<div class="stat"><span>Dias fechados no mês</span><b>${dias}</b></div><div class="stat"><span>Trabalhado no mês</span><b>${fmtDur(trab)}</b></div><div class="stat"><span>Esperado no mês</span><b>${fmtDur(esp)}</b></div><div class="stat"><span>Saldo do mês</span><b class="${cls(saldo)}">${fmtSaldo(saldo)}</b></div><div class="stat"><span>Banco de horas total</span><b class="${cls(st)}">${fmtSaldo(st)}</b></div>`;
}
function atualizarLinhaPonto(d) {
  const c = calcDia(d), tr = document.getElementById('pt-' + d);
  if (tr) {
    tr.querySelector('.trab').textContent = c.trab || c.r.e1 ? fmtDur(c.trab) : '';
    const s = tr.querySelector('.saldo');
    s.textContent = c.completo ? fmtSaldo(c.saldo) : (c.r.e1 ? 'em aberto' : '');
    s.className = 'saldo ' + (c.completo ? cls(c.saldo) : 'muted');
  }
  const r = $('#pt-resumo'); if (r) r.innerHTML = resumoPonto();
}
V.ponto = () => {
  const [y, m] = pontoMes.split('-').map(Number);
  const nomeMes = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const tipos = [['normal', 'Normal'], ['folga', 'Folga'], ['feriado', 'Feriado'], ['atestado', 'Atestado/abonado'], ['falta', 'Falta']];
  const linhas = diasDoMes(pontoMes).map(d => {
    const c = calcDia(d), wd = parseISO(d).getDay();
    return `<tr id="pt-${d}" class="${S.settings.jornada[wd] ? '' : 'wkend'} ${d === hoje() ? 'today' : ''}"><td>${pad(d.slice(8))} ${DIAS[wd]}</td>
    ${MARCAS.map(([k]) => `<td><input type="time" value="${c.r[k] || ''}" data-chg="ponto" data-d="${d}" data-k="${k}"></td>`).join('')}
    <td><select data-chg="ponto" data-d="${d}" data-k="tipo">${tipos.map(([v, l]) => `<option value="${v}"${c.tipo === v ? ' selected' : ''}>${l}</option>`).join('')}</select></td>
    <td class="trab">${c.trab || c.r.e1 ? fmtDur(c.trab) : ''}</td><td class="saldo ${c.completo ? cls(c.saldo) : 'muted'}">${c.completo ? fmtSaldo(c.saldo) : (c.r.e1 ? 'em aberto' : '')}</td></tr>`;
  }).join('');
  return head('Ponto e banco de horas', `<span style="text-transform:capitalize">${nomeMes}</span> · jornada e tolerância em Ajustes`,
    `<button class="btn" data-act="mes" data-n="-1">‹</button><button class="btn" data-act="mes" data-n="0">Mês atual</button><button class="btn" data-act="mes" data-n="1">›</button><button class="btn" data-act="csvPonto">Exportar CSV</button><button class="btn primary" data-act="baterPonto">Bater ponto agora</button>`) +
    `<div class="grid section">${cardPontoHoje()}</div>
    <div class="stats" id="pt-resumo">${resumoPonto()}</div>
    <div class="table-wrap"><table><thead><tr><th>Dia</th><th>Entrada</th><th>Saída almoço</th><th>Volta almoço</th><th>Saída</th><th>Tipo</th><th>Trabalhado</th><th>Saldo</th></tr></thead><tbody>${linhas}</tbody></table></div>
    <p class="muted small">Só entram no banco de horas os dias fechados (com saída registrada, ou marcados como folga, feriado, atestado ou falta). Diferenças de até ${S.settings.tolerancia} min no dia são desconsideradas, como no ponto da CLT.</p>`;
};

V.tarefas = () => {
  const grupos = [['diaria', 'Todo dia'], ['semanal', 'Toda semana'], ['mensal', 'Todo mês'], ['nenhuma', 'Avulsas']];
  const avulsasFeitas = S.tarefas.filter(t => (t.rec || 'nenhuma') === 'nenhuma' && feita(t));
  return head('Tarefas', 'Casa, pessoal e o que mais precisar lembrar', `<button class="btn primary" data-act="novaTarefa">+ Tarefa</button>`) +
    `<div class="grid">${grupos.map(([g, l]) => {
      const ts = S.tarefas.filter(t => (t.rec || 'nenhuma') === g && !(g === 'nenhuma' && feita(t)));
      return `<div class="card"><h3 style="margin-bottom:10px">${l}</h3><div class="list">${ts.map(tarefaHTML).join('') || vazio('Nenhuma')}</div></div>`;
    }).join('')}
    ${avulsasFeitas.length ? `<div class="card"><h3 style="margin-bottom:10px">Concluídas</h3><div class="list">${avulsasFeitas.map(tarefaHTML).join('')}</div></div>` : ''}</div>`;
};

function abrirFeira() {
  if (!S.itens.length) return toast(nfEstado === 'ok' ? 'Cadastre os itens ou use "Ler nota fiscal" para criá-los pela foto.' : 'Cadastre os itens da feira primeiro.');
  const lista = S.itens.map(it => [it, itemInfo(it)]).sort((a, b) => (naLista(b[0], b[1]) - naLista(a[0], a[1])) || a[0].nome.localeCompare(b[0].nome));
  dlg.innerHTML = `<form class="form"><h2>Registrar feira</h2>
    <label class="field"><span>Data</span><input type="date" name="data" value="${hoje()}" required></label>
    <label class="field"><span>Local</span><input name="local" placeholder="Ex.: Feira de sábado, Atacadão" value="${esc(S.compras.at(-1)?.local || '')}"></label>
    <div class="wide table-wrap"><table class="feira-tbl"><thead><tr><th>Item</th><th>Qtd comprada</th><th>Valor total (R$)</th></tr></thead><tbody>
    ${lista.map(([it, i]) => `<tr><td>${esc(it.nome)} ${naLista(it, i) ? '<span class="tag acabando">lista</span>' : ''}<div class="small muted">${it.unid}${i.precoUnit ? ' · último ' + brl(i.precoUnit) + '/' + it.unid : ''}</div></td><td><input type="number" step="any" min="0" name="q_${it.id}" placeholder="${naLista(it, i) ? num(i.sugerido, 2) : ''}"></td><td><input type="number" step="any" min="0" name="v_${it.id}"></td></tr>`).join('')}
    </tbody></table></div>
    <p class="wide muted small" style="margin:0">Preencha só o que comprou. O estoque é somado automaticamente e o item sai da lista. Total: <b id="feira-total">R$ 0,00</b></p>
    <div class="form-actions"><span class="sp"></span><button type="button" class="btn ghost" data-cancel>Cancelar</button><button class="btn primary">Salvar feira</button></div></form>`;
  const form = dlg.querySelector('form');
  form.oninput = () => { let t = 0; for (const it of S.itens) t += +form.elements['v_' + it.id].value || 0; $('#feira-total').textContent = brl(t); };
  form.onsubmit = e => {
    e.preventDefault();
    const data = form.elements.data.value, local = form.elements.local.value.trim();
    let n = 0;
    for (const [it, i] of lista) {
      const q = +form.elements['q_' + it.id].value || 0, v = +form.elements['v_' + it.id].value || 0;
      if (q <= 0 && v <= 0) continue;
      S.compras.push({ id: uid(), data, local, itemId: it.id, qtd: q, valor: v });
      it.estoque = Math.round((i.atual + q) * 1000) / 1000; it.estoqueData = hoje(); it.comprar = false; n++;
    }
    if (!n) return toast('Nenhum item preenchido.');
    save(); dlg.close(); render(); toast(`Feira registrada com ${n} itens`);
  };
  dlg.querySelector('[data-cancel]').onclick = () => dlg.close();
  dlg.showModal();
}
// ================= nota fiscal por foto (lida pelo Claude) =================
// nfEstado: 'pwa' (fora do Claude), 'espera' (carregando), 'ok' (pode ler), 'off' (sem permissão/sem imagens)
let sampleApi = null, sampleImg = null, nfEstado = window.claude ? 'espera' : 'pwa';
const SECOES = ['Hortifruti', 'Mercearia', 'Carnes e ovos', 'Laticínios', 'Padaria', 'Bebidas', 'Limpeza', 'Higiene', 'Outros'];
const UNIDS = ['un', 'kg', 'g', 'L', 'pct', 'cx', 'dz', 'lata'];
const nfBotao = (cls = '') => nfEstado === 'off' || nfEstado === 'espera' ? '' : `<button class="btn ${cls}" data-act="lerNota">📷 Ler nota fiscal</button>`;
const NF_MSG = {
  rate_limited: 'Muitas leituras seguidas ou limite de uso atingido. Tente mais tarde.',
  chave: 'A chave de IA não foi aceita. Confira em Ajustes > Leitura da nota fiscal.',
  credito: 'A conta da chave de IA está sem créditos.',
  modelo: 'O serviço de IA não encontrou o modelo. Me avise para atualizar o app.',
  image_rejected: 'A foto não foi aceita. Tente outra (JPG ou PNG).',
  session_expired: 'Entre de novo na sua conta do Claude e tente outra vez.',
  invalid_json: 'Não consegui entender esta nota. Tente uma foto mais nítida, reta e com boa luz.',
  empty_completion: 'Não consegui entender esta nota. Tente uma foto mais nítida, reta e com boa luz.',
  refused: 'Não consegui ler esta imagem. Confira se é a foto da nota.',
};
async function reduzirFoto(file, lado = 2400) {
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, lado / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise(r => c.toBlob(b => r(b || file), 'image/jpeg', 0.88));
  } catch (e) { return file; }
}
function nfPrompt() {
  const cad = S.itens.map(it => `${it.nome} | ${it.unid} | ${it.cat}`).join('\n') || '(nenhum)';
  return `As imagens são foto(s) de um cupom ou nota fiscal de compra (supermercado, feira, atacado) no Brasil. Se houver mais de uma, são partes da MESMA nota, em ordem; não repita itens que aparecem em duas fotos.

Extraia todos os itens comprados.

Itens que a pessoa já tem cadastrados (nome | unidade | seção):
${cad}

Responda somente com JSON neste formato:
{"loja":"nome da loja ou null","data":"AAAA-MM-DD ou null","total":123.45,"itens":[{"descricao":"texto como está na nota","nome":"nome curto e legível","qtd":1,"unid":"un","valor":9.99,"existente":"nome exato de um item cadastrado ou null","secao":"Mercearia"}]}

Regras:
- "nome": expanda abreviações (ex.: "ARR T1 TIO J 5KG" vira "Arroz Tio João 5kg"). Sem código de barras.
- "valor": valor total pago na linha, já com desconto do item, número com ponto decimal.
- "qtd" e "unid": unid é uma de ${UNIDS.join(', ')}. Produto pesado vai em kg (ex.: 0,535 kg de tomate: qtd 0.535, unid "kg").
- "existente": só quando for claramente o mesmo produto de um item cadastrado (ex.: cadastrado "Arroz" e na nota "ARROZ TIPO 1 5KG"). Nesse caso use a unidade do item cadastrado em "unid" e converta "qtd" para ela quando der (item em kg e nota com 2 pacotes de 1 kg: qtd 2).
- "secao": uma de ${SECOES.join(', ')}.
- Ignore impostos, troco, forma de pagamento e linhas de desconto geral.
- "total": o valor total da nota, se aparecer.
- Se a imagem não for uma nota fiscal legível, responda {"erro":"motivo curto"}.`;
}
// No app do GitHub (sem Claude embutido) a leitura usa uma chave de IA do próprio Fábio, guardada só neste aparelho (fora do backup)
const IA_KEY = 'meu-dia-a-dia:ia';
const IA_PROV = { gemini: 'Gemini (Google, tem uso grátis)', claude: 'Claude (API da Anthropic, pago por uso)' };
const iaCfg = () => { try { return JSON.parse(localStorage.getItem(IA_KEY)) || {}; } catch (e) { return {}; } };
const temChave = () => !!iaCfg().chave;
const paraBase64 = b => new Promise((ok, err) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = err; r.readAsDataURL(b); });
function jsonTolerante(t) {
  t = String(t || '').trim();
  try { return JSON.parse(t); } catch (e) { }
  const f = t.match(/```(?:json)?\s*([\s\S]*?)```/); if (f) try { return JSON.parse(f[1]); } catch (e) { }
  const a = t.indexOf('{'), z = t.lastIndexOf('}');
  if (a >= 0 && z > a) try { return JSON.parse(t.slice(a, z + 1)); } catch (e) { }
  throw { code: 'invalid_json' };
}
async function iaFetch(url, opt, signal) {
  let r;
  try { r = await fetch(url, { ...opt, signal }); } catch (e) { throw { code: e.name === 'AbortError' ? 'cancelled' : 'upstream_error' }; }
  if (r.ok) return r.json();
  const corpo = await r.text().catch(() => '');
  throw { code: r.status === 401 || r.status === 403 || /api[_ ]?key/i.test(corpo) && r.status === 400 ? 'chave' : r.status === 429 ? 'rate_limited' : r.status === 404 ? 'modelo' : r.status === 402 || /credit|billing/i.test(corpo) ? 'credito' : 'upstream_error', status: r.status };
}
async function iaJson(prompt, imgs, signal) {
  const { prov = 'gemini', chave } = iaCfg();
  const dados = await Promise.all(imgs.map(async b => ({ tipo: b.type || 'image/jpeg', b64: await paraBase64(b) })));
  let ultimo;
  if (prov === 'claude') {
    for (const model of ['claude-sonnet-5-5', 'claude-sonnet-4-5']) {
      try {
        const j = await iaFetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': chave, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
          body: JSON.stringify({ model, max_tokens: 8000, messages: [{ role: 'user', content: [...dados.map(d => ({ type: 'image', source: { type: 'base64', media_type: d.tipo, data: d.b64 } })), { type: 'text', text: prompt }] }] }) }, signal);
        return jsonTolerante((j.content || []).filter(c => c.type === 'text').map(c => c.text).join(''));
      } catch (e) { ultimo = e; if (e.code !== 'modelo') throw e; }
    }
  } else {
    for (const model of ['gemini-flash-latest', 'gemini-2.5-flash']) {
      try {
        const j = await iaFetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(chave)}`, { method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [...dados.map(d => ({ inline_data: { mime_type: d.tipo, data: d.b64 } })), { text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0 } }) }, signal);
        return jsonTolerante((j.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join(''));
      } catch (e) { ultimo = e; if (e.code !== 'modelo') throw e; }
    }
  }
  throw ultimo;
}
function iaHTML() {
  if (window.claude) return '';
  const c = iaCfg();
  return `<form class="card section" id="ia-cfg"><h3 style="margin-bottom:6px">Leitura da nota fiscal (Feira)</h3>
    <p class="muted small">Para ler a foto da nota aqui no app instalado, ele precisa de uma chave de IA sua. A chave fica salva só neste aparelho e não vai no backup.</p>
    <div class="form" style="padding:0">
    <label class="field"><span>Serviço</span><select name="prov">${Object.entries(IA_PROV).map(([k, l]) => `<option value="${k}"${(c.prov || 'gemini') === k ? ' selected' : ''}>${l}</option>`).join('')}</select></label>
    <label class="field"><span>Chave</span><input name="chave" type="password" autocomplete="off" value="${esc(c.chave || '')}" placeholder="Cole a chave aqui"></label>
    <p class="wide small muted" style="margin:0" id="ia-dica"></p>
    <div class="form-actions"><button type="button" class="btn danger" data-ia-apagar${c.chave ? '' : ' hidden'}>Remover chave</button><span class="sp"></span><button class="btn primary">Salvar chave</button></div></div></form>`;
}
function ligarIA() {
  const f = $('#ia-cfg'); if (!f) return;
  const dica = () => { $('#ia-dica').innerHTML = f.elements.prov.value === 'claude'
    ? 'Crie em <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">console.anthropic.com</a> (precisa de créditos na conta). Cada nota custa centavos.'
    : 'Crie de graça em <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a> com sua conta Google, toque em "Create API key" e copie.'; };
  f.elements.prov.onchange = dica; dica();
  f.onsubmit = e => { e.preventDefault(); const chave = f.elements.chave.value.trim(); try { localStorage.setItem(IA_KEY, JSON.stringify({ prov: f.elements.prov.value, chave })); } catch (e2) { } render(); toast(chave ? 'Chave salva. Já pode ler notas na Feira.' : 'Chave removida'); };
  f.querySelector('[data-ia-apagar]').onclick = () => { try { localStorage.removeItem(IA_KEY); } catch (e) { } render(); toast('Chave removida'); };
}
function lerNota() {
  if (nfEstado === 'pwa' && !temChave()) { location.hash = '#/config'; setTimeout(() => $('#ia-cfg')?.scrollIntoView({ behavior: 'smooth' }), 100); return toast('Primeiro cole sua chave de IA aqui'); }
  if (nfEstado !== 'ok' && nfEstado !== 'pwa') return;
  const lim = sampleImg || { maxCount: 4, mediaTypes: ['image/jpeg', 'image/png', 'image/webp'] };
  const inp = document.createElement('input');
  inp.type = 'file'; inp.multiple = (lim.maxCount || 1) > 1;
  inp.accept = (lim.mediaTypes || []).join(',') || 'image/*';
  inp.onchange = () => { const fs = [...inp.files].slice(0, Math.min(4, lim.maxCount || 1)); if (fs.length) enviarNota(fs); };
  inp.click();
}
async function enviarNota(files) {
  const ctl = new AbortController();
  dlg.innerHTML = `<div class="form"><h2>Lendo a nota…</h2><p class="wide muted" style="margin:0">${sampleApi ? 'O Claude' : 'A IA'} está lendo ${files.length > 1 ? 'as fotos' : 'a foto'}. Pode levar até um minuto.${sampleApi ? ' Na primeira vez ele pede sua permissão.' : ''}</p><div class="wide bar"><i class="nf-anda"></i></div><div class="form-actions"><span class="sp"></span><button type="button" class="btn" data-cancel>Cancelar</button></div></div>`;
  dlg.querySelector('[data-cancel]').onclick = () => { ctl.abort(); dlg.close(); };
  if (!dlg.open) dlg.showModal();
  try {
    const imgs = await Promise.all(files.map(f => reduzirFoto(f)));
    const r = sampleApi ? await sampleApi.json(nfPrompt(), { images: imgs, signal: ctl.signal, modelTier: 'default' }) : await iaJson(nfPrompt(), imgs, ctl.signal);
    if (!dlg.open) return;
    if (!r || r.erro || !Array.isArray(r.itens) || !r.itens.length) { dlg.close(); return aviso('Não deu para ler', (r && r.erro ? `A IA disse: ${r.erro}.\n\n` : '') + 'Tente uma foto mais nítida, com a nota reta, inteira e com boa luz. Se a nota for comprida, tire 2 ou 3 fotos e escolha todas juntas.'); }
    revisarNota(r);
  } catch (e) {
    const code = e && e.code;
    if (code === 'cancelled') return;
    dlg.close();
    if (['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed', 'images_unavailable'].includes(code)) {
      nfEstado = 'off'; render();
      return toast(code === 'not_granted' ? 'Leitura da nota não permitida. Você pode registrar a feira à mão.' : 'Leitura de fotos não está disponível aqui.');
    }
    toast(NF_MSG[code] || 'Falha ao ler a nota. Tente de novo.');
  }
}
function revisarNota(r) {
  const n = s => String(s || '').trim().toLowerCase();
  const porNome = nome => S.itens.find(it => n(it.nome) === n(nome));
  const linhas = r.itens.filter(x => x && (x.nome || x.descricao)).map(x => {
    const ex = porNome(x.existente) || porNome(x.nome);
    return { nome: String(x.nome || x.descricao).trim(), desc: String(x.descricao || ''), qtd: +x.qtd || 1, unid: UNIDS.includes(x.unid) ? x.unid : 'un', valor: Math.round((+x.valor || 0) * 100) / 100, secao: SECOES.includes(x.secao) ? x.secao : 'Outros', itemId: ex ? ex.id : 'novo' };
  });
  const dataOk = /^\d{4}-\d{2}-\d{2}$/.test(r.data || '') && r.data <= hoje() ? r.data : hoje();
  const opts = sel => `<option value="novo"${sel === 'novo' ? ' selected' : ''}>＋ Novo item</option>` + [...S.itens].sort((a, b) => a.nome.localeCompare(b.nome)).map(it => `<option value="${it.id}"${sel === it.id ? ' selected' : ''}>${esc(it.nome)} (${esc(it.unid)})</option>`).join('');
  const total = +r.total || 0;
  dlg.innerHTML = `<form class="form"><h2>Confira a nota</h2>
    <label class="field"><span>Data</span><input type="date" name="data" value="${dataOk}" required></label>
    <label class="field"><span>Local</span><input name="local" value="${esc(r.loja || '')}" placeholder="Ex.: Atacadão"></label>
    <p class="wide muted small" style="margin:0">Desmarque o que não quer registrar e corrija o que a IA leu errado. "Item" liga a compra a um item do seu estoque; "Novo item" cria um.</p>
    <div class="wide nf-lista">${linhas.map((l, k) => `<div class="nf-row" data-k="${k}">
      <label class="nf-top"><input type="checkbox" name="ok_${k}" checked><input name="nome_${k}" value="${esc(l.nome)}" aria-label="Nome"></label>
      ${l.desc ? `<div class="small muted nf-desc">${esc(l.desc)}</div>` : ''}
      <div class="nf-campos">
        <label class="field nf-item"><span>Item</span><select name="item_${k}">${opts(l.itemId)}</select></label>
        <label class="field"><span>Qtd</span><input type="number" step="any" min="0" name="q_${k}" value="${l.qtd}"></label>
        <label class="field nf-novo"><span>Unid.</span><select name="u_${k}">${UNIDS.map(u => `<option${u === l.unid ? ' selected' : ''}>${u}</option>`).join('')}</select></label>
        <label class="field"><span>Valor (R$)</span><input type="number" step="any" min="0" name="v_${k}" value="${l.valor}"></label>
        <label class="field nf-novo nf-sec"><span>Seção</span><select name="s_${k}">${SECOES.map(s => `<option${s === l.secao ? ' selected' : ''}>${s}</option>`).join('')}</select></label>
      </div></div>`).join('')}</div>
    <p class="wide small" style="margin:0">Soma dos itens marcados: <b id="nf-soma"></b>${total ? ` · total na nota: <b>${brl(total)}</b> <span id="nf-dif" class="warn"></span>` : ''}</p>
    <div class="form-actions"><button type="button" class="btn ghost" data-outra>Outra foto</button><span class="sp"></span><button type="button" class="btn ghost" data-cancel>Cancelar</button><button class="btn primary">Registrar compra</button></div></form>`;
  const form = dlg.querySelector('form'), el = (p, k) => form.elements[p + k];
  const atualizar = () => {
    let soma = 0;
    linhas.forEach((l, k) => {
      const row = form.querySelector(`.nf-row[data-k="${k}"]`), on = el('ok_', k).checked, novo = el('item_', k).value === 'novo';
      row.classList.toggle('off', !on); row.classList.toggle('existe', !novo);
      if (on) soma += +el('v_', k).value || 0;
    });
    $('#nf-soma').textContent = brl(soma);
    const dif = $('#nf-dif'); if (dif) dif.textContent = Math.abs(soma - total) > 0.05 ? `(diferença de ${brl(soma - total)})` : '✓';
  };
  form.oninput = form.onchange = atualizar; atualizar();
  form.onsubmit = e => {
    e.preventDefault();
    const data = form.elements.data.value, local = form.elements.local.value.trim();
    const atual = {}, novos = {};
    let cont = 0, criados = 0;
    linhas.forEach((l, k) => {
      if (!el('ok_', k).checked) return;
      const q = +el('q_', k).value || 0, v = +el('v_', k).value || 0;
      if (q <= 0 && v <= 0) return;
      let it = byId('itens', el('item_', k).value);
      if (!it) {
        const nome = el('nome_', k).value.trim() || l.nome;
        it = porNome(nome) || novos[n(nome)];
        if (!it) { it = { id: uid(), nome, cat: el('s_', k).value, unid: el('u_', k).value, estoque: 0, estoqueData: hoje(), comprar: false }; S.itens.push(it); novos[n(nome)] = it; criados++; }
      }
      if (!(it.id in atual)) atual[it.id] = itemInfo(it).atual || 0;
      atual[it.id] += q;
      S.compras.push({ id: uid(), data, local, itemId: it.id, qtd: q, valor: v });
      cont++;
    });
    if (!cont) return toast('Nenhum item marcado.');
    for (const [id, q] of Object.entries(atual)) { const it = byId('itens', id); it.estoque = Math.round(q * 1000) / 1000; it.estoqueData = hoje(); it.comprar = false; }
    save(); dlg.close(); render(); toast(`Compra registrada: ${cont} itens${criados ? `, ${criados} novos no estoque` : ''}`);
  };
  dlg.querySelector('[data-cancel]').onclick = () => dlg.close();
  dlg.querySelector('[data-outra]').onclick = () => { dlg.close(); lerNota(); };
  if (!dlg.open) dlg.showModal();
}
V.feira = () => {
  const infos = S.itens.map(it => [it, itemInfo(it)]);
  const ordem = { falta: 0, acabando: 1, ok: 2 };
  const d = hoje(), ym = d.slice(0, 7);
  const pm = new Date(); pm.setDate(1); pm.setMonth(pm.getMonth() - 1);
  const tabs = [['estoque', 'Estoque e previsão'], ['lista', 'Lista de compras'], ['gastos', 'Gastos']];
  let corpo = '';
  if (feiraTab === 'estoque') {
    infos.sort((a, b) => ordem[a[1].status] - ordem[b[1].status] || (a[1].diasRest ?? 1e9) - (b[1].diasRest ?? 1e9));
    corpo = S.itens.length ? `<div class="table-wrap"><table><thead><tr><th>Item</th><th>Em casa (estimado)</th><th>Consumo/semana</th><th>Acaba em</th><th>Último preço</th><th>Status</th><th>Lista</th></tr></thead><tbody>
    ${infos.map(([it, i]) => `<tr style="cursor:pointer" data-act="editItem" data-id="${it.id}"><td><b>${esc(it.nome)}</b><div class="small muted">${esc(it.cat)}</div></td><td>${num(i.atual, 2)} ${esc(it.unid)}</td><td>${i.porDia ? num(i.porDia * 7, 2) + ' ' + esc(it.unid) : '<span class="muted small">compre 2x para estimar</span>'}</td><td>${i.acabaEm ? fmtData(i.acabaEm) + `<div class="small muted">${Math.floor(i.diasRest)} dias</div>` : '—'}</td><td>${i.precoUnit ? brl(i.precoUnit) + '/' + esc(it.unid) : '—'}</td><td><span class="tag ${i.status}">${STATUS_LBL[i.status]}</span></td><td><input type="checkbox" ${it.comprar ? 'checked' : ''} data-act="toggleComprar" data-id="${it.id}" title="Colocar na lista"></td></tr>`).join('')}
    </tbody></table></div><p class="muted small">O consumo é calculado sozinho a partir do intervalo entre suas compras (ou do valor que você informar). Clique num item para corrigir o estoque quando conferir a despensa.</p>` : vazio('Cadastre os itens que você costuma comprar na feira.');
  } else if (feiraTab === 'lista') {
    const l = infos.filter(([it, i]) => naLista(it, i)).sort((a, b) => a[0].cat.localeCompare(b[0].cat) || a[0].nome.localeCompare(b[0].nome));
    const est = l.reduce((s, [, i]) => s + (i.precoUnit ? i.precoUnit * i.sugerido : 0), 0);
    corpo = `<div class="stats"><div class="stat"><span>Itens na lista</span><b>${l.length}</b></div><div class="stat"><span>Custo estimado</span><b>${brl(est)}</b></div></div>
    <div class="btns section"><button class="btn" data-act="copiarLista">Copiar lista (WhatsApp)</button>${nfBotao()}<button class="btn primary" data-act="novaFeira">Registrar feira</button></div>
    <div class="list">${l.map(([it, i]) => `<div class="li" data-act="editItem" data-id="${it.id}"><div class="grow"><div class="t">${esc(it.nome)}</div><div class="small muted">${esc(it.cat)} · comprar ~${num(i.sugerido, 2)} ${esc(it.unid)}${i.precoUnit ? ' · ~' + brl(i.precoUnit * i.sugerido) : ''}</div></div><span class="tag ${i.status}">${it.comprar && i.status === 'ok' ? 'Manual' : STATUS_LBL[i.status]}</span></div>`).join('') || vazio('Nada para comprar agora')}</div>`;
  } else {
    const semanas = [...Array(8)].map((_, k) => { const ini = inicioSemana(addDays(new Date(), -7 * (7 - k))); return [iso(ini), iso(addDays(ini, 6))]; });
    const vals = semanas.map(([a, b]) => gastoEntre(a, b)), max = Math.max(...vals, 1);
    const media = vals.reduce((s, v) => s + v, 0) / 8;
    const porCat = {}; for (const c of S.compras.filter(c => c.data.startsWith(ym))) { const it = byId('itens', c.itemId); const k = it?.cat || 'Outros'; porCat[k] = (porCat[k] || 0) + (+c.valor || 0); }
    const grupos = {}; for (const c of S.compras) { const k = `${c.data}|${c.local || ''}`; (grupos[k] ||= []).push(c); }
    const hist = Object.entries(grupos).sort((a, b) => b[0].localeCompare(a[0]));
    corpo = `<div class="stats"><div class="stat"><span>Este mês</span><b>${brl(gastoMes(ym))}</b></div><div class="stat"><span>Mês passado</span><b>${brl(gastoMes(iso(pm).slice(0, 7)))}</b></div><div class="stat"><span>Média semanal (8 sem.)</span><b>${brl(media)}</b></div><div class="stat"><span>Projeção do mês</span><b>${brl(media * 4.33)}</b></div></div>
    <div class="grid section"><div class="card"><h3>Gasto por semana</h3><div class="chart">${vals.map((v, k) => `<div class="c"><em>${v ? Math.round(v) : ''}</em><i style="height:${v / max * 100}%"></i><small>${fmtData(semanas[k][0], { day: '2-digit', month: '2-digit' })}</small></div>`).join('')}</div></div>
    <div class="card"><h3 style="margin-bottom:10px">Por seção (este mês)</h3>${Object.entries(porCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="meta-row"><div class="lbl"><span>${esc(k)}</span><b>${brl(v)}</b></div><div class="bar"><i style="width:${v / gastoMes(ym) * 100}%"></i></div></div>`).join('') || vazio('Sem compras este mês')}</div></div>
    <h2>Histórico de feiras</h2><div class="list">${hist.map(([k, cs]) => `<div class="li" style="cursor:default"><div class="grow"><div class="t">${fmtData(cs[0].data)}${cs[0].local ? ' · ' + esc(cs[0].local) : ''} · ${brl(cs.reduce((s, c) => s + (+c.valor || 0), 0))}</div><div class="small muted">${cs.map(c => `${esc(byId('itens', c.itemId)?.nome || '?')} (${num(c.qtd, 2)})`).join(', ')}</div></div><button class="mini" data-act="apagarFeira" data-k="${esc(k)}">Apagar</button></div>`).join('') || vazio('Nenhuma feira registrada')}</div>`;
  }
  return head('Feira', 'Estoque, previsão de quando acaba e quanto você gasta', `<button class="btn" data-act="novoItem">+ Item</button>${nfBotao()}<button class="btn primary" data-act="novaFeira">Registrar feira</button>`) +
    `<div class="tabs">${tabs.map(([k, l]) => `<button class="btn ${feiraTab === k ? 'on' : ''}" data-act="feiraTab" data-t="${k}">${l}</button>`).join('')}</div>${corpo}`;
};

// ================= combustível =================
const COMB = [['gasolina', 'Gasolina'], ['etanol', 'Etanol'], ['aditivada', 'Gasolina aditivada'], ['diesel', 'Diesel'], ['gnv', 'GNV']];
const COMB_LBL = Object.fromEntries(COMB);
F.abast = [
  { k: 'data', label: 'Data', type: 'date', req: 1 },
  { k: 'posto', label: 'Posto', ph: 'Ex.: Shell da avenida' },
  { k: 'comb', label: 'Combustível', type: 'select', options: COMB },
  { k: 'valor', label: 'Valor pago (R$)', type: 'number', step: 'any', req: 1 },
  { k: 'preco', label: 'Preço do litro (R$)', type: 'number', step: 'any', ph: 'Ex.: 6,19' },
  { k: 'litros', label: 'Litros (opcional)', type: 'number', step: 'any', ph: 'Calculo pelo preço se vazio' },
  { k: 'km', label: 'Km no painel (hodômetro)', type: 'number', step: 'any', ph: 'Para calcular o consumo' },
  { k: 'cheio', label: 'Encheu o tanque', type: 'checkbox' },
  { k: 'notas', label: 'Notas', type: 'textarea', wide: 1 },
];
const litrosDe = a => +a.litros || (+a.preco ? (+a.valor || 0) / +a.preco : 0);
const precoDe = a => +a.preco || (+a.litros ? (+a.valor || 0) / +a.litros : 0);
const gastoComb = (a, b) => S.abastecimentos.filter(x => x.data >= a && x.data <= b).reduce((s, x) => s + (+x.valor || 0), 0);
// Consumo pelo método do tanque cheio: entre dois "encheu o tanque", km rodados ÷ litros colocados depois do primeiro
function consumoCarro() {
  const l = S.abastecimentos.filter(a => +a.km > 0).sort((a, b) => a.km - b.km || a.data.localeCompare(b.data));
  const trechos = []; let ini = null, litros = 0, valor = 0;
  for (const a of l) {
    if (ini) { litros += litrosDe(a); valor += +a.valor || 0; }
    if (a.cheio) {
      if (ini && litros > 0 && a.km > ini.km) trechos.push({ fim: a, km: a.km - ini.km, litros, valor, kml: (a.km - ini.km) / litros });
      ini = a; litros = 0; valor = 0;
    }
  }
  const rec = trechos.slice(-5), km = rec.reduce((s, t) => s + t.km, 0), lt = rec.reduce((s, t) => s + t.litros, 0), vl = rec.reduce((s, t) => s + t.valor, 0);
  return { trechos, kml: lt ? km / lt : 0, rsKm: km ? vl / km : 0, porId: Object.fromEntries(trechos.map(t => [t.fim.id, t])) };
}
function proximoAbast() {
  const ds = [...new Set(S.abastecimentos.map(a => a.data))].sort();
  if (ds.length < 3) return null;
  const rec = ds.slice(-6), media = diffDias(rec[0], rec.at(-1)) / (rec.length - 1);
  return media >= 1 ? { media, data: iso(addDays(parseISO(ds.at(-1)), Math.round(media))) } : null;
}
function cardCombustivel() {
  const ym = hoje().slice(0, 7), c = consumoCarro();
  return `<div class="card"><div class="card-h"><h3>⛽ Combustível</h3><a href="#/carro" class="small">abrir</a></div>
    <div class="row-stats" style="margin:0"><div><span class="muted small">Gasto no mês</span><b>${brl(gastoComb(ym + '-01', ym + '-31'))}</b></div><div><span class="muted small">Consumo</span><b>${c.kml ? num(c.kml) + ' km/L' : '—'}</b></div></div>
    <button class="btn block" data-act="novoAbast">+ Abastecimento</button></div>`;
}
V.carro = () => {
  const d = hoje(), ym = d.slice(0, 7), pm = new Date(); pm.setDate(1); pm.setMonth(pm.getMonth() - 1);
  const ymAnt = iso(pm).slice(0, 7), mesG = m => gastoComb(m + '-01', m + '-31');
  const meses = [...Array(6)].map((_, k) => { const x = new Date(); x.setDate(1); x.setMonth(x.getMonth() - 5 + k); return iso(x).slice(0, 7); });
  const vals = meses.map(mesG), max = Math.max(...vals, 1), comDados = vals.filter(v => v > 0);
  const media = comDados.length ? comDados.reduce((s, v) => s + v, 0) / comDados.length : 0;
  const c = consumoCarro(), prox = proximoAbast();
  const hist = [...S.abastecimentos].sort((a, b) => b.data.localeCompare(a.data) || (b.km || 0) - (a.km || 0));
  const ult = hist.find(a => precoDe(a) > 0);
  const litrosMes = S.abastecimentos.filter(a => a.data.startsWith(ym)).reduce((s, a) => s + litrosDe(a), 0);
  return head('Combustível', 'Abastecimentos, consumo do carro e quanto você gasta', `<button class="btn primary" data-act="novoAbast">+ Abastecimento</button>`) +
    `<div class="stats"><div class="stat"><span>Este mês</span><b>${brl(mesG(ym))}</b><span>${litrosMes ? num(litrosMes) + ' litros' : ''}</span></div><div class="stat"><span>Mês passado</span><b>${brl(mesG(ymAnt))}</b></div><div class="stat"><span>Média por mês</span><b>${brl(media)}</b></div>
    <div class="stat"><span>Consumo médio</span><b>${c.kml ? num(c.kml) + ' km/L' : '—'}</b><span>${c.rsKm ? brl(c.rsKm) + ' por km' : 'encha o tanque 2x e anote o km'}</span></div>
    <div class="stat"><span>Último preço</span><b>${ult ? brl(precoDe(ult)) : '—'}</b><span>${ult ? esc(COMB_LBL[ult.comb] || '') : ''}</span></div>
    <div class="stat"><span>Próximo abastecimento</span><b>${prox ? fmtData(prox.data, { day: '2-digit', month: '2-digit' }) : '—'}</b><span>${prox ? 'a cada ~' + Math.round(prox.media) + ' dias' : 'precisa de 3 registros'}</span></div></div>
    <div class="grid section"><div class="card"><h3>Gasto por mês</h3><div class="chart">${vals.map((v, k) => `<div class="c"><em>${v ? Math.round(v) : ''}</em><i style="height:${v / max * 100}%"></i><small>${parseISO(meses[k] + '-01').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</small></div>`).join('')}</div></div>
    <form class="card" id="calc-comb" onsubmit="return false"><h3 style="margin-bottom:10px">Gasolina ou etanol?</h3><div class="form" style="padding:0">
      <label class="field"><span>Gasolina (R$/L)</span><input type="number" step="any" name="g" inputmode="decimal"></label>
      <label class="field"><span>Etanol (R$/L)</span><input type="number" step="any" name="e" inputmode="decimal"></label>
      <p class="wide" style="margin:0" id="calc-res"><span class="muted small">Digite os dois preços da bomba.</span></p></div></form></div>
    <h2>Abastecimentos</h2><div class="list">${hist.map(a => { const t = c.porId[a.id], p = precoDe(a), l = litrosDe(a); return `<div class="li" data-act="editAbast" data-id="${a.id}"><div class="grow"><div class="t">${fmtData(a.data)} · ${brl(a.valor)}${a.posto ? ' · ' + esc(a.posto) : ''}</div><div class="small muted">${[COMB_LBL[a.comb], l ? num(l, 2) + ' L' : '', p ? brl(p) + '/L' : '', a.km ? num(a.km, 0) + ' km' : '', a.cheio ? 'tanque cheio' : ''].filter(Boolean).join(' · ')}</div></div>${t ? `<span class="tag ok">${num(t.kml)} km/L</span>` : ''}</div>`; }).join('') || vazio('Registre cada abastecimento: valor, preço do litro e o km do painel. Marcando "encheu o tanque", o app calcula quantos km/L o carro faz.')}</div>`;
};
function abrirAbast(a) {
  const ult = [...S.abastecimentos].sort((x, y) => y.data.localeCompare(x.data))[0];
  crud('abastecimentos', 'abastecimento', F.abast, a, { data: hoje(), comb: ult?.comb || 'gasolina', posto: ult?.posto || '', preco: ult ? +precoDe(ult).toFixed(2) || null : null, cheio: true }, {
    antes: o => {
      if (!(+o.valor > 0)) { toast('Informe o valor pago.'); return false; }
      if (o.km && ult && ult !== a && +o.km < +ult.km && o.data >= ult.data) { toast(`O km está menor que o do último abastecimento (${num(ult.km, 0)}).`); return false; }
    },
  });
}
function ligarCarro() {
  const f = $('#calc-comb'); if (!f) return;
  f.oninput = () => {
    const g = +f.elements.g.value, e = +f.elements.e.value, out = $('#calc-res');
    if (!g || !e) return out.innerHTML = '<span class="muted small">Digite os dois preços da bomba.</span>';
    const r = e / g;
    out.innerHTML = `<b class="${r <= 0.7 ? 'pos' : 'warn'}">${r <= 0.7 ? 'Etanol compensa' : 'Gasolina compensa'}</b> <span class="muted small">(etanol custa ${num(r * 100, 0)}% da gasolina; compensa até 70%)</span>`;
  };
}

V.musica = () => {
  const d = hoje(), prox = [];
  for (let i = 0; i <= 30; i++) { const dd = iso(addDays(new Date(), i)); for (const e of ocorrencias(dd)) if (e.cat === 'igreja' || e.cat === 'banda') prox.push([dd, e]); }
  const st = [['aprender', 'Preciso aprender'], ['ensaiando', 'Ensaiando'], ['pronta', 'Prontas']];
  const inst = { baixo: '🎸 Baixo', teclado: '🎹 Teclado', ambos: '🎸🎹' };
  return head('Música', 'Igreja, banda e repertório', `<button class="btn" data-act="novoEvento" data-cat="igreja">+ Compromisso</button><button class="btn primary" data-act="novaMusica">+ Música</button>`) +
    `<div class="grid"><div class="card"><h3 style="margin-bottom:10px">Próximos 30 dias</h3><div class="list">${prox.slice(0, 12).map(([dd, e]) => `<div class="li" ${evAct(e)}><span class="dot" style="background:${CATS[e.cat].c}"></span><div class="grow"><div class="t">${esc(e.titulo)}</div><div class="small muted">${fmtData(dd)}${e.inicio ? ' · ' + e.inicio : ''}${e.local ? ' · ' + esc(e.local) : ''}</div></div><span class="tag">${CATS[e.cat].n.split(' ')[0]}</span></div>`).join('') || vazio('Sem cultos, ensaios ou shows. Use a categoria Igreja ou Banda na agenda.')}</div></div>
    ${st.map(([k, l]) => { const ms = S.musicas.filter(m => (m.status || 'aprender') === k); return `<div class="card"><h3 style="margin-bottom:10px">${l} <span class="muted">(${ms.length})</span></h3><div class="list">${ms.map(m => `<div class="li" data-act="editMusica" data-id="${m.id}"><div class="grow"><div class="t">${esc(m.titulo)}</div><div class="small muted">${[m.artista, m.tom ? 'Tom ' + m.tom : '', m.bpm ? m.bpm + ' bpm' : '', inst[m.instrumento], m.onde === 'ambos' ? 'Igreja e banda' : m.onde === 'banda' ? 'Banda' : 'Igreja'].filter(Boolean).map(esc).join(' · ')}</div></div>${m.link ? `<a class="mini" href="${esc(m.link)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">abrir</a>` : ''}</div>`).join('') || vazio('Nenhuma')}</div></div>`; }).join('')}</div>`;
};

const NIVEL = ['', 'Iniciante', 'Básico', 'Intermediário', 'Avançado', 'Especialista'];
function resumoProfissional() {
  const hs = [...S.habilidades].sort((a, b) => b.nivel - a.nivel);
  const areas = {}; for (const h of hs) (areas[h.area || 'Geral'] ||= []).push(h);
  let t = `${S.settings.nome}: resumo de habilidades\n\n`;
  for (const [a, l] of Object.entries(areas)) t += `${a}\n` + l.map(h => `• ${h.nome} (${NIVEL[h.nivel] || ''}${h.anos ? `, ${num(h.anos)} anos` : ''})${h.ferramentas ? ': ' + h.ferramentas : ''}`).join('\n') + '\n\n';
  if (S.atividades.length) t += `O que posso fazer\n` + S.atividades.map(a => `• ${a.nome}${a.descricao ? ': ' + a.descricao : ''}`).join('\n');
  return t.trim();
}
V.habilidades = () => {
  const areas = {}; for (const h of S.habilidades) (areas[h.area || 'Geral'] ||= []).push(h);
  const tipoLbl = { ambos: 'Vasta e freela', vasta: 'Vasta', freela: 'Freela', vagas: 'Vagas' };
  return head('Habilidades', 'O que você sabe fazer e o que pode oferecer', `<button class="btn" data-act="novaAtiv">+ Atividade</button><button class="btn primary" data-act="novaHab">+ Habilidade</button>`) +
    `<div class="grid section">${Object.entries(areas).map(([a, l]) => `<div class="card"><h3 style="margin-bottom:10px">${esc(a)}</h3><div class="list">${l.sort((x, y) => y.nivel - x.nivel).map(h => `<div class="li" data-act="editHab" data-id="${h.id}"><div class="grow"><div class="t">${esc(h.nome)}</div><div class="small muted">${NIVEL[h.nivel] || ''}${h.anos ? ' · ' + num(h.anos) + ' anos' : ''}${h.ferramentas ? ' · ' + esc(h.ferramentas) : ''}</div><div class="bar" style="margin-top:5px"><i style="width:${(h.nivel || 0) * 20}%"></i></div></div></div>`).join('')}</div></div>`).join('') || vazio('Cadastre suas habilidades profissionais (edição, design, música, ferramentas...)')}</div>
    <h2>Atividades que posso desempenhar</h2>
    <div class="grid section">${S.atividades.map(a => `<div class="card" style="cursor:pointer" data-act="editAtiv" data-id="${a.id}"><div class="card-h"><h3>${esc(a.nome)}</h3><span class="tag">${tipoLbl[a.tipo] || ''}</span></div><div class="small muted">${esc(a.descricao || '')}</div><div class="small" style="margin-top:6px">${(a.habs || []).map(id => byId('habilidades', id)?.nome).filter(Boolean).map(n => `<span class="tag">${esc(n)}</span>`).join(' ')}</div>${a.valorHora ? `<div style="margin-top:6px"><b>${brl(a.valorHora)}</b><span class="muted small">/hora</span></div>` : ''}</div>`).join('') || vazio('Liste serviços que você pode fazer (ex.: edição de Reels, carrosséis, aulas de baixo) e ligue às habilidades')}</div>
    <div class="card"><div class="card-h"><h3>Resumo para currículo e propostas</h3><button class="btn sm" data-act="copiarResumo">Copiar</button></div><pre class="resumo">${esc(resumoProfissional())}</pre></div>`;
};

V.freela = () => {
  const d = hoje(), ym = d.slice(0, 7);
  const aReceber = S.freelas.filter(f => ['andamento', 'entregue'].includes(f.status)).reduce((s, f) => s + (+f.valor || 0), 0);
  const recebMes = S.freelas.filter(f => f.status === 'pago' && (f.pagoEm || '').startsWith(ym)).reduce((s, f) => s + (+f.valor || 0), 0);
  const recebAno = S.freelas.filter(f => f.status === 'pago' && (f.pagoEm || '').startsWith(d.slice(0, 4))).reduce((s, f) => s + (+f.valor || 0), 0);
  const cols = Object.entries(FREELA_LBL);
  return head('Freelas', 'Trabalhos fora da Vasta', `<button class="btn primary" data-act="novoFreela">+ Freela</button>`) +
    `<div class="stats"><div class="stat"><span>Em andamento</span><b>${S.freelas.filter(f => f.status === 'andamento').length}</b></div><div class="stat"><span>A receber</span><b>${brl(aReceber)}</b></div><div class="stat"><span>Recebido no mês</span><b class="pos">${brl(recebMes)}</b></div><div class="stat"><span>Recebido no ano</span><b>${brl(recebAno)}</b></div></div>
    <div class="cols">${cols.map(([k, l]) => { const fs = S.freelas.filter(f => f.status === k); return `<div class="col"><h3>${l}<span class="muted">${fs.length}</span></h3>${fs.map(f => { const atras = f.prazo && f.prazo < d && ['orcamento', 'andamento'].includes(k); return `<div class="kcard" data-act="editFreela" data-id="${f.id}"><b>${esc(f.projeto)}</b><div class="small muted">${esc(f.cliente || '')}</div><div class="small">${f.valor ? brl(f.valor) : ''}${f.prazo ? ` · <span class="${atras ? 'neg' : ''}">prazo ${fmtData(f.prazo)}</span>` : ''}</div>${f.horasGastas && f.valor ? `<div class="small muted">${brl(f.valor / f.horasGastas)}/hora real</div>` : ''}</div>`; }).join('')}</div>`; }).join('')}</div>`;
};

V.vagas = () => {
  const ativas = S.vagas.filter(v => v.status !== 'encerrada');
  return head('Vagas', 'Candidaturas e processos seletivos', `<button class="btn primary" data-act="novaVaga">+ Candidatura</button>`) +
    `<div class="stats"><div class="stat"><span>Processos ativos</span><b>${ativas.length}</b></div><div class="stat"><span>Aplicadas este mês</span><b>${S.vagas.filter(v => (v.data || '').startsWith(hoje().slice(0, 7))).length}</b></div><div class="stat"><span>Em entrevista/teste</span><b>${S.vagas.filter(v => ['entrevista', 'teste'].includes(v.status)).length}</b></div></div>
    <div class="cols">${VAGA_ETAPAS.map(([k, l], idx) => { const vs = S.vagas.filter(v => v.status === k); return `<div class="col"><h3>${l}<button class="mini" data-act="novaVaga" data-s="${k}">+</button></h3>${vs.map(v => `<div class="kcard" data-act="editVaga" data-id="${v.id}"><b>${esc(v.cargo)}</b><div class="small muted">${esc(v.empresa)}${v.salario ? ' · ' + esc(v.salario) : ''}</div>${v.proximo ? `<div class="small">➜ ${esc(v.proximo)}${v.proximoData ? ' · ' + fmtData(v.proximoData) : ''}</div>` : ''}<div class="acts">${idx > 0 ? `<button class="mini" data-act="moverVaga" data-id="${v.id}" data-n="-1">‹</button>` : '<span></span>'}${v.link ? `<a class="mini" href="${esc(v.link)}" target="_blank" rel="noopener" onclick="event.stopPropagation()">vaga</a>` : ''}${idx < VAGA_ETAPAS.length - 1 ? `<button class="mini" data-act="moverVaga" data-id="${v.id}" data-n="1">›</button>` : ''}</div></div>`).join('')}</div>`; }).join('')}</div>`;
};

V.config = () => {
  const s = S.settings;
  return head('Ajustes', 'Jornada, metas e backup') +
    `<form class="card section" id="cfg"><div class="form" style="padding:0">
    <label class="field"><span>Seu nome</span><input name="nome" value="${esc(s.nome)}"></label>
    <label class="field"><span>Saldo inicial do banco de horas (hh:mm, use - se negativo)</span><input name="saldoInicial" value="${minToHHMM(+s.saldoInicial || 0)}" placeholder="00:00"></label>
    <label class="field"><span>Tempo de almoço padrão (min)</span><input type="number" name="almoco" value="${s.almoco}"></label>
    <label class="field"><span>Tolerância diária (min)</span><input type="number" name="tolerancia" value="${s.tolerancia}"></label>
    <div class="field wide"><span>Jornada por dia (horas:minutos de trabalho, sem almoço)</span><div class="checks">${DIAS_LONGOS.map((dn, i) => `<label class="field" style="width:110px"><span>${dn}</span><input type="time" name="j${i}" value="${minToHHMM(s.jornada[i] || 0)}"></label>`).join('')}</div></div>
    <div class="field wide"><span>Metas semanais em horas (aparecem em "Equilíbrio da semana")</span><div class="checks">${Object.entries(CATS).map(([k, c]) => `<label class="field" style="width:140px"><span>${c.n}</span><input type="number" step="0.5" min="0" name="m_${k}" value="${s.metas?.[k] ?? ''}"></label>`).join('')}</div></div>
    <div class="form-actions"><span class="sp"></span><button class="btn primary">Salvar ajustes</button></div></div></form>
    ${lembretesHTML()}
    ${syncHTML()}
    ${iaHTML()}
    <div class="card section"><h3 style="margin-bottom:6px">Backup dos dados</h3><p class="muted small">Seus dados ficam salvos só neste navegador. Exporte um backup de vez em quando e importe para usar em outro aparelho.</p>
    <div class="btns"><button class="btn primary" data-act="exportar">Exportar backup</button><button class="btn" data-act="importar">Importar backup</button><button class="btn danger" data-act="apagarTudo">Apagar tudo</button></div></div>`;
};
function ligarConfig() {
  ligarLembretes(); ligarIA(); atualizarSyncUI();
  const f = $('#cfg'); if (!f) return;
  f.onsubmit = e => {
    e.preventDefault();
    const s = S.settings, el = f.elements;
    s.nome = el.nome.value.trim() || 'Fábio';
    s.saldoInicial = toMin(el.saldoInicial.value) || 0;
    s.almoco = +el.almoco.value || 0; s.tolerancia = +el.tolerancia.value || 0;
    s.jornada = DIAS.map((_, i) => toMin(el['j' + i].value) || 0);
    s.metas = {}; for (const k of Object.keys(CATS)) { const v = +el['m_' + k].value; if (v > 0) s.metas[k] = v; }
    save(); toast('Ajustes salvos');
  };
}

// ================= lembretes no iPhone (via Google Agenda) =================
const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
function defLembretes() {
  return {
    ponto: { on: false, e1: '08:00', s1: '12:00', e2: '13:00', s2: '17:00', ids: [] },
    feira: { on: false, dia: '6', hora: '07:30', ids: [] },
    tarefas: { on: false, hora: '19:00', ids: [] },
    prazos: { on: false, ids: [] },
  };
}
function proximaData(dias, hhmm) {
  const agora = new Date(), min = toMin(hhmm);
  for (let i = 0; i < 8; i++) {
    const d = addDays(agora, i);
    if (!dias.includes(d.getDay())) continue;
    if (i === 0 && min <= agora.getHours() * 60 + agora.getMinutes()) continue;
    return iso(d);
  }
  return iso(agora);
}
const somaMin = (hhmm, n) => fmtHora(toMin(hhmm) + n);
async function gcCriar({ titulo, data, hora, dias, antes = 0 }) {
  const input = {
    summary: '⏰ ' + titulo, description: 'Lembrete criado pelo app Meu dia a dia. Para parar, desligue em Ajustes no app.',
    startTime: `${data}T${hora}:00`, endTime: `${data}T${somaMin(hora, 5)}:00`,
    overrideReminders: [{ method: 'popup', minutes: antes }], useDefaultReminders: false,
    availability: 'AVAILABILITY_FREE', notificationLevel: 'NONE',
  };
  if (dias) input.recurrenceData = ['RRULE:FREQ=WEEKLY;BYDAY=' + dias.map(d => BYDAY[d]).join(',')];
  const r = await mcpApi.callTool(GCAL, 'create_event', input, { cache: false });
  const pl = (r && r.payload) || {};
  return pl.id || (pl.event && pl.event.id) || null;
}
async function gcApagar(id) {
  try { await mcpApi.callTool(GCAL, 'delete_event', { eventId: id, notificationLevel: 'NONE' }, { cache: false }); }
  catch (e) { if (e && e.code !== 'tool_error') throw e; } // tool_error: já não existe
}
const PUSH_PUBLIC = 'BGXe3EXAwHodbQcgqXHow0tC4FKPs3QuqoYd4vNTL3LIJwQ1GXqpQrGvXoD3tItyIqNGvN9Vb6MI5_aCdX4PPso'; // chave pública VAPID do servidor de lembretes
const ehIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
const instalado = () => window.navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
const pushSuportado = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && (location.protocol === 'https:' || location.hostname === 'localhost');
function lembTogglesHTML(L) {
  const diasTrab = S.settings.jornada.map((m, i) => m ? DIAS[i] : null).filter(Boolean).join(', ') || 'nenhum';
  const chk = (k, txt) => `<label class="chk"><input type="checkbox" id="l-${k}" ${L[k].on ? 'checked' : ''}> <b>${txt}</b></label>`;
  const hora = (id, v, lbl) => `<label class="field" style="width:110px"><span>${lbl}</span><input type="time" id="${id}" value="${v}"></label>`;
  return `<div class="list" style="gap:14px">
    <div>${chk('ponto', 'Bater ponto')} <span class="muted small">nos dias de expediente (${diasTrab})</span>
      <div class="checks" style="margin-top:6px">${hora('l-e1', L.ponto.e1, 'Entrada')}${hora('l-s1', L.ponto.s1, 'Saída almoço')}${hora('l-e2', L.ponto.e2, 'Volta almoço')}${hora('l-s2', L.ponto.s2, 'Saída')}</div></div>
    <div>${chk('feira', 'Lista da feira')} <span class="muted small">lembrete para conferir a lista antes de sair</span>
      <div class="checks" style="margin-top:6px"><label class="field" style="width:140px"><span>Dia</span><select id="l-fdia">${DIAS_LONGOS.map((d, i) => `<option value="${i}"${String(i) === String(L.feira.dia) ? ' selected' : ''}>${d}</option>`).join('')}</select></label>${hora('l-fhora', L.feira.hora, 'Horário')}</div></div>
    <div>${chk('tarefas', 'Tarefas de casa')} <span class="muted small">um aviso por dia para ver as tarefas pendentes</span>
      <div class="checks" style="margin-top:6px">${hora('l-thora', L.tarefas.hora, 'Horário')}</div></div>
    <div>${chk('prazos', 'Prazos de freela e próximos passos de vagas')} <span class="muted small">avisa às 9h do dia e 1 dia antes</span></div>
  </div>`;
}
const lerLembretes = () => ({
  ponto: { on: $('#l-ponto').checked, e1: $('#l-e1').value, s1: $('#l-s1').value, e2: $('#l-e2').value, s2: $('#l-s2').value },
  feira: { on: $('#l-feira').checked, dia: $('#l-fdia').value, hora: $('#l-fhora').value },
  tarefas: { on: $('#l-tarefas').checked, hora: $('#l-thora').value },
  prazos: { on: $('#l-prazos').checked },
});
function lembretesHTML() {
  const L = S.lembretes;
  if (mcpApi) return `<form class="card section" id="lemb"><h3 style="margin-bottom:6px">Notificações no iPhone</h3>
  <p class="muted small" style="margin-top:0">Os avisos chegam pelo app <b>Google Agenda</b> no iPhone: o app cria lembretes (com ⏰ no nome) na sua agenda e o iPhone avisa na hora. Marque só o que quiser receber. Desmarcar apaga os lembretes da agenda. No iPhone, deixe as notificações do Google Agenda ligadas em Ajustes > Notificações.</p>
  ${lembTogglesHTML(L)}
  <p class="small muted" id="l-status" style="margin:10px 0 0"></p>
  <div class="form-actions"><span class="sp"></span><button class="btn primary">Salvar notificações</button></div></form>`;
  if (!pushSuportado()) return `<div class="card section"><h3 style="margin-bottom:6px">Notificações</h3>${ehIOS && !instalado()
    ? '<p class="small" style="margin:0">Para receber notificações no iPhone: abra este site no <b>Safari</b>, toque em <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b>. Abra o app pelo ícone novo e volte aqui.</p>'
    : '<p class="small muted" style="margin:0">Este navegador não recebe notificações do app.</p>'}</div>`;
  const perm = Notification.permission, ativo = !!(S.push && S.push.sub);
  const estado = perm === 'denied' ? '<span class="neg">Bloqueadas. Para liberar: Ajustes do iPhone > Notificações > Meu dia.</span>'
    : ativo && perm === 'granted' ? '<span class="pos">Ativadas neste aparelho.</span>' : '<span class="muted">Ainda não ativadas neste aparelho.</span>';
  return `<form class="card section" id="lemb"><h3 style="margin-bottom:6px">Notificações</h3>
  <p class="small" style="margin-top:0">${estado}</p>
  <div class="btns" style="margin-bottom:14px">${ativo && perm === 'granted'
    ? '<button type="button" class="btn" data-act="testarPush">Enviar notificação de teste</button><button type="button" class="btn danger" data-act="desativarPush">Desativar neste aparelho</button>'
    : perm === 'denied' ? '' : '<button type="button" class="btn primary" data-act="ativarPush">Ativar notificações</button>'}</div>
  ${lembTogglesHTML(L)}
  ${ghHTML()}
  <p class="small muted" id="l-status" style="margin:6px 0 0"></p>
  <div class="form-actions"><span class="sp"></span><button class="btn primary" ${ativo ? '' : 'disabled'}>Salvar notificações</button></div></form>`;
}
function b64urlParaBytes(b64) {
  const pad = '='.repeat((4 - b64.length % 4) % 4), bin = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}
async function ativarPush() {
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { toast('Notificações não permitidas'); render(); return; }
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64urlParaBytes(PUSH_PUBLIC) });
    S.push = { sub: sub.toJSON(), em: new Date().toISOString() }; save(); render(); toast('Notificações ativadas');
  } catch (e) { toast('Não consegui ativar: ' + (e.message || e)); }
}
async function desativarPush() {
  try { const reg = await navigator.serviceWorker.ready; const sub = await reg.pushManager.getSubscription(); if (sub) await sub.unsubscribe(); } catch (e) { /* segue */ }
  S.push = null; save(); render(); toast('Notificações desativadas neste aparelho');
}
async function testarPush() {
  try { const reg = await navigator.serviceWorker.ready; await reg.showNotification('Meu dia a dia', { body: 'As notificações estão funcionando ✅', icon: 'icons/icon-192.png' }); }
  catch (e) { toast('Não consegui mostrar: ' + (e.message || e)); }
}
// ---- lembretes salvos direto no GitHub (app instalado) ----
// O app cifra a configuração com a chave PÚBLICA do servidor (ECDH P-256 + AES-GCM) e grava
// servidor/lembretes.enc no repositório com um token do Fábio (guardado só neste aparelho).
const GH_KEY = 'meu-dia-a-dia:gh', GH_ULT = 'meu-dia-a-dia:gh-ult';
const ghCfg = () => { try { return JSON.parse(localStorage.getItem(GH_KEY)) || {}; } catch (e) { return {}; } };
const ghRepo = () => /\.github\.io$/.test(location.hostname) ? `${location.hostname.split('.')[0]}/${location.pathname.split('/')[1]}` : 'fabioricardo1908-commits/meu-dia-a-dia';
const bytesB64 = u => { let s = ''; for (const b of u) s += String.fromCharCode(b); return btoa(s); };
async function cifrarParaServidor(texto) {
  const pub = await crypto.subtle.importKey('raw', b64urlParaBytes(PUSH_PUBLIC), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ef = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const seg = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: pub }, ef.privateKey, 256));
  const pre = new TextEncoder().encode('lembretes:'), mat = new Uint8Array(pre.length + seg.length); mat.set(pre); mat.set(seg, pre.length);
  const chave = await crypto.subtle.importKey('raw', await crypto.subtle.digest('SHA-256', mat), 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, chave, new TextEncoder().encode(texto)));
  const efPub = new Uint8Array(await crypto.subtle.exportKey('raw', ef.publicKey));
  const tudo = new Uint8Array(65 + 12 + ct.length); tudo.set(efPub); tudo.set(iv, 65); tudo.set(ct, 77);
  return 'E1:' + bytesB64(tudo);
}
async function ghApi(caminho, opt = {}, token = ghCfg().token) {
  let r;
  try { r = await fetch(`https://api.github.com/repos/${ghRepo()}${caminho ? '/' + caminho : ''}`, { ...opt, headers: { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + token, 'X-GitHub-Api-Version': '2022-11-28', ...(opt.headers || {}) } }); }
  catch (e) { throw { code: 'rede' }; }
  if (r.status === 404 && opt.ok404) return null;
  if (!r.ok) throw { code: r.status === 401 ? 'token' : r.status === 403 || r.status === 404 ? 'permissao' : r.status === 409 ? 'conflito' : 'erro', status: r.status };
  return r.json();
}
const GH_MSG = { token: 'O GitHub não aceitou o token (expirado ou errado). Cole um novo.', permissao: 'O token não tem permissão para gravar no repositório meu-dia-a-dia. Confira o passo 3.', rede: 'Sem internet agora. Os avisos serão atualizados quando a conexão voltar.', conflito: 'O GitHub estava ocupado. Tente salvar de novo.', erro: 'O GitHub deu erro ao salvar. Tente de novo daqui a pouco.' };
let ghEnviando = null;
async function sincronizarLembretes(forcar) {
  if (window.claude || !ghCfg().token || !S.push || !S.push.sub) return false;
  const texto = codigoLembretes();
  let ult = ''; try { ult = localStorage.getItem(GH_ULT) || ''; } catch (e) { }
  if (!forcar && ult === texto) return true;
  if (ghEnviando) return ghEnviando;
  ghEnviando = (async () => {
    try {
      const enc = await cifrarParaServidor(texto);
      for (let tent = 0; tent < 2; tent++) {
        const atual = await ghApi('contents/servidor/lembretes.enc?ref=main', { ok404: true });
        try {
          await ghApi('contents/servidor/lembretes.enc', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'Atualiza lembretes (pelo app)', content: btoa(enc + '\n'), branch: 'main', ...(atual ? { sha: atual.sha } : {}) }) });
          break;
        } catch (e) { if (e.code !== 'conflito' || tent) throw e; }
      }
      try { localStorage.setItem(GH_ULT, texto); } catch (e) { }
      return true;
    } finally { ghEnviando = null; }
  })();
  return ghEnviando;
}
let ghTimer = null;
function agendarSync() { if (window.claude || !ghCfg().token) return; clearTimeout(ghTimer); ghTimer = setTimeout(() => sincronizarLembretes(false).catch(() => { }), 4000); }
// ================= sincronização entre aparelhos =================
// Os dados vão cifrados (AES-GCM, chave que só os seus aparelhos têm) para o ramo "dados" do repositório,
// pelo mesmo token do GitHub dos lembretes. Cada aparelho junta as mudanças dele com as dos outros (merge de 3 vias).
const SYNC_KEY = 'meu-dia-a-dia:sync', SYNC_RAMO = 'dados', SYNC_ARQ = 'dados/meu-dia.enc';
const SO_NESTE_APARELHO = ['push']; // a inscrição de notificações é de cada aparelho
const syncCfg = () => { try { return JSON.parse(localStorage.getItem(SYNC_KEY)) || {}; } catch (e) { return {}; } };
const setSyncCfg = o => { try { localStorage.setItem(SYNC_KEY, JSON.stringify(o)); } catch (e) { } };
const b64Bytes = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const objPuro = x => x && typeof x === 'object' && !Array.isArray(x);
const listaComId = x => Array.isArray(x) && x.every(i => objPuro(i) && i.id != null);
// junta base (último estado em comum), local e remoto; quando os dois mudaram a mesma coisa, vale o local (prefLocal) ou o remoto
function juntar(b, l, r, prefLocal) {
  if (igual(l, r)) return l;
  if (igual(b, l)) return r;
  if (igual(b, r)) return l;
  if (objPuro(l) && objPuro(r)) {
    const o = {};
    for (const k of new Set([...Object.keys(r), ...Object.keys(l)])) { const v = juntar(objPuro(b) ? b[k] : undefined, l[k], r[k], prefLocal); if (v !== undefined) o[k] = v; }
    return o;
  }
  if (listaComId(l) && listaComId(r)) {
    const m = a => new Map((listaComId(a) ? a : []).map(i => [String(i.id), i])), bm = m(b), lm = m(l), rm = m(r), out = [];
    for (const id of new Set([...rm.keys(), ...lm.keys()])) { const v = juntar(bm.get(id), lm.get(id), rm.get(id), prefLocal); if (v !== undefined) out.push(v); }
    return out;
  }
  return prefLocal ? l : r;
}
const semLocais = o => { const c = JSON.parse(JSON.stringify(o)); for (const k of SO_NESTE_APARELHO) delete c[k]; return c; };
async function chaveDados(b64) { return crypto.subtle.importKey('raw', b64Bytes(b64), 'AES-GCM', false, ['encrypt', 'decrypt']); }
async function cifrarDados(obj, k) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await chaveDados(k), new TextEncoder().encode(JSON.stringify(obj))));
  const t = new Uint8Array(12 + ct.length); t.set(iv); t.set(ct, 12); return 'D1:' + bytesB64(t);
}
async function decifrarDados(txt, k) {
  const t = b64Bytes(txt.trim().replace(/^D1:/, ''));
  try { return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: t.subarray(0, 12) }, await chaveDados(k), t.subarray(12)))); }
  catch (e) { throw { code: 'chave_dados' }; }
}
async function lerRemoto() {
  const j = await ghApi(`contents/${SYNC_ARQ}?ref=${SYNC_RAMO}`, { ok404: true });
  if (!j) return null;
  let txt = j.content ? new TextDecoder().decode(b64Bytes(j.content.replace(/\s/g, ''))) : await (await fetch(j.download_url, { cache: 'no-store' })).text();
  return { sha: j.sha, txt };
}
async function garantirRamo() {
  if (await ghApi(`git/ref/heads/${SYNC_RAMO}`, { ok404: true })) return;
  const main = await ghApi('git/ref/heads/main');
  await ghApi('git/refs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ref: 'refs/heads/' + SYNC_RAMO, sha: main.object.sha }) });
}
let sincronizando = null, syncStatus = '';
function sincronizar() {
  const cfg = syncCfg();
  if (window.claude || !cfg.chave || !ghCfg().token) return Promise.resolve(false);
  if (sincronizando) return sincronizando;
  sincronizando = (async () => {
    try {
      for (let tent = 0; tent < 3; tent++) {
        const c = syncCfg(), rem = await lerRemoto(), local = semLocais(S), base = c.base ? JSON.parse(c.base) : undefined;
        const remObj = !rem ? null : rem.sha === c.sha && base ? base : await decifrarDados(rem.txt, c.chave);
        const junto = remObj ? juntar(base, local, remObj, base !== undefined) : local;
        if (!igual(junto, local)) {
          const meus = Object.fromEntries(SO_NESTE_APARELHO.map(k => [k, S[k]]));
          S = Object.assign(junto, meus); carregarDe(S); salvarLocal();
          if (!dlg.open && !$('#dlg2').open && !document.activeElement?.matches?.('input,textarea,select')) render();
        }
        let sha = rem && rem.sha;
        if (!remObj || !igual(junto, remObj)) {
          if (!rem) await garantirRamo();
          try {
            const r = await ghApi(`contents/${SYNC_ARQ}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: 'Dados do app (sincronização)', content: btoa(await cifrarDados(junto, c.chave)), branch: SYNC_RAMO, ...(sha ? { sha } : {}) }) });
            sha = r.content.sha;
          } catch (e) { if ((e.code === 'conflito' || e.status === 422) && tent < 2) continue; throw e; }
        }
        setSyncCfg({ ...syncCfg(), base: JSON.stringify(junto), sha, em: new Date().toISOString() });
        syncStatus = ''; atualizarSyncUI(); return true;
      }
    } catch (e) {
      syncStatus = e.code === 'chave_dados' ? 'Os dados no GitHub são de outra chave. Conecte este aparelho com o código de outro aparelho.' : GH_MSG[e.code] || GH_MSG.erro;
      atualizarSyncUI(); throw e;
    } finally { sincronizando = null; }
  })();
  return sincronizando;
}
let syncTimer = null;
function agendarDados() { if (window.claude || !syncCfg().chave) return; clearTimeout(syncTimer); syncTimer = setTimeout(() => sincronizar().catch(() => { }), 2500); }
const codigoConexao = () => 'MDS1.' + btoa(JSON.stringify({ t: ghCfg().token, k: syncCfg().chave })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function conectarComCodigo(txt) {
  const m = String(txt || '').match(/MDS1\.([A-Za-z0-9_-]+)/);
  if (!m) throw { code: 'codigo' };
  let o; try { o = JSON.parse(atob(m[1].replace(/-/g, '+').replace(/_/g, '/'))); } catch (e) { throw { code: 'codigo' }; }
  if (!o.t || !o.k) throw { code: 'codigo' };
  try { localStorage.setItem(GH_KEY, JSON.stringify({ token: o.t })); localStorage.removeItem(GH_ULT); } catch (e) { }
  setSyncCfg({ chave: o.k }); // sem base: na primeira vez vale o que está no GitHub, e o que só existe aqui é somado
  await sincronizar();
}
async function ligarPrimeiro() {
  if (await lerRemoto()) throw { code: 'ja_existe' };
  setSyncCfg({ chave: bytesB64(crypto.getRandomValues(new Uint8Array(32))) });
  await sincronizar();
}
function atualizarSyncUI() {
  const el = $('#sync-st'); if (!el) return;
  const c = syncCfg();
  el.className = 'small ' + (syncStatus ? 'neg' : 'muted');
  el.textContent = syncStatus || (c.em ? `Última sincronização: ${new Date(c.em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : '');
}
function syncHTML() {
  if (window.claude) return `<div class="card section"><h3 style="margin-bottom:6px">Sincronizar aparelhos</h3><p class="small muted" style="margin:0">A sincronização funciona no app do GitHub (fabioricardo1908-commits.github.io/meu-dia-a-dia). Por este link do Claude os dados ficam só aqui.</p></div>`;
  const c = syncCfg(), tk = ghCfg().token;
  if (c.chave && tk) return `<div class="card section" id="sync"><h3 style="margin-bottom:6px">Sincronizar aparelhos <span class="tag ok">ligado</span></h3>
    <p class="small" style="margin:0 0 8px">Tudo o que você muda aqui vai para os outros aparelhos sozinho, e o que muda lá aparece aqui quando você abre o app.</p>
    <p id="sync-st" class="small muted" style="margin:0 0 10px"></p>
    <div class="btns"><button type="button" class="btn" data-act="syncAgora">Sincronizar agora</button><button type="button" class="btn primary" data-act="syncOutro">Conectar outro aparelho</button><button type="button" class="btn danger" data-act="syncDesligar">Desligar</button></div></div>`;
  return `<div class="card section" id="sync"><h3 style="margin-bottom:6px">Sincronizar aparelhos</h3>
    <p class="small" style="margin:0 0 10px">Deixe iPhone, computador e outros aparelhos sempre com os mesmos dados. Eles ficam guardados cifrados no seu GitHub.</p>
    <b class="small">Já usa a sincronização em outro aparelho?</b>
    <p class="small muted" style="margin:2px 0 6px">Lá, em Ajustes, toque em "Conectar outro aparelho", copie o código e cole aqui.</p>
    <div class="gh-linha"><input id="sync-cod" autocomplete="off" placeholder="MDS1...."><button type="button" class="btn primary" data-act="syncCodigo">Conectar</button></div>
    <b class="small" style="display:block;margin-top:14px">É o primeiro aparelho?</b>
    ${tk ? `<p class="small muted" style="margin:2px 0 6px">Os dados deste aparelho viram a base para os outros.</p><button type="button" class="btn" data-act="syncPrimeiro">Ligar a sincronização aqui</button>`
      : `<p class="small muted" style="margin:2px 0 0">Primeiro ligue ao GitHub no card de Notificações acima (o mesmo token serve para os dois).</p>`}
    <p id="sync-st" class="small neg" style="margin:8px 0 0"></p></div>`;
}
const SYNC_MSG = { codigo: 'Código inválido. Copie de novo o código inteiro do outro aparelho.', ja_existe: 'Já existem dados de outro aparelho no GitHub. Use o código de conexão de lá.' };
function ghHTML() {
  if (ghCfg().token) return `<p class="small" style="margin:10px 0 0">🔗 Ligado ao GitHub: ao salvar, os avisos passam a valer sozinhos em até 5 minutos. <button type="button" class="mini" data-act="desligarGH">desligar</button></p>`;
  const novo = 'https://github.com/settings/personal-access-tokens/new?name=Meu+dia+a+dia+-+lembretes&description=App+grava+os+lembretes&contents=write';
  return `<div class="gh-box"><b>Ligar ao GitHub (uma vez só)</b>
    <ol class="small" style="margin:6px 0;padding-left:18px">
      <li>Abra <a href="${novo}" target="_blank" rel="noopener">github.com › novo token</a> (entre na sua conta se pedir).</li>
      <li>Em <b>Expiration</b>, escolha <b>No expiration</b> (ou o maior prazo).</li>
      <li>Em <b>Repository access</b>, marque <b>Only select repositories</b> e escolha <b>meu-dia-a-dia</b>. Em <b>Permissions › Repository permissions › Contents</b>, escolha <b>Read and write</b>.</li>
      <li>Toque em <b>Generate token</b>, copie e cole aqui:</li>
    </ol>
    <div class="gh-linha"><input id="gh-token" type="password" autocomplete="off" placeholder="github_pat_..."><button type="button" class="btn primary" data-act="salvarGH">Ligar</button></div>
    <p class="small muted" style="margin:6px 0 0">O token fica salvo só neste aparelho e só consegue mexer no repositório do app.</p></div>`;
}
function codigoLembretes() {
  const L = S.lembretes, h = hoje(), prazos = [];
  if (L.prazos.on) {
    for (const fr of S.freelas) if (['orcamento', 'andamento'].includes(fr.status) && fr.prazo && fr.prazo >= h) prazos.push({ t: 'Entrega do freela: ' + fr.projeto, d: fr.prazo });
    for (const v of S.vagas) if (v.status !== 'encerrada' && v.proximoData && v.proximoData >= h) prazos.push({ t: `${v.proximo || 'Próximo passo'}: ${v.empresa}`, d: v.proximoData });
  }
  const cfg = {
    v: 1, tz: 'America/Fortaleza', sub: S.push.sub,
    ponto: L.ponto.on ? { dias: S.settings.jornada.map((m, i) => m ? i : -1).filter(i => i >= 0), horas: MARCAS.map(([k, n]) => [L.ponto[k], 'Bater ponto: ' + n]).filter(x => x[0]) } : null,
    feira: L.feira.on ? { dia: +L.feira.dia, hora: L.feira.hora } : null,
    tarefas: L.tarefas.on ? { hora: L.tarefas.hora } : null,
    prazos: prazos.slice(0, 30),
  };
  return 'MDD1:' + btoa(unescape(encodeURIComponent(JSON.stringify(cfg))));
}
let salvandoLemb = false;
function ligarLembretes() {
  const f = $('#lemb'); if (!f) return;
  f.onsubmit = async e => {
    e.preventDefault();
    if (salvandoLemb) return;
    const L = S.lembretes, st = $('#l-status'), btn = f.querySelector('button.primary:not([type=button])');
    const novo = lerLembretes();
    if (!mcpApi) {
      if (!S.push || !S.push.sub) return;
      for (const k of Object.keys(novo)) Object.assign(L[k], novo[k]);
      save();
      if (!ghCfg().token) { st.className = 'small warn'; st.textContent = 'Escolhas salvas. Falta ligar ao GitHub (acima) para os avisos começarem.'; $('#gh-token')?.focus(); return; }
      salvandoLemb = true; btn.disabled = true; st.className = 'small muted'; st.textContent = 'Salvando no servidor…';
      try { await sincronizarLembretes(true); st.className = 'small pos'; st.textContent = 'Pronto! Os avisos passam a valer em até 5 minutos.'; }
      catch (err) { st.className = 'small neg'; st.textContent = GH_MSG[err && err.code] || GH_MSG.erro; }
      salvandoLemb = false; btn.disabled = false;
      return;
    }
    salvandoLemb = true; btn.disabled = true; st.className = 'small muted'; st.textContent = 'Atualizando sua agenda…';
    let semId = 0;
    const guardar = (k, id) => { if (id) L[k].ids.push(id); else semId++; save(); };
    try {
      for (const k of Object.keys(novo)) {
        const mudou = JSON.stringify({ ...L[k], ids: undefined }) !== JSON.stringify(novo[k]);
        if (!mudou && k !== 'prazos') continue;
        while (L[k].ids.length) { await gcApagar(L[k].ids[0]); L[k].ids.shift(); save(); }
        Object.assign(L[k], novo[k]); save();
        if (!novo[k].on) continue;
        if (k === 'ponto') {
          const dias = S.settings.jornada.map((m, i) => m ? i : -1).filter(i => i >= 0);
          if (!dias.length) continue;
          for (const [kk, nome] of MARCAS) if (novo.ponto[kk]) guardar(k, await gcCriar({ titulo: 'Bater ponto: ' + nome, data: proximaData(dias, novo.ponto[kk]), hora: novo.ponto[kk], dias }));
        } else if (k === 'feira') {
          const d = [+novo.feira.dia];
          guardar(k, await gcCriar({ titulo: 'Conferir a lista da feira', data: proximaData(d, novo.feira.hora), hora: novo.feira.hora, dias: d }));
        } else if (k === 'tarefas') {
          guardar(k, await gcCriar({ titulo: 'Tarefas de casa de hoje', data: proximaData([0, 1, 2, 3, 4, 5, 6], novo.tarefas.hora), hora: novo.tarefas.hora, dias: [0, 1, 2, 3, 4, 5, 6] }));
        } else if (k === 'prazos') {
          const h = hoje(), itens = [];
          for (const fr of S.freelas) if (['orcamento', 'andamento'].includes(fr.status) && fr.prazo && fr.prazo >= h) itens.push(['Entrega do freela: ' + fr.projeto, fr.prazo]);
          for (const v of S.vagas) if (v.status !== 'encerrada' && v.proximoData && v.proximoData >= h) itens.push([`${v.proximo || 'Próximo passo'}: ${v.empresa}`, v.proximoData]);
          for (const [t, d] of itens.slice(0, 20)) guardar(k, await gcCriar({ titulo: t, data: d, hora: '09:00', antes: d > h ? 1440 : 0 }));
        }
      }
      st.className = 'small pos'; st.textContent = 'Notificações atualizadas na sua agenda.' + (semId ? ` (${semId} lembrete(s) criados sem identificação: se desligar, apague-os no Google Agenda.)` : '');
    } catch (err) {
      st.className = 'small neg';
      st.textContent = msgErroGoogle(err) + ' Alguns lembretes podem já ter sido criados; confira o Google Agenda antes de tentar de novo.';
    }
    salvandoLemb = false; btn.disabled = false;
  };
}

// ================= roteamento =================
function render() {
  const r = (location.hash.replace('#/', '') || 'painel');
  const rota = V[r] ? r : 'painel';
  document.querySelectorAll('#menu a').forEach(a => a.classList.toggle('active', a.dataset.r === rota));
  rotaAtual = rota;
  $('#view').innerHTML = V[rota]();
  if (rota === 'config') ligarConfig();
  if (rota === 'carro') ligarCarro();
}
window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
// atualiza relógio do painel a cada minuto (sem atrapalhar formulários abertos)
setInterval(() => { const r = location.hash.replace('#/', '') || 'painel'; if (r === 'painel' && !dlg.open) render(); }, 60000);
// App instalado (GitHub Pages): modo offline e notificações
if (!window.claude && 'serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  const tinhaSW = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => r.update()).catch(() => {});
  // versão nova instalada: recarrega uma vez para já usar o código novo
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (tinhaSW && !dlg.open && !recarregou) { recarregou = true; location.reload(); } });
}
var recarregou = false;
setTimeout(() => sincronizarLembretes(false).catch(() => { }), 3000); // prazos do dia
// traz o que mudou nos outros aparelhos: ao abrir, ao voltar para o app e a cada 2 minutos com ele aberto
setTimeout(() => sincronizar().catch(() => { }), 800);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sincronizar().catch(() => { }); });
setInterval(() => { if (document.visibilityState === 'visible') sincronizar().catch(() => { }); }, 120000);
// Google Agenda: só funciona quando o app é aberto pelo Claude (conector do Google Agenda)
// Nota fiscal por foto: só quando o app é aberto pelo Claude
(async () => {
  try {
    if (!window.claude || !window.claude.use) { nfEstado = 'pwa'; return; }
    const sp = await window.claude.use('sample');
    const lim = sp ? await sp.limits().catch(() => null) : null;
    if (sp && lim && lim.images) { sampleApi = sp; sampleImg = lim.images; nfEstado = 'ok'; } else nfEstado = 'off';
  } catch (e) { nfEstado = 'off'; }
  if (!dlg.open) render();
})();
(async () => {
  try {
    if (!window.claude || !window.claude.use) return;
    const m = await window.claude.use('mcp');
    if (!m) return;
    mcpApi = m; if (!dlg.open) render();
    const perms = await window.claude.use('permissions');
    const st = perms ? await perms.state('mcp:' + GCAL).catch(() => 'unavailable') : 'unavailable';
    const velho = !S.google.sync || Date.now() - Date.parse(S.google.sync) > 30 * 60e3;
    if (st === 'granted' && velho) syncGoogle(false);
  } catch (e) { /* segue sem Google */ }
})();
render();
