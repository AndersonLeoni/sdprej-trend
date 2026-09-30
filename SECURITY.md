# Política de segurança

## O que este repositório contém — e o que não contém

Este repositório guarda **código e metodologia de extração**: scripts Node.js que consultam a API
do Jira, derivam classificações (tema, aging, vínculo com GDIS) e geram o painel e as páginas do
Confluence. Ele **não contém dado**: `data/`, `dist/`, `config.json` e os HTMLs gerados
(`confluence-content.html`, `documentation-content.html`, `relatorio-problemas.html`) estão fora do
controle de versão (`.gitignore`) desde a criação do repositório.

O painel construído por este código **é publicado** em GitHub Pages e no Confluence interno da CVC
Corp, e nessas duas publicações ele carrega dado confidencial de negócio (valores de prejuízo,
vínculo com GDIS/SUST, produtividade por analista). Essa exposição é uma decisão deliberada e
temporária, documentada internamente, e está fora do escopo desta política — o que segue abaixo é
sobre o **código**, não sobre o conteúdo publicado.

## Reportando uma vulnerabilidade

Se você encontrar um problema de segurança no código deste repositório (por exemplo, uma falha que
permita injeção de conteúdo, exposição de credencial, ou qualquer forma de contornar as proteções
descritas acima), **não abra uma issue pública**. Use o recurso de
[relatório privado de vulnerabilidade](../../security/advisories/new) deste repositório no GitHub.

Se você identificar que dado confidencial de negócio (não código) ficou acessível de forma não
intencional — por exemplo, um link do painel indexado por um buscador, ou um arquivo de dado
versionado por engano — o mesmo canal privado se aplica: é tratado como incidente, com prioridade
sobre qualquer outro item deste roteiro de segurança.

## Escopo

Cobertos por esta política: os scripts em `extract/`, `build.js`, os geradores `generate-*.js`, os
publicadores `publish-*.js` e os workflows em `.github/workflows/`.

Fora de escopo: o conteúdo dos payloads em `data/` (nunca versionado) e a decisão de hospedagem do
painel publicado (em revisão — ver o roteiro de segurança do projeto).
