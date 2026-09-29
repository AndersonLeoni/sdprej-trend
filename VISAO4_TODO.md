# 📋 Visão 4 — Relatório de Problemas (Pós-Férias)

**Status:** 🔄 Em Progresso (50% — Dados + Template + Esboço JS)

**Data de Conclusão Estimada:** Segundo dia útil pós-férias (02/10/2026)

---

## ✅ O QUE JÁ ESTÁ PRONTO

### Dados (100%)
- ✅ `extract/problemas.js` — Extrai GDIS/SUST do Jira
- ✅ `data/problemas.json` — Armazena de → para, status, impacto

### Publicação (100%)
- ✅ `generate-relatorio-problemas.js` — Gera tabelas HTML pra Confluence
- ✅ `atualizar-confluence.cmd` — Integrado no fluxo (Passo 2b)
- ✅ Tabelas no Confluence com KPIs e resumos

### Template (100%)
- ✅ `src/template.html` — Aba 4 criada com estrutura HTML
- ✅ 4 cards KPI (Aberto, Em Correção, Corrigido, Total)
- ✅ 3 tabelas (uma por status)
- ✅ Filtros básicos (Status, Prioridade)

### Estilos (100%)
- ✅ `src/app.css` — Estilos para KPIs e cards da Visão 4

### Lógica JavaScript (15% — Esboço)
- ⚠️ `src/app-relatorio-sketch.js` — Estrutura e TODOs
- ✅ Funções `renderRelatorioKPIs()` e `renderRelatorioTabelas()`
- ⚠️ Filtros (não implementado)
- ⚠️ Ordenação por coluna (não implementado)

---

## ⚠️ O QUE FALTA (Pós-Férias)

### 1. Integrar Lógica JavaScript (30 min)

**Arquivo:** `src/app.js`

**O que fazer:**
1. Adicionar listener de aba (clique em "📋 Relatório de Problemas")
2. Chamar `initRelatorio()` quando aba for ativada
3. Integrar funções do `app-relatorio-sketch.js`

**Dica:** Copiar padrão de outras abas (fTemas, fGdis, fAna)

```javascript
// No final de app.js, adicionar:
document.getElementById('tab-rel').addEventListener('click', () => {
  // Mostrar Visão 4
  // Chamar initRelatorio()
});
```

### 2. Implementar Filtros (45 min)

**Filtros a implementar:**
- `#fRelStatus` — Filtrar por status (aberto, em_correcao, corrigido)
- `#fRelPrio` — Filtrar por prioridade (high, medium, low)
- `#rel-clear` — Limpar filtros

**Padrão a reutilizar:** Procurar em `app.js` a função que implementa filtros em `fTema`, `fArea`, etc.

**Pseudocódigo:**
```javascript
document.getElementById('fRelStatus').addEventListener('change', (e) => {
  const status = e.target.value;
  // Filtrar PR[status] ou PRfilter
  // Re-renderizar tabelas
});
```

### 3. Implementar Ordenação de Colunas (45 min)

**O que fazer:**
- Cliques em `<th data-s="...">` devem ordenar a coluna
- Indicador de seta (↕) deve girar
- Suportar: chave, tipo, prioridade, dias, valor, etc.

**Padrão a reutilizar:** Procurar em `app.js` a função `sortTable()` ou similar do GDIS.

### 4. Testes e Refinamento (30 min)

**Checklist:**
- ✅ Aba aparece e fica oculta corretamente
- ✅ KPIs mostram valores certos
- ✅ Tabelas preenchem com dados
- ✅ Filtros funcionam
- ✅ Ordenação funciona
- ✅ Links para Jira abrem
- ✅ Design responsivo (mobile)
- ✅ Dark mode funciona

---

## 📂 Arquivos Relevantes

```
src/
  ├── template.html          ← Aba 4 criada (copiar padrão de outras abas)
  ├── app.css                ← Estilos KPI (copiar padrão de .card)
  ├── app.js                 ← INTEGRAR app-relatorio-sketch.js aqui
  └── app-relatorio-sketch.js ← Esboço (funções prontas)

extract/
  └── problemas.js           ← Extração (pronto)

generate-relatorio-problemas.js ← Tabelas Confluence (pronto)
```

---

## 🎯 Checklist Pós-Férias

- [ ] Segunda de manhã: Integrar `app-relatorio-sketch.js` em `app.js`
- [ ] Implementar filtros de status e prioridade
- [ ] Implementar ordenação por coluna
- [ ] Testar no browser (dev tools)
- [ ] Verificar responsividade
- [ ] Verificar dark mode
- [ ] Rodar `node build.js` e verificar painel
- [ ] Commit e push final
- [ ] Demonstrar ao gerente (antes do 10/10)

---

## 💡 Dicas para Terminar

### Dica 1: Copie o Padrão de Outras Abas
Procure em `app.js` por `fTemas` ou `fGdis` — o padrão de filtros é exatamente o mesmo que você precisa para Visão 4.

### Dica 2: Reutilize Funções de Formatação
Todas essas já existem em `app.js`:
- `nfInt()` — formatar números
- `nfBRL()` — formatar moeda
- `esc()` — escapar HTML
- `sortTable()` — ordenar tabelas

### Dica 3: Estrutura de Dados
`PR` já vem com a estrutura:
```javascript
PR = {
  aberto: [...],           // Array de problemas
  em_correcao: [...],      // Array
  corrigido: [...],        // Array
  sumario: {
    totalChamadosSdprej: 123,
    totalValorImpactado: 1000000
  }
}
```

### Dica 4: Teste Incremental
1. Primeiro: Fazer aparecer a aba
2. Depois: Mostrar KPIs
3. Depois: Preencher tabelas
4. Depois: Filtros
5. Depois: Ordenação

Não tente fazer tudo de uma vez!

---

## 📞 Referências

- **Padrão de Filtros:** Procure `fTema` em `app.js` (≈ linha 800+)
- **Padrão de Abas:** Procure `tab-temas` em `app.js` (≈ linha 100+)
- **Padrão de Tabelas:** Procure `g-table` em `app.js` (≈ linha 1200+)
- **Estilos:** Procure `.card` em `app.css` (≈ linha 100+)

---

## 🎉 Quando Terminar

Você terá uma **Visão 4 completa e interativa** no painel com:
- ✅ 4 status visuais (Abertos | Em Correção | Corrigidos | Total)
- ✅ Filtros funcionais
- ✅ Ordenação de colunas
- ✅ Links para Jira
- ✅ Design responsivo
- ✅ Dark mode

**Próximas evoluções (pós 10/10):**
- Timeline visual (gráfico de evolução)
- Print por problema
- Export CSV
- Comparativo mês a mês
- App Forge (dado ao vivo)

---

**Bom descanso! Vemos na volta!** 🏖️🚀
