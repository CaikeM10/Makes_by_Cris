# Reconciliação de /categorias com o catálogo real

Implementação validada localmente com o build de produção e o Supabase atual.
Nenhuma importação, cutover, migration, alteração comercial ou operação no Storage
foi executada. As alterações pendentes da Home e do WhatsApp foram preservadas.

## Causa raiz

`app/(loja)/categorias/page.tsx` ainda usava `getPublicCatalog()` diretamente e
filtrava apenas categorias ativas. As quatro categorias antigas continuam ativas no
banco, mas não têm produtos públicos disponíveis. A Home já utilizava
`getHomeCatalog()`, que exige produtos ativos/disponíveis e resolve as imagens.

Não existia importação de arrays mock nessa rota. A fonte antiga era a apresentação
dos metadados das categorias no Supabase: imagens legadas de `/images/categorias/`
e campos `image` vazios. CategoryCard usava o placeholder quando recebia imagem vazia.
Os arrays históricos `lib/data/categories.ts` e `lib/data/products.ts` continuam fora
do fluxo público; nenhum arquivo ou asset foi removido.

## Fonte compartilhada

Home, `/categorias` e `/categoria/[slug]` agora consomem `getHomeCatalog()`, baseado
no repository público existente e em `selectHomeCatalog()`. Essa seleção utiliza
`getPublicCategoriesWithProducts()`, calcula contagens pelos produtos ativos e
disponíveis em categorias ativas e fornece os mesmos objetos de categoria e imagens.

A seleção compartilhada também expõe `getCategoryBySlug` e `getProductsByCategory`
para os destinos dos cards. Categorias vazias ou inativas não se tornam destinos
públicos elegíveis. Não há nova lista de IDs/slugs ou números comerciais na aplicação.

O botão Continuar comprando de `app/(loja)/pedido-enviado/page.tsx` já apontava para
`/categorias`; permaneceu inalterado e foi clicado no QA do navegador.

## Estratégia de imagem

1. Imagem própria da categoria, verificada, exceto ilustrações legadas conhecidas.
2. Imagens de produtos da própria categoria, ordenadas por `confirmed-existing`,
   `unknown-origin`, `generated-provisional`, nome e ID como desempate estável.
3. Ilustração legada válida somente como último recurso, depois das imagens de produto.
4. Placeholder visual da aplicação se não houver candidato utilizável.

A ordem compartilhada foi ajustada para que uma imagem provisória de um produto
também tenha prioridade sobre a ilustração legada. Portanto Cabelos agora usa
Kit Eico Cachos Definidos na Home e em Categorias, em vez da ilustração local antiga.
Os demais sete cards usam imagens `confirmed-existing`. Nenhuma imagem de produto,
origem ou status foi modificada.

CategoryCard mantém o design e `SafeImage`. O banner de `/categoria/[slug]` também
reutiliza a imagem selecionada e sua cadeia de fallback. URLs de produto continuam
passando pelo resolvedor central existente. No catálogo atual todos os oito cards
usam imagens dos próprios produtos; nenhum usa placeholder ou ilustração mock.

## Verificação

| Verificação | Resultado |
|---|---:|
| Categorias públicas exibidas | 8 |
| Categorias vazias ocultadas | 4 |
| Produtos somados | 69 |
| Cards com imagens válidas | 8/8 |
| Placeholders genéricos | 0 |
| Categorias mock exibidas | 0 |
| Broken images | 0 |
| Home e /categorias sincronizadas | Sim |
| Links de categoria válidos | 8/8 |
| Testes | 209/209 |
| TypeScript | Aprovado |
| Build | Aprovado |
| Escritas remotas | 0 |

O QA anônimo validou 69 imagens HTTP 200, não vazias e com hash correspondente à
auditoria. Os 69 registros reais foram comparados integralmente com o snapshot v2;
todos os 93 produtos remotos foram comparados antes/depois do QA, sem alterações.

O Edge headless verificou 1440, 768 e 390 pixels com dados reais. A comparação entre
Home e Categorias incluiu slugs/URLs, nomes, contagens e imagens. Os oito links foram
navegados e seus produtos comparados por nome e categoria com a fixture correspondente
ao catálogo remoto conferido. O grid permaneceu com três colunas no desktop e duas
no tablet/mobile, sem overflow ou imagens quebradas. Não houve exceções JavaScript.

As quatro categorias ocultadas são Maquiagem, Perfumes, Skincare e Acessórios.
Elas e seus assets permanecem preservados.

## Arquivos desta tarefa

- `app/(loja)/categorias/page.tsx`: seleção compartilhada, contagens e metadata neutra.
- `app/(loja)/categoria/[slug]/page.tsx`: destinos, produtos e banner da mesma seleção.
- `lib/catalog/home-catalog.ts`: prioridade de imagens e seletores dos destinos.
- `tests/categories-page.test.cjs`: 16 novos testes de regressão, incluindo oito destinos.
- `tests/home-remote-qa.cjs`: exige imagem de produto em cada categoria atual; registra IDs/slugs.
- `tests/home-browser-qa.cjs`: compara Home/Categorias, testa Continuar comprando e oito destinos.
- Este relatório.

Evidências locais em `catalog-import/`: `home-reconciliation-qa.json`,
`categories-browser-qa.json`, `categories-tests.log`, `categories-1440.png`,
`categories-768.png` e `categories-390.png`.

As alterações continuam locais, sem stage, commit, push, merge, PR ou deploy.
