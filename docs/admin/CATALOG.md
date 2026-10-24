# Primeira fatia do editor: listar, editar e salvar

## Preparação do ambiente

Não existe `.env.local` neste checkout. Siga `SETUP.md` para configurar Supabase
SSR e conta autorizada, sem versionar credenciais. Depois, no projeto de
**desenvolvimento/homologação**:

1. Aplique a migration de autorização existente, caso ainda não aplicada.
2. Aplique `supabase/migrations/202610230001_catalog.sql`.
3. Revise e execute `supabase/seeds/catalog.sql` no SQL Editor como operador.
   O seed é separado das migrations e não roda implicitamente em produção.
4. Confira `select count(*) from public.categories` (6 em banco vazio) e
   `select count(*) from public.products` (23 em banco vazio).
5. Configure a conta administradora conforme `SETUP.md` e entre no Admin.

O seed pode ser regenerado **offline** com:

```sh
node scripts/generate-catalog-seed.cjs
```

O gerador lê os módulos estáticos reais via TypeScript, mapeia categoria slug
para ID, preserva IDs/slugs/preços/imagens/keywords/variações/flags/disponibilidade
e active. catalog_order/position reproduzem a ordem dos arrays, iniciando em 0.
`createdAt` dos produtos vira meia-noite UTC da mesma data; nunca a data da
migration. Categorias não tinham datas: recebem os defaults do banco.
`updated_at` inicial também recebe o default do banco.

`gift_section` é inicializado pela seleção atual `giftProducts`, pois não havia
flag no tipo Product. O público continua com sua regra estática atual.

Ambos INSERTs usam `ON CONFLICT (id) DO NOTHING`, dentro de transação. Executar
novamente não duplica registros nem desfaz edições administrativas. Não é uma
sincronização contínua: registros existentes não são corrigidos/reimportados.
Conflitos de slug com outro ID abortam a transação, sem substituir identidades.
IDs removidos não devem ser reaproveitados em cadastros futuros.

**Importado neste computador: 0. Esperado em banco vazio: 6 categorias e 23
produtos.** Não houve acesso ou modificação de projeto Supabase remoto.

## Fluxo funcional de aceite

1. Entrar com administradora e abrir `/admin/produtos`.
2. Buscar Kit Presente Completo por nome, marca e Acessórios; verificar filtros
   ativos/inativos/destaques/mais vendidos e categoria, mantendo URL.
3. Editar `p-21`: PIX 149,90 → 139,90; crédito 159,90 → 149,90.
4. Salvar: retornar à lista com “Alterações salvas.”.
5. Abrir novamente e atualizar: valores devem continuar no banco.
6. Confirmar que slug, foto, keywords, variações, criação e ordem não mudaram.
7. Abrir em duas abas; salvar A e depois B: B deve exibir conflito.
8. Testar erro de rede e validação: valores digitados devem permanecer.
9. Confirmar que o catálogo público ainda mostra 149,90 / 159,90. Isso é esperado.

Campos editáveis: nome, marca, categoria, descrição curta/completa, PIX, crédito,
ativo, disponível, Destaques, Mais vendidos e Presentes & Kits.
Slug permanece oculto e imutável na edição. Foto somente para visualização.

## Aceite de segurança no Supabase

Executar com clientes/sessões reais, usando apenas a chave pública:

| Identidade | SELECT categories/products | INSERT/UPDATE | DELETE |
| --- | --- | --- | --- |
| Visitante | negado | negado | negado |
| Autenticado não autorizado | nenhuma linha | sem escrita | negado |
| Admin habilitado | ativos e inativos | permitido | negado |
| Admin desabilitado após login | nenhuma linha | sem escrita | negado |

RLS pode responder lista vazia/zero linhas em vez de erro: verificar a ausência
de alteração com a sessão administrativa. Não considerar apenas HTTP 200 como
escrita bem-sucedida. Testar categoria inexistente e valores negativos no banco.

## Verificação local desta entrega

- 23 testes unitários passaram (13 existentes + 10 novos).
- `pnpm exec tsc --noEmit --incremental false`: passou via pnpm.cmd no Windows.
- `pnpm build`: passou após permitir rede para Google Fonts.
- Avisos existentes: metadataBase e pnpm.overrides ignorado pela versão local.
- Smoke HTTP existente passou; novas rotas sem sessão retornam 307 ao login.
- Render estático dos componentes reais com dados isolados: lista e formulário
  sem overflow horizontal a 1440/1024/768/390px em Chrome headless. Fixture usa
  fontes de sistema e shell simplificado, sem servidor/banco autenticado.
- Script reproduzível: `node tests/admin-catalog-responsive.cjs` gera HTMLs e
  wrappers com viewports exatos em `.next/catalog-responsive` (não versionados).
- Testes unitários usam fronteiras substituídas. Não comprovam RLS aplicada,
  persistência remota, sessão real ou concorrência no PostgreSQL real.
- Falta executar o aceite integrado acima após configurar Supabase.

## Próxima fase

Cadastro, upload/Storage, Quick Edit, CRUD de categorias, gestão completa de
seções e migração coordenada do público continuam fora desta entrega.
