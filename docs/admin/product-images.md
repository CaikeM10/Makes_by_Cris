# Imagem principal do catálogo

Bucket público `product-images`: JPEG, PNG e WebP; máximo 5 MiB (5.242.880 bytes).
Escrita usa sessão do usuário e `public.is_admin()`. Sem service role.
INSERT envia objeto novo com `upsert: false`; não há policy UPDATE porque a
substituição cria outro objeto. SELECT/DELETE autenticados permitem cleanup admin.
Downloads públicos não dependem de policy SELECT.

O banco armazena `products/<id>/<uuid>.<ext>`. O mapper público resolve a URL;
o admin resolve apenas para exibição e mantém o path original para cleanup.
Imagens locais e URLs legadas continuam intactas. Não há migração das 23 fotos.

O cadastro exige imagem. O upload ocorre após validação, categoria e slug;
INSERTs concorrentes são protegidos pela constraint única e tentam outro sufixo.
O banco gera `created_at` e atualiza `updated_at` via trigger.
Na edição, slug e metadados existentes permanecem; UPDATE exige a versão original.
Falha de escrita tenta remover o upload novo. Foto antiga só é removida depois
do UPDATE, se o path gerenciado pertencer ao mesmo produto. Falha de cleanup
registra apenas productId/path e mantém o produto salvo; pode exigir limpeza manual.
Interrupção do processo entre upload e persistência também pode deixar órfão.

## Validação remota manual

Depois de aplicar `202610240002_product_images.sql`:

```powershell
node scripts/smoke-product-storage.cjs --anon-only
node scripts/smoke-product-storage.cjs
```

O segundo comando pede e-mail e senha oculta no terminal. Também aceita
`ADMIN_TEST_EMAIL`/`ADMIN_TEST_PASSWORD` no ambiente local. Não informe no chat.
Usa somente URL/key públicas e sessão autenticada; não imprime senha ou tokens.

O smoke tenta upload/INSERT anônimos e exige negação por permissão/RLS.
Depois valida login/admin, upload, leitura pública, INSERT e invisibilidade do
produto inativo. Cria no máximo um registro reservado com nome
`Produto Teste Admin`, slug `produto-teste-admin-smoke-<uuid>`, `active=false`.
Reexecuções reutilizam esse registro e substituem a imagem, limpando somente
a imagem anterior do próprio teste via API Storage. A imagem referenciada fica
no bucket para futuras verificações. Não edita produtos reais e não faz DELETE
de produto: o registro de teste fica inativo para revisão humana.

Os testes automatizados locais usam fakes para falhas e concorrência; não são
evidência de execução de RLS no servidor. O smoke fornece essa verificação real.

## Evidência desta implementação

- Branch: `feat/admin-foundation`.
- Dry-run remoto: somente `202610240002_product_images.sql` pendente.
- Migration aplicada com sucesso, sem seeds ou alterações em produtos.
- Smoke remoto `--anon-only`: upload anônimo negado por RLS, categoria pública
  legível e INSERT anônimo de produto negado por permissão/RLS.
- 54 testes locais passaram; TypeScript, build e `git diff --check` passaram.
- Nenhum produto remoto criado durante a execução do modo `--anon-only`.
- Smoke remoto autenticado concluído com sucesso pelo operador: login, retorno
  `public.is_admin() = true`, upload admin, INSERT admin de um único
  `Produto Teste Admin` inativo e imagem pública acessível sem sessão.
- Anon continua sem upload e sem INSERT de produto; o produto inativo ficou
  invisível para anon. O registro reservado ao smoke permanece inativo.
- Validação manual no navegador concluída com sucesso pelo operador: criação
  pelo painel, upload no Storage, edição de nome e dos dois preços independentes,
  persistência no Supabase e renderização da imagem na loja.
- Produto ativo apareceu na Home; alterações do admin chegaram ao catálogo
  público sem novo deploy, validando o fluxo de cache/revalidation.
- O smoke autenticado não foi repetido na revisão final. A consulta somente de
  leitura ao histórico remoto confirmou `202610240002` aplicada.
- Troca de imagem, cleanup e compatibilidade com imagens locais também estão
  cobertos pelos testes automatizados. Os resultados manuais informados acima
  não detalham uma segunda substituição de imagem pelo navegador.
