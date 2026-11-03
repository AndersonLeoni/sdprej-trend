'use strict';
/**
 * encerrados.js — monta o payload HE (histórico de chamados já encerrados).
 *
 * O filtro salvo 10478 (cfg.universo, usado pelas outras 3 visões) exclui por
 * definição qualquer status encerrado/resolvido/cancelado — é um filtro de
 * BACKLOG ATIVO, não de histórico completo (confirmado lendo a JQL do filtro
 * pela API: "status in (análise área responsável, Aprovação diretoria, ...)",
 * sem Fechado/Resolvido/Cancelado).
 *
 * Por pedido explícito do dono do produto, esta visão traz os encerrados numa
 * aba SEPARADA, sem entrar nos KPIs do backlog ativo que a gerência acompanha
 * hoje: um caso encerrado já foi resolvido ou baixado, e somar o valor dele
 * junto do "prejuízo em aberto" distorceria a leitura.
 *
 * JQL própria, não cfg.universo: usa `statusCategory = Done` em vez de
 * enumerar nomes de status, para não depender de rótulo exato nem quebrar se
 * o fluxo ganhar um status novo. Verificado por contagem: 1.566 (aberto, via
 * filtro 10478) + 4.454 (statusCategory = Done) = 6.020, que é exatamente a
 * mesma consulta sem nenhum filtro de status — partição exata, sem sobra.
 */

const jira = require('./jira');
const D = require('./derive');
const A = require('./aggregate');

const PROJETO = 'project = 10236';
const ISSUETYPE = 'issuetype = "Prejuízo / não conformidade"';
const DEPARTAMENTO = '"Departamento responsável (migrated)[Dropdown]" in ' +
  '("Fraude Prejuízo", "TI - prejuízo", "CVC - TI - Prejuízo")';
const JQL_ENCERRADOS = `${PROJETO} AND ${ISSUETYPE} AND ${DEPARTAMENTO} AND statusCategory = Done`;

const CAMPOS = [
  'key', 'summary', 'created', 'status', 'resolutiondate',
  D.CAMPO.valorFinal, D.CAMPO.valorInicial,
  D.CAMPO.fornecedor, D.CAMPO.cliente, D.CAMPO.areaFalha, D.CAMPO.ocorrencia,
];

async function montar(cfg, agora = new Date()) {
  const issues = await jira.buscar(JQL_ENCERRADOS, CAMPOS, { rotulo: 'encerrados' });

  const lista = issues.map(it => {
    const f = it.fields;
    return {
      key: it.key,
      summary: f.summary || '',
      status: D.valorDe(f.status),
      created: D.soData(f.created),
      /* idade desde a abertura ate HOJE — nao e tempo de resolucao, e so para
         comparar com o mesmo calculo das outras visoes. Tempo de resolucao
         de verdade esta em diasParaEncerrar, abaixo. */
      diasAberto: D.diasAberto(f.created, agora.getTime()),
      encerradoEm: f.resolutiondate ? D.soData(f.resolutiondate) : '',
      diasParaEncerrar: f.resolutiondate ? D.diasAberto(f.created, Date.parse(f.resolutiondate)) : null,
      temaDerivado: D.tema(f.summary),
      produtoDerivado: D.produto(f.summary),
      tipoDerivado: D.classificaTemaTipo(D.tema(f.summary)),
      areaFalha: D.valorDe(f[D.CAMPO.areaFalha]),
      valor: A.arredonda(D.valor(f)),
      fornecedor: D.valorDe(f[D.CAMPO.fornecedor]),
      cliente: D.valorDe(f[D.CAMPO.cliente]),
      ocorrencia: D.valorDe(f[D.CAMPO.ocorrencia]),
    };
  });

  const val = i => i.valor;
  const vs = lista.map(val);
  const resolvidos = lista.filter(i => i.diasParaEncerrar != null).map(i => i.diasParaEncerrar);

  return {
    geradoEm: D.carimbo(agora),
    kpis: {
      total: lista.length,
      valorTotal: A.soma(vs),
      valorMediana: A.mediana(vs),
      valorMax: A.maximo(vs),
      tempoMedioResolucao: resolvidos.length
        ? Math.round(resolvidos.reduce((a, b) => a + b, 0) / resolvidos.length) : 0,
    },
    temas:     A.agregar(lista, i => i.temaDerivado, val, A.LIMITE.temas),
    produto:   A.agregar(lista, i => i.produtoDerivado, val, A.LIMITE.produto),
    tipos:     A.agregar(lista, i => i.tipoDerivado, val, null),
    status:    A.agregar(lista, i => i.status, val, null),
    areaFalha: A.agregar(lista, i => i.areaFalha, val, A.LIMITE.areaFalha),
    mensal:    A.agregarEmOrdem(lista, i => D.mes(i.created), val, null),
    issues: lista,
  };
}

module.exports = { montar, JQL_ENCERRADOS, CAMPOS };
