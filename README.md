# Meu dia a dia

App pessoal que roda no navegador, sem servidor e sem login. Os dados ficam salvos no próprio navegador (localStorage).

## Como abrir
- **No computador:** dê dois cliques em `index.html`.
- **Hospedado (para usar no celular também):** suba os 3 arquivos (`index.html`, `styles.css`, `app.js`) em qualquer hospedagem estática:
  - **Netlify Drop:** arraste a pasta em https://app.netlify.com/drop (mais rápido).
  - **GitHub Pages:** crie um repositório, envie os arquivos e ative Pages em Settings > Pages.
  - **Vercel:** `vercel deploy` na pasta, ou importe o repositório.

## Módulos
| Tela | O que faz |
|---|---|
| Painel | Resumo do dia: ponto, agenda, tarefas, feira, próximos 7 dias, equilíbrio da semana |
| Agenda | Semana com compromissos e rotina fixa (repetição diária/semanal), horas por área |
| Ponto | Entrada, almoço, volta e saída; saída prevista; saldo do mês e banco de horas; exporta CSV |
| Tarefas | Tarefas da casa e pessoais, avulsas ou repetindo todo dia/semana/mês |
| Feira | Estoque estimado, consumo por semana, quando acaba, lista de compras (copia p/ WhatsApp), gastos, leitura da nota fiscal por foto |
| Combustível | Abastecimentos, gasto por mês, consumo em km/L e R$/km (método do tanque cheio), previsão do próximo abastecimento, calculadora gasolina × etanol |
| Música | Cultos, ensaios e shows (categorias Igreja/Banda) e repertório por status, tom e instrumento |
| Habilidades | Habilidades, nível, atividades que pode oferecer e resumo pronto para currículo |
| Freelas | Projetos fora da Vasta, prazos, a receber, recebido, valor/hora real |
| Vagas | Quadro de candidaturas por etapa com próximo passo |
| Ajustes | Jornada por dia, almoço, tolerância, saldo inicial, metas semanais, backup |

## Como funcionam os cálculos
- **Ponto:** trabalhado = (saída almoço − entrada) + (saída − volta). Saldo = trabalhado − jornada do dia. Diferenças até a tolerância (padrão 10 min) viram zero. Só dias fechados entram no banco.
- **Feira:** o consumo semanal é calculado pelo intervalo entre compras (precisa de 2 compras), ou pelo valor que você informar no item. O estoque vai sendo descontado sozinho com o passar dos dias. Fica "Acabando" com 7 dias ou menos (ou abaixo do mínimo).

## Nota fiscal por foto
Em **Feira > 📷 Ler nota fiscal**, tire uma foto do cupom (ou 2 a 3 fotos se for comprido). O Claude lê a imagem e devolve loja, data, itens, quantidades e valores; você confere numa tela de revisão (pode desmarcar, corrigir e ligar cada linha a um item do estoque ou criar um novo) e registra. Pelo link do Claude, usa o seu limite de uso do Claude (pede permissão na primeira vez). No app do GitHub Pages, cole uma chave de IA em **Ajustes > Leitura da nota fiscal**: Gemini (grátis, criada em https://aistudio.google.com/apikey) ou Claude (API da Anthropic, paga por uso). A chave fica só no aparelho (localStorage `meu-dia-a-dia:ia`) e não entra no backup.

## Sincronizar aparelhos
Em **Ajustes > Sincronizar aparelhos** (app do GitHub Pages). Usa o mesmo token do GitHub das notificações.
- No primeiro aparelho: "Ligar a sincronização aqui". Nos outros: "Conectar outro aparelho" no primeiro, copiar o código `MDS1.` e colar no novo (o código leva o token e a chave; não compartilhe).
- Os dados vão cifrados (AES-256-GCM, chave aleatória que só os aparelhos têm) para `dados/meu-dia.enc` no ramo `dados` (fora do `main`, para não republicar o site a cada mudança).
- Sincroniza ao abrir, ao voltar para o app, a cada 2 minutos e logo depois de cada mudança. Cada aparelho junta as mudanças com as dos outros (merge de 3 vias por item); se os dois mudaram o mesmo item, vale a mudança mais recente.
- A inscrição de notificações (`push`) fica só em cada aparelho. Não funciona pelo link do Claude.

## Importante: backup
Os dados ficam só no navegador onde você usa. Em **Ajustes > Exportar backup** você baixa um arquivo `.json`; use **Importar backup** para levar tudo para outro aparelho. Limpar os dados do navegador apaga o app.

## App na tela inicial do iPhone (com notificações)
Versão hospedada no GitHub Pages, instalável pelo Safari (Compartilhar > Adicionar à Tela de Início, iOS 16.4 ou mais novo).
- `manifest.webmanifest`, `icons/` e `sw.js` fazem o app abrir em tela cheia, funcionar offline e receber notificações.
- Em **Ajustes > Notificações**: "Ativar notificações" mostra o "Permitir?" do iPhone. Marque os lembretes e toque em "Salvar notificações".
- Uma vez só: em "Ligar ao GitHub", cole um token *fine-grained* com acesso apenas a este repositório (Contents: Read and write). O token fica só no aparelho (localStorage `meu-dia-a-dia:gh`).
- Ao salvar (e sempre que prazos de freelas/vagas mudarem), o app cifra a configuração com a chave **pública** VAPID (ECDH P-256 + AES-256-GCM, formato `E1:`) e grava `servidor/lembretes.enc` pela API do GitHub. Só o servidor, com a chave privada no secret `VAPID_PRIVATE_KEY`, consegue abrir.
- `.github/workflows/lembretes.yml` roda `servidor/enviar.mjs` a cada 5 minutos e envia o que estiver na hora (aceita até 30 min de atraso do agendador do GitHub). O que já foi enviado no dia fica no cache do Actions; o workflow não grava no repositório e nunca termina com erro (problemas aparecem no resumo da execução).
- Nesta versão a sincronização com o Google Agenda não funciona (ela depende do conector do Claude). A leitura da nota fiscal funciona com uma chave de IA própria (veja acima).
