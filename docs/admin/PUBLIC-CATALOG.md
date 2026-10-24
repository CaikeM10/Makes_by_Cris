# Catálogo público canônico no Supabase

## Auditoria e escopo

Antes: Home, categorias, produto/metadados/relacionados, busca, rodapé,
favoritos e StoreProvider importavam os arrays estáticos. Sacola, checkout,
preços e mensagem de WhatsApp recebiam os objetos resolvidos no StoreProvider.
Produtos/categorias também eram usados para gerar rotas estáticas no build.

Agora nenhuma página ou componente público importa `lib/data/products.ts` ou
`lib/data/categories.ts`. Eles permanecem como referência e fonte do gerador
de seed/testes históricos; não há fallback automático de produção.
Não foram alterados IDs, slugs, datas de criação ou preços no banco nesta fase.
O seed não foi executado novamente.

## Caminho dos dados

- `public-repository.ts`: SELECT por cliente SSR da sessão existente, projeção
  explícita de campos públicos, filtro active e categorias ativas. Mesmo uma
  administradora não recebe produtos inativos na loja. Ordena pelos campos
  catalog_order/position e ID, com paginação interna dos produtos de 500 itens.
- `mappers.ts`: único módulo de mapeamento de linhas de produto, compartilhado
  com o Admin. A projeção pública converte snake_case para Product, resolve
  category_id para slug e não envia updated_at ao contexto do navegador.
- `public-catalog.ts`: seletores puros sobre dados do banco; flags editoriais,
  busca ponderada normalizada e produtos por ID/slug/categoria.
- `public-server.ts`: React.cache para deduplicar página, template, metadados e
  rodapé na mesma renderização; nenhum cache global de catálogo.
- `CatalogProvider`: snapshot serializável compartilhado entre busca,
  favoritos e sacola. O StoreProvider fica apenas na loja, fora do Admin.
- `app/(loja)/template.tsx`: recompõe o snapshot e o contexto a cada navegação;
  o layout mantém a splash persistente para não reapresentá-la a cada link.

Falhas de leitura exibem erro com opção de tentar novamente. Não são
substituídas por preços antigos dos mocks. Registros inexistentes/inativos
resultam em notFound nas páginas de produto/categoria.

## Regras preservadas

PIX/dinheiro/débito usam price; crédito usa credit_price, sem percentual.
featured controla Destaques; best_seller controla Mais vendidos; gift_section
controla Presentes & Kits. Presentes preserva o filtro de disponíveis que já
existia; palavras-chave não determinam mais participação nessa seção.
Novidades: ordenar created_at decrescente e selecionar os oito mais recentes;
a Home mantém deduplicação entre vitrines e até quatro itens por vitrine.
Indisponíveis continuam visíveis nas demais listagens com a UX existente.
Não há estoque, cadastro ou upload, nem mudança na logística ou no checkout.

## localStorage

Chaves preservadas: makes:sacola e makes:favoritos.
Formato da sacola preservado: `{ productId, quantity, variation? }[]`.
Favoritos continuam string[] de IDs. Não existiam snapshots completos de produto
persistidos. Agora `stored-selection.ts` resolve esses IDs no snapshot canônico,
sempre com preços/nome/flags atuais. IDs atualmente ocultos não são apagados do
armazenamento; apenas não são renderizados nem incluídos no total. Itens
indisponíveis mantêm o comportamento anterior, sem nova regra comercial.
Dados inválidos do armazenamento são ignorados e quantidades limitadas a 99.

## Segurança e migration

Migration adicional `202610240001_public_catalog.sql`:

- GRANT SELECT para anon em categories/products.
- categories_public_read para anon/authenticated: active = true.
- products_public_read para anon/authenticated: active = true e categoria ativa.
- Nenhuma policy administrativa removida ou enfraquecida.
- Nenhum grant/policy de escrita pública. Não há chave secret/service_role.

Aplicada no projeto vinculado após `migration list` e `db push --dry-run`
confirmarem que somente essa migration estava pendente. Nenhum dado alterado.
O cliente SSR reaproveita URL/publishable key/configuração existentes.

## Cache e atualização

Layout público usa `dynamic = 'force-dynamic'`: dados são lidos na requisição,
sem Full Route Cache/Data Cache persistente. generateStaticParams foi removido.
Após UPDATE bem-sucedido, a Server Action mantém as invalidações do Admin e
chama `revalidatePath('/(loja)', 'layout')`, cobrindo Home, produtos, categorias
e seleções. Não exige rebuild/deploy nem recarga global forçada.
Uma aba já aberta não recebe push/realtime: recarregar obtém o valor atual.
Navegações usam o mecanismo normal de prefetch/Router Cache do Next, invalidado
pela action da sessão que salvou; reload é a verificação entre sessões.

Referências oficiais: [fetch/no-store](https://nextjs.org/docs/app/api-reference/functions/fetch)
e [revalidatePath](https://nextjs.org/docs/app/api-reference/functions/revalidatePath).

## Evidências locais e remotas

- 33 testes unitários: 23 existentes + 10 novos; todos passaram.
- TypeScript e build passaram, rotas da loja identificadas como dinâmicas.
- Lint tentado: indisponível, pois eslint não está instalado no checkout.
- SELECT anônimo real retornou 6 categorias e 23 produtos públicos.
- Banco: p-01, batom-matte-vermelho-classico, PIX 9,90 / crédito 42,90.
- Produto, Home e categoria Maquiagem: HTTP 200, mesmo nome e PIX do banco.
- Produtos/categorias inexistentes: notFound confirmado.
- UPDATE/DELETE anônimos de ambas tabelas: erro 42501 em ID inexistente,
  sem tocar registros reais. INSERT público negado pela ausência de grants,
  auditada no SQL; não foi tentado INSERT de registro remoto.
- Navegador real isolado: sacola legada p-01 × 2 = R$ 19,80; checkout recebe
  o mesmo total; favorito e busca mostram R$ 9,90. Nenhum pedido enviado.
- Favoritos sem overflow em 1440/1024/768/390; navegação cliente preserva seleção.
- Admin/produtos e edição sem sessão: 307 para login. Login/recuperação: 200.
- `/auth/confirm` no build local: 503 esperado com origem HTTP localhost
  recusada em produção. Não representa teste de recuperação/login autenticado.
- Edição autenticada não foi repetida: este teste usou o valor real previamente
  salvo pela administradora, sem conhecer sua senha ou modificar o catálogo.
- Isolamento real de inativos e usuário comum coberto por policies e testes de
  código; não foram criados/desativados produtos ou usuários remotos para testes.

Reprodução:

```sh
node --test tests/admin-auth.test.cjs tests/admin-catalog.test.cjs tests/public-catalog.test.cjs
pnpm exec tsc --noEmit --incremental false
pnpm build
pnpm start --port 3100
node tests/public-catalog-smoke.cjs http://localhost:3100
node tests/admin-smoke.mjs http://localhost:3100 --configured --site-unavailable
```

O último flag só é adequado quando a origem da confirmação está indisponível
no modo atual. Para navegador isolado, iniciar Chrome headless com porta CDP
9223 e perfil de teste; executar `node tests/public-catalog-browser.cjs`.
Nenhum teste depende de Secret Key ou senha da administradora.
