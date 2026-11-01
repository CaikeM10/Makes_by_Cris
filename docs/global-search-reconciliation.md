# Busca global reconciliada

## Causa raiz

`components/search-overlay.tsx` mantinha um array fixo com batom, perfume, base,
hidratante, skincare e pincéis, apresentado como Buscas frequentes sem analytics.

O drawer consumia categorias do `CatalogProvider`, cujo snapshot vinha diretamente
de `getPublicCatalog()`. Esse selector mantinha todas as categorias ativas, mesmo
vazias, e suas imagens brutas. A Home e `/categorias` já usavam `getHomeCatalog()`,
com filtro de categorias preenchidas, contagens e imagem resolvida. Não havia import
de arrays `lib/data` no drawer; a divergência era entre as camadas de apresentação.

## Fonte compartilhada

O template público agora obtém o catálogo-base e `getHomeCatalog()` com deduplicação
por React.cache existente. O `CatalogProvider` mantém seu contrato original para
sacola/favoritos e acrescenta um snapshot específico de busca, contendo as categorias
resolvidas e produtos da Home. Nenhum comportamento de sacola/preços foi alterado.

`getAvailablePublicProducts` centraliza ativo, disponível e categoria ativa.
`getPublicCategoryCounts` centraliza contagens; ambos são usados pela composição da
Home e pela busca. `getPublicCategoriesWithProducts` continua sendo a regra comum
para categorias preenchidas. A busca recebe as mesmas referências de categoria,
incluindo ID, slug, imagem e cadeia de fallback, sem escolher imagens novamente.

`isRealCatalogProduct` compartilha com Campanhas a verificação de IDs UUID do fluxo
real e a exclusão de Produto Teste Admin1. IDs legados dos mocks não são elegíveis,
mesmo se uma flag for reativada. A extração do helper preservou a regra de Campanhas.

## Pesquisa e sugestões

`selectSearchCatalog` reutiliza o algoritmo público existente, com normalização de
caixa, acentos e espaços entre palavras. Pesquisa nome, marca, categoria, descrição
curta, descrição e palavras-chave. Descrição longa não é necessária. O peso favorece
nome e categoria; os nomes exibidos não são modificados.

Sugestões são calculadas deterministicamente a partir de marcas e primeiros termos
dos nomes presentes no catálogo; nomes das categorias preenchidas complementam se
necessário. Todo candidato deve retornar produtos reais, sem repetição redundante.
Há no máximo seis chips. A frequência usada para ordenar termos é sua presença no
catálogo, não analytics de buscas; a interface diz somente **Sugestões**.

No catálogo conferido: Eudora, Natura, Eico, Kit, Essencial e Body. Nenhum desses
termos está fixado na aplicação. O array antigo foi removido integralmente.

Campo vazio mostra sugestões e oito categorias, sem resultados de produto aleatórios.
Uma busca inicia com até seis produtos; Mostrar mais resultados acrescenta outros
seis dentro do drawer. Não foi criada página de busca ou biblioteca adicional.
Resultado inexistente permanece vazio e oferece mensagem amigável.

A busca continua client-side com useDeferredValue, sem request por tecla.
Prefetch dos links do drawer foi desativado para evitar consultas antecipadas a
cada nova lista. Cliques continuam navegando nas rotas existentes de produto/categoria
e fecham o drawer. SafeImage e resolveProductImage continuam tratando as imagens.

## Acessibilidade e mobile

O Dialog controla initialFocus no input e finalFocus no botão que abriu a busca.
Isso corrigiu o retorno de foco após Escape, que não funcionava corretamente no QA.
Escolher uma sugestão também mantém o input focado. O input tem nome acessível;
estado de busca/resultados usa aria-busy/status e os links têm nomes de texto.

O popup acompanha altura/offset do visualViewport enquanto aberto, com listeners
limpos ao fechar. O cabeçalho e Fechar permanecem visíveis; só o corpo rola, com
overscroll contido e padding para safe area. A navegação inferior não cobre os links.

## QA remoto e visual

Validação final: **277/277 testes aprovados**, TypeScript aprovado e build aprovado.

Catálogo pesquisável: **69 produtos reais, oito categorias, 69 na soma das contagens**.
As oito imagens retornaram HTTP 200 e conteúdo de imagem não vazio.

| Pesquisa | Produtos reais |
|---|---:|
| Lily | 3 |
| Malbec | 2 |
| Eico | 2 |
| Kaiak | 2 |
| Floratta | 4 |
| Hidratante | 11 |
| Kit | 21 |
| Ilia | 2 |
| batom | 0 |
| base | 0 |
| skincare | 0 |
| pincéis | 0 |

O Edge headless testou o build real conectado ao Supabase em 1440, 768 e 390px.
Comparou Home, `/categorias` e drawer por slugs, imagens e contagens; os IDs são os
mesmos objetos da seleção compartilhada conferida no teste e no QA remoto.

Também verificou input focado, sugestões, resultados das 12 pesquisas acima,
`iLiA`, paginação de 6 para 12 itens, imagens, Escape, foco restaurado e cliques
reais nas páginas de produto e categoria. Não houve requests de busca/prefetch
durante a digitação, overflow horizontal ou exceções JavaScript.
Downloads normais de miniaturas não são consultas de busca e continuam ocorrendo
conforme os resultados passam a ser exibidos.

Em mobile, o viewport foi reduzido a 390 × 430 para simular o espaço disponível
com teclado: popup dentro da área visível, Fechar acessível, scroll interno e último
link clicável sem interferência da navegação inferior. Trata-se de emulação de
viewport, sem teste de teclado físico em um iPhone.

Produtos e categorias foram comparados integralmente antes/depois do QA remoto,
sem diferenças. O transporte do script aceita somente GET/HEAD. Não houve migration,
upload, alterações em campanhas ou escrita comercial nesta tarefa.

## Arquivos desta tarefa

- `components/search-overlay.tsx`: sugestões, resultados, paginação, imagens e viewport/foco.
- `components/site-header.tsx`: referência do botão para retorno de foco.
- `components/catalog-provider.tsx`, `app/(loja)/template.tsx`: snapshot de busca resolvido.
- `lib/catalog/search-catalog.ts`: composição de busca/sugestões.
- `lib/catalog/public-products.ts`, `lib/catalog/home-catalog.ts`: filtros/contagens compartilhados.
- `lib/campaigns/model.ts`: reutiliza o mesmo helper de identidade, com comportamento preservado.
- `tests/search-catalog.test.cjs`, fixture complementar dos campos públicos reais,
  `tests/search-remote-qa.cjs` e `tests/search-browser-qa.cjs`.
- Este relatório.

As pendências anteriores permanecem preservadas. Evidências em `catalog-import/`:
`search-tests.log`, `search-remote-qa.json`, `search-browser-qa.json` e screenshots
`search-empty-*.png` / `search-lily-*.png`.

O código permanece local, sem deploy, stage, commit, push, merge ou PR. Os artefatos
automáticos de Next/TypeScript são restaurados após a validação final.
