'use strict';
/**
 * analistas.js — monta o payload DA (visao por analista).
 *
 * Esta e a unica visao que nao sai do estado atual dos chamados: ela sai do
 * HISTORICO. Quem analisou o que, quando, e quanto tempo a coisa ficou parada
 * sao perguntas sobre transicao, nao sobre campo. Por isso e a parte mais caro
 * de extrair (~40 s, contra ~5 s das outras) e a mais delicada de reproduzir.
 */

const jira = require('./jira');
const D = require('./derive');
const A = require('./aggregate');

const ETAPA_ANALISE = 'análise área responsável';
const ETAPA_CONFERENCIA = 'Conferência supervisão/gerência';

const CAMPOS = ['key', 'status', 'created', D.CAMPO.valorFinal, D.CAMPO.valorInicial];

/**
 * Pagina menor de proposito: com expand=changelog cada issue traz o historico
 * inteiro, e 100 por vez produz resposta de vários MB. 50 e o ponto em que a
 * extracao fica mais rapida na pratica.
 */
const POR_PAGINA = 50;

async function montar(cfg, agora = new Date()) {
  const issues = await jira.buscar(cfg.universo, CAMPOS, {
    rotulo: 'historico',
    expand: 'changelog',
    maxPorPagina: POR_PAGINA,
  });

  await completarTruncados(issues);

  const ciclos = [];
  const areas = [];
  const fila = [];
  const statusAtual = [];

  for (const it of issues) {
    const f = it.fields;
    const valor = A.arredonda(D.valor(f));
    const atual = D.valorDe(f.status);
    statusAtual.push({ key: it.key, name: atual });

    /* O Jira nao garante ordem das histories. Ordenar e obrigatorio: sem isso
       um "saiu da analise" pode ser lido antes do "entrou" correspondente. */
    const hist = (it.changelog?.histories || [])
      .slice()
      .sort((a, b) => Date.parse(a.created) - Date.parse(b.created));

    let entrouEmConferencia = null;
    let autorConferencia = '';

    for (const h of hist) {
      const quem = h.author?.displayName || '(sem autor)';
      const quando = h.created;

      for (const item of h.items || []) {
        const campo = item.fieldId || item.field;

        /* --- ciclo de analise ------------------------------------------- */
        if (campo === 'status') {
          /* O ciclo e contado na SAIDA, e atribuido a quem executou a saida.
             Contar na entrada mediria fila, nao trabalho: um chamado pode
             entrar na analise e ficar meses parado. A saida e o momento em
             que alguem de fato concluiu a analise, e o Jira registra o autor
             da transicao — e esse o dado de produtividade. */
          if (item.fromString === ETAPA_ANALISE) {
            ciclos.push({ key: it.key, analista: quem, mes: D.mes(quando), valor });
          }
          /* Guardamos a ULTIMA entrada na conferencia: se o chamado voltou e
             entrou de novo, o que interessa e desde quando ele esta parado
             agora, nao desde a primeira vez. */
          if (item.toString === ETAPA_CONFERENCIA) {
            entrouEmConferencia = quando;
            autorConferencia = quem;
          }
        }

        /* --- troca de area responsavel ---------------------------------- */
        if (campo === D.CAMPO.areaFalha) {
          const de = D.limpaArea(item.fromString);
          const para = D.limpaArea(item.toString);
          /* Aqui o dado e sujo de verdade: o campo aceita texto livre e ha
             registros com paragrafos de comentario colados dentro dele. Sem
             este filtro o grafico de trocas de area ganha categorias que sao
             frases inteiras — o painel antigo tem exatamente esse defeito. */
          if (areaValida(de) && areaValida(para) && de !== para) {
            areas.push({ autor: quem, de, para, mes: D.mes(quando) });
          }
        }
      }
    }

    /* Fila = o que esta parado na conferencia AGORA. So entra quem esta
       nessa etapa hoje; o historico diz desde quando e por quem. */
    if (atual === ETAPA_CONFERENCIA && entrouEmConferencia) {
      fila.push({
        key: it.key,
        enviadoPor: autorConferencia,
        mesEnvio: D.mes(entrouEmConferencia),
        diasNaFila: D.diasAberto(entrouEmConferencia, agora.getTime()),
        valor,
      });
    }
  }

  return {
    geradoEm: D.carimbo(agora),
    totalFiltro: issues.length,
    /* Quem aparece em destaque na visao. Vem do config, nao do codigo: e nome
       de pessoa ligado a metrica individual de produtividade, dado pessoal
       sujeito a LGPD. Escrito no fonte, iria para o repositorio e ficaria no
       historico do Git para sempre. */
    foco: foco(cfg, ciclos),
    ciclos,
    areas,
    fila,
    /* sem limite: sao 4 status, colapsar nao faz sentido */
    statusAtual: A.groupBy(statusAtual, s => s.name).map(({ name, count }) => ({ name, count })),
  };
}

/**
 * Resolve os analistas em destaque.
 *
 * `cfg.foco` aceita nome completo ou ["nome", "rotulo curto"]. Sem configuracao,
 * o painel destaca os dois com mais ciclos — e um padrao util e, sobretudo,
 * previsivel: nunca destaca alguem por acidente de ordem de dado.
 */
function foco(cfg, ciclos) {
  if (Array.isArray(cfg.foco)) {
    return cfg.foco
      .map(f => (Array.isArray(f) ? { nome: f[0], curto: f[1] || f[0] } : { nome: f, curto: f }))
      .filter(f => f.nome);
  }
  const porAnalista = new Map();
  for (const c of ciclos) porAnalista.set(c.analista, (porAnalista.get(c.analista) || 0) + 1);
  return [...porAnalista.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'))
    .slice(0, 2)
    .map(([nome]) => ({ nome, curto: nome }));
}

/**
 * Um nome de area e curto e de uma linha. Texto colado no campo e longo,
 * tem quebra de linha, ou termina em pergunta. A area real mais comprida em
 * uso e "Corporativo - Atendimento", com 25 caracteres — 40 e folga larga.
 */
function areaValida(s) {
  const t = String(s || '').trim();
  return t.length > 0 && t.length <= 40 && !/[\r\n?]/.test(t);
}

/**
 * O changelog embutido na busca vem cortado em 100 entradas por chamado.
 * Chamado com historico maior perderia transicoes — e justamente o chamado
 * que mais andou, o mais interessante. Para esses, buscamos o historico
 * completo no endpoint dedicado.
 */
async function completarTruncados(issues) {
  const truncados = issues.filter(it => {
    const c = it.changelog;
    return c && typeof c.total === 'number' && c.total > (c.histories?.length || 0);
  });
  if (!truncados.length) return;

  console.error(`  historico: ${truncados.length} chamado(s) com mais de 100 mudancas — buscando completo`);
  for (const it of truncados) {
    const todas = [];
    let inicio = 0, total = 1;
    while (inicio < total) {
      const r = await jira.chamada('GET', `/rest/api/3/issue/${it.key}/changelog?startAt=${inicio}&maxResults=100`);
      todas.push(...(r.values || []));
      total = r.total ?? todas.length;
      inicio += r.maxResults || 100;
      if (inicio > 5000) break;   // guarda contra historico absurdo
    }
    it.changelog.histories = todas;
  }
}

module.exports = { montar, areaValida, foco, ETAPA_ANALISE, ETAPA_CONFERENCIA };
