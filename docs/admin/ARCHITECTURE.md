# Editor administrativo do catálogo

## Fronteiras nesta fase

O catálogo público continua usando `lib/data/products.ts` e
`lib/data/categories.ts`. O Admin usa exclusivamente as tabelas Supabase:
não há fallback para os dados estáticos na listagem administrativa.
Editar o banco não altera ainda o catálogo público.

Fluxo: Server Component protegido → repositório → Supabase SSR com cookies/RLS.
Salvar: formulário → Server Action → `requireAdmin()` → validação central →
operação → repositório → UPDATE condicionado por ID e versão → lista.

## Módulos

- `lib/catalog/repository.ts`: contrato, filtros, categorias e modelo administrativo.
- `lib/catalog/mappers.ts`: normaliza valores monetários em strings decimais;
  preserva a versão original com precisão de microssegundos.
- `lib/catalog/validation.ts`: regras compartilhadas pelo cliente e servidor;
  allowlist de campos, preços independentes, limites e filtros da URL.
- `lib/catalog/update-product.ts`: valida categoria, executa atualização parcial
  e traduz falhas para mensagens seguras.
- `lib/catalog/supabase-repository.ts`: único local de consultas às tabelas.
  Módulo server-only; usa o cliente da sessão, sem service role.
- `components/admin/product-*.tsx`: formulário reutilizável e blocos de preços
  e publicação. Sem upload, criação ou edição de slug.

## Banco e dinheiro

Migration `202610230001_catalog.sql`, separada da autorização existente.
IDs são texto, aceitando IDs legados e futuros UUIDs convertidos para texto.
Categorias referenciadas por FK; slugs únicos; exclusão sem privilégio no app.

`numeric(12,2)` representa decimal exato no PostgreSQL, com duas casas e limite
de 9.999.999.999,99. Inputs aceitam vírgula ou ponto decimal sem milhar e são
normalizados em strings; não há cálculo de crédito ou percentual. `price` é
PIX/dinheiro/débito e `credit_price` é crédito, independente de `price`.

`keywords` e `variations` são arrays de texto; ausência de variações permanece
NULL. As três seções editoriais são flags. Novidades permanece dependente de
`created_at`, preservado na cópia dos produtos.

## Segurança e concorrência

RLS nas duas tabelas: SELECT/INSERT/UPDATE somente para `authenticated` com
`public.is_admin() = true`. Policies UPDATE têm USING e WITH CHECK. Sem grants
para anon/PUBLIC e sem DELETE. Administradora vê ativos e inativos.
Cada página e action chama `requireAdmin`, além do layout protegido.

UPDATE usa ID e `updated_at` em uma única instrução: nenhuma linha retornada
indica conflito (ou registro removido). Trigger renova a versão no servidor,
sempre maior que a anterior. Não converter o token para Date no navegador:
isso perderia microssegundos. O patch ignora slug, imagem, arrays, datas e ordem.
Erros mantêm os campos; o formulário cancela reset automático do React.

## Listagem

Busca no servidor por nome, marca ou nome da categoria; inclui inativos.
Comparação ILIKE ignora caixa, mas não remove acentos. Caracteres de gramática
PostgREST são removidos antes de construir OR. Filtros são combináveis e ficam
na URL: Todos/Ativos/Inativos/Destaques/Mais vendidos e categoria.
Paginação de 24 itens, ordem estável por catalog_order e id, contagem filtrada.
Não carrega todo o banco no navegador. Para volume futuro, considerar índice
de busca normalizada e consulta única/RPC, sem mudar o contrato da UI.

## Importação e aceite

Consultar `CATALOG.md`: seed explícito apenas para desenvolvimento/homologação,
sem sobrescrever registros existentes. Não aplicado automaticamente no remoto.
