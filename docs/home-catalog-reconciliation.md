# Home reconciliada com o catálogo público

A implementação foi validada localmente contra o Supabase atual, sem importação,
cutover, migration, escrita comercial ou operação no Storage. Os 93 registros remotos
foram comparados antes/depois do QA; os 69 reais também foram comparados integralmente
com o snapshot posterior ao cutover v2.

## Causas encontradas

- A Home e o rodapé filtravam categorias apenas por `active`, sem exigir produtos.
  As quatro categorias antigas permanecem ativas, mas estão vazias.
- As seis categorias novas têm `image=""`. CategoryCard apontava então para
  `/placeholder.svg`, arquivo que não existia. Não havia tratamento de erro no navegador.
  As imagens locais de Cabelos e Corpo e Banho existem; não foram removidas.
- Os 69 reais têm `featured=false`, `best_seller=false` e `gift_section=false`.
  As três primeiras vitrines dependiam exclusivamente dessas flags. Os mocks
  anteriormente alimentavam essas seleções. Novidades dependia de `created_at`,
  por isso continuou funcionando. Não foi encontrado mecanismo de métricas de vendas
  no schema/migrations/repository do catálogo; `best_seller` é uma flag editorial.
- Não existe importação dos arrays de `lib/data` no fluxo público atual. A falha
  estava na composição e nos metadados vazios, não no repository público.

## Seleção atual

`getHomeCatalog` reutiliza `getPublicCatalog`, mantendo o resolvedor central de
imagens. `selectHomeCatalog` aceita apenas produtos ativos e disponíveis em categorias
ativas. As categorias e contagens derivam desse conjunto, sem lista fixa de categorias
ou números comerciais. O rodapé compartilha `getPublicCategoriesWithProducts`.

Cada vitrine mantém quatro cards e o layout original. Novidades reserva os quatro
produtos mais recentes por `createdAt`. Presentes usa categorias cujo nome contém
Presentes, além da flag `gift_section` administrável. Destaques prioriza `featured`;
Preferidos prioriza `best_seller`, sem anunciar volume de vendas ou aprovação de
compradores. Fallbacks editoriais são determinísticos, variados por categoria e
priorizam imagens confirmadas. Com o catálogo atual há 16 produtos distintos nas
quatro vitrines. Catálogos pequenos podem reutilizar produtos entre vitrines; nunca
recorrem a mocks.

As flags existentes continuam administráveis no formulário de produtos. Nenhuma flag
foi alterada nesta tarefa. A Home chama a seleção de Preferidos porque não há evidência
para anunciar um ranking de vendas. A copy de Destaques também deixou de sugerir vendas.

## Imagens e evidências

Uma imagem própria da categoria, validada no servidor, tem prioridade. As seis
ilustrações legadas conhecidas são tratadas como fallback visual, sem presumir que
sejam fotografias confirmadas. Depois são consideradas imagens dos produtos da própria
categoria: `confirmed-existing`, `unknown-origin`, ilustração legada válida,
`generated-provisional` e o placeholder seguro.

`home-image-origins.json` contém somente evidências da auditoria, indexadas pelo path
exato da imagem. Não contém produtos de fallback nem é fonte de catálogo. Uma imagem
substituída no Admin recebe outro path e não herda a classificação anterior; sem
evidência local sua origem é desconhecida. O runtime não depende de `catalog-import`.

`SafeImage` tenta os próximos candidatos, depois o SVG local e, se até esse falhar,
mantém uma caixa visual sem `<img>` quebrada. Testes HTTP dos 69 produtos verificam
conteúdo não vazio e hash da auditoria, independentemente desse fallback de interface.

Nenhuma imagem de produto foi substituída. Os 36 produtos com imagem provisória
permanecem associados aos seus próprios arquivos; não há uma alternativa confirmada
associada ao mesmo produto na auditoria utilizada. Não se troca uma imagem por uma
fotografia de outro produto. As sete origens desconhecidas também foram preservadas.

## Verificação

- 178/178 testes offline aprovados; TypeScript e build aprovados.
- 69 imagens HTTP 200, não vazias e com hash conferido; zero produtos mock na Home.
- Edge headless com o build de produção em 1440, 768 e 390 pixels: oito categorias,
  quatro cards por vitrine, imagens quadradas, zero overflow e zero imagens quebradas.
- Carrossel exercitado em tablet/mobile; rodapé com somente oito categorias preenchidas.
- Falha de imagem forçada no navegador acionou `/placeholder.svg`, carregado com sucesso.
- Sem exceções JavaScript. A coleta de rede inclui aborts de prefetch/navegação e a
  falha deliberada de QA; isso não representa imagem real quebrada.
- `next-env.d.ts` e `tsconfig.tsbuildinfo` restaurados ao conteúdo versionado.
- Sem stage, commit, push, merge, PR ou deploy.

Evidências locais: `catalog-import/home-reconciliation-qa.json`,
`catalog-import/home-browser-qa.json`, `catalog-import/home-tests.log` e screenshots
`catalog-import/home-1440.png`, `home-768.png` e `home-390.png`.

## Arquivos alterados/adicionados

- `app/(loja)/page.tsx`: consome a composição central, preserva o layout e ajusta copy.
- `components/category-card.tsx`, `components/product-card.tsx`: imagens com fallback.
- `components/site-footer.tsx`: oculta categorias sem produtos disponíveis.
- `components/safe-image.tsx`, `public/placeholder.svg`: fallback visual compartilhado.
- `lib/catalog/home-catalog.ts`: seletores, contagens e priorização de imagens.
- `lib/catalog/home-server.ts`: valida imagens próprias sem escrita remota.
- `lib/catalog/home-image-origins.json`: evidências de origem por path exato.
- `tests/home-catalog.test.cjs`: 16 testes de regressão novos.
- `tests/fixtures/home-public-catalog.json`: fixture dos 69 públicos e categorias.
- `tests/helpers/load-typescript.cjs`: loader para os testes/QA isolados.
- `tests/home-remote-qa.cjs`: QA remoto com transporte somente GET/HEAD e integridade.
- `tests/home-browser-qa.cjs`: QA no Edge instalado, responsividade e fallback.
- Este relatório.

## Legado para revisão futura, sem remoção nesta tarefa

`lib/data/products.ts`, `lib/data/categories.ts` e os assets dos mocks não são usados
pela Home. `tests/admin-catalog-responsive.cjs` ainda usa esses arrays em um harness
antigo de renderização: deve ser reconciliado antes de eventual remoção dos arquivos.
As categorias vazias e os seeds históricos também permanecem preservados.

## Categorias conferidas

| Categoria | Produtos | Imagem selecionada | Origem |
|---|---:|---|---|
| Hidratantes Corporais | 4 | Ameixa Negra | confirmed-existing |
| Infantil | 4 | Colônia Infantil Cici Zoe 12+ | confirmed-existing |
| Perfumes Femininos | 28 | Acqua Fresca | confirmed-existing |
| Perfumes Masculinos | 9 | Eau de Parfum Zaad Tradicional | confirmed-existing |
| Presentes Femininos | 16 | Kit Ameixa | confirmed-existing |
| Presentes Masculinos | 3 | Kit Arbo Tradicional | confirmed-existing |
| Cabelos | 2 | Ilustracao existente | own-category-artwork |
| Corpo e Banho | 3 | Body Splash Kiss | confirmed-existing |

## Provisorias exibidas atualmente na Home

- Coffee Addictive (latest).
- Body Splash Kaiak Tradicional 200ml (latest).
- Kits Eico todos ganham a máscara de BRINDE (latest).

A ilustracao existente de Cabelos permanece porque seus dois produtos so possuem imagens provisorias.

## Produtos com imagens provisorias preservadas (36)

- Body Splash Infantil Cici Bela 150ml
- Body Splash Kaiak Tradicional 200ml
- Coffee Addictive
- Coffee Woman Duo
- Deleite 400ml
- Elysée
- Essencial Tradicional
- Floratta Red
- Hello Hello 100ml
- Her Code Touch
- Homem Sagaz
- Humor Próprio
- Ilía Laços
- Ilía Secreto
- Kiss You More 100ml
- Kissme Cabernet
- Kit Celebre Sua Força
- Kit Cuide-se Bem Deleite
- Kit Egeo Choc
- Kit Eico Cachos Definidos
- Kit Elysée Parfum + Hidratante
- Kit Floratta Red Body Spray + Hidratante Corporal
- Kit Floratta Red Embalagem Lata
- Kit Floratta Red Passion + Nativa Spa
- Kit Her Code
- Kit Hidratante Eudora
- Kit Liz Tradicional
- Kit Morango Irresistível Splash + Hidratante Corporal
- Kit Portinari
- Kits Eico todos ganham a máscara de BRINDE
- Kriska Drama
- Lily Eau de Parfum
- Liz
- Luna Divina
- Una Blush
- Una Brilho
