# Ajustes finais do catálogo — 14/11/2026

- Essencial Exclusivo, Essencial Oud e Essencial Sentir: retirados da seleção pública masculina por ID. A mesma seleção alimenta página, cards, contagens e fontes derivadas. A busca não os associa mais à categoria masculina; a busca pelo nome e o acesso direto continuam disponíveis, preservando os dados comerciais.
- Perfumes Masculinos: capa prioriza a imagem definitiva já usada por Homem Sagaz. Regra compartilhada por Home, categorias, busca e hero da categoria.
- Eau de Parfum Zaad Tradicional: imagem pública substituída por cópia idêntica de `catalog-import/final-image/perfumes-masculinos/zaad_eau_tradicional.png`.
- Deleite 400ml: imagem pública substituída por cópia idêntica de `catalog-import/final-image/hidratantes-corporais/deleite400ml.png`. Sua regra anterior de posicionamento foi preservada.
- Nenhuma alteração em nomes, preços, categorias comerciais, disponibilidade, checkout, entrega, favoritos ou carrinho. Nenhum arquivo antigo apagado. Sem escrita no banco ou publicação.

## Arquivos deste ajuste

- `lib/catalog/category-placement.ts`, `lib/catalog/home-catalog.ts`, `lib/catalog/mappers.ts`, `lib/catalog/public-catalog.ts`.
- `public/images/catalogo/perfumes-masculinos/zaad-eau-tradicional.png` e `public/images/catalogo/hidratantes-corporais/deleite400ml.png`.
- `tests/client-catalog-review.test.cjs`, `tests/final-catalog-browser.cjs`, `tests/home-catalog.test.cjs`, `tests/search-catalog.test.cjs`.
- Este relatório. Alterações que já existiam no workspace foram preservadas.

## Validação

- 43/43 testes de revisão, busca e catálogo público passaram; `npx.cmd tsc --noEmit` passou; `git diff --check` passou.
- Navegador Edge com catálogo real do Supabase, em 390, 768 e 1440px: categoria masculina, filtro local, cards de categorias, busca global e páginas dos dois produtos aprovados. Zero imagens quebradas, placeholders inesperados ou overflow horizontal nas telas verificadas. Capa confere com a imagem de Homem Sagaz. Seção masculina contém quatro produtos: Malbec Gold, Malbec, Homem Sagaz e Eau de Parfum Zaad Tradicional.
- Evidências locais: `catalog-import/final-catalog-browser-qa.json` e capturas `catalog-import/final-catalog-*.png` (pasta de artefatos ignorada pelo Git).
- Na execução conjunta, 59/60 testes passam. A auditoria antiga de imagens em `tests/home-catalog.test.cjs` falha porque `catalog-image-paths.json` ainda contém 69 IDs e o snapshot público já continha 68 no início deste pedido. ID excedente: `97e5f276-8410-42e5-84b8-6e0ba84016f6`. Não removido nem reinserido, pois está fora do escopo autorizado.

Os ajustes pedidos estão concluídos localmente. Commit deve selecionar os arquivos deste ajuste, considerando as alterações anteriores compartilhadas nos mesmos arquivos. Há uma pendência preexistente de auditoria de fixtures; a suíte conjunta não está totalmente verde.
