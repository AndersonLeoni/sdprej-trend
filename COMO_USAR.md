# 📊 SDPREJ Dashboard — Como Usar

## ✅ Para Acessar o Dashboard

### 1️⃣ **Via Confluence** (Recomendado)
- Abra o Confluence na página **"DASHBOARD - SDPREJ TREND"**
- Clique no botão **"Abrir Dashboard Completo"** (laranja)
- O painel interativo abre em uma aba nova

### 2️⃣ **Direto no Navegador** (Se o servidor estiver rodando)
```
http://localhost:8000/SDPREJ_Painel.html
```

---

## 🔄 Atualização Automática

O dashboard é **atualizado automaticamente todos os dias** com os dados mais recentes do Jira.

- **Horário de atualização**: Diário (configurável)
- **Dados**: Extraídos em tempo real do Jira
- **Frequência de extração**: Daily via agendador

---

## 📱 Navegação no Painel

O painel tem **3 abas principais**:

### 📋 **VISÃO 1: TEMAS**
- Classificação dos chamados por padrão derivado
- Gráficos: Tema, Área, Fornecedor, Aging, Mensal
- Filtros: Por tema, faixa de dias, valor

### 👤 **VISÃO 2: ANALISTAS**
- Desempenho dos analistas
- Timeline de ciclos
- Fila de espera
- Filtros: Por analista, faixa de dias

### 🔗 **VISÃO 3: GDIS**
- Rastreamento de incidentes
- Vínculo entre chamados e GDIS
- Status e escalação

---

## 💡 Dicas de Uso

✅ **Filtrar dados**: Use os dropdowns na parte superior de cada aba  
✅ **Visualizar detalhes**: Passe o mouse sobre os gráficos para ver valores  
✅ **Exportar**: Use as opções nativas do navegador (Print → Salvar como PDF)  
✅ **Compartilhar**: Copie a URL e envie para colegas  

---

## ❓ FAQ

**P: O painel não carrega?**  
R: Verifique se o servidor Node está rodando. Procure pela tarefa "SDPREJ-Server" no Agendador de Tarefas do Windows.

**P: Os dados estão desatualizados?**  
R: Os dados são atualizados diariamente. Para uma atualização manual imediata, execute:
```bash
node extract/run.js && node build.js
```

**P: Posso compartilhar o link com outras pessoas?**  
R: Sim! Envie o link do Confluence. Se precisarem acessar direto (não pelo Confluence), use o IP da máquina:
```
http://[IP_DA_MAQUINA]:8000/SDPREJ_Painel.html
```

**P: Quero mudar as cores ou layout?**  
R: Os arquivos são:
- `src/app.css` → Estilos CSS
- `src/app.js` → Lógica dos gráficos

---

## 📞 Suporte

Para dúvidas técnicas ou solicitações de mudanças, entre em contato com o time de TI.

---

**Versão**: 2.0 Premium  
**Última atualização**: ${new Date().toLocaleString('pt-BR')}  
**Status**: ✅ Ativo e atualizado automaticamente
