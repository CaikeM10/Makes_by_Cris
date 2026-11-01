# Campanhas sazonais da Home

## Uso pela administradora

1. Entre no Admin e abra **Campanhas → + Nova campanha** (`/admin/campanhas/nova`).
2. Preencha nome interno, slug, título, descrição e texto do botão. O slug usa letras
   minúsculas sem acentos, números e hífens, por exemplo `dia-das-maes-2027`.
3. Envie as artes independentes Desktop e Mobile. Recomendações: 1920 × 720 e
   1080 × 1350. Veja os dois previews; JPEG, PNG e WebP são aceitos até 5 MiB por arte.
4. Busque produtos pelo nome, marque os desejados e ordene com as setas. A seleção
   mostra miniatura, preço à vista e categoria. Produtos repetidos não são permitidos.
5. Salve como rascunho ou marque **Campanha ativa** e salve. Para ativar são
   obrigatórios desktop, mobile e ao menos um produto elegível. A campanha anterior
   é desativada na mesma transação.
6. Na lista (`/admin/campanhas`), use **Editar**, **Ativar**, **Desativar** ou
   **Excluir campanha**. Exclusão pede confirmação e preserva os produtos.

Ao desativar a campanha, o banner padrão retorna automaticamente. Sem campanha ativa,
a Home do Admin informa que o padrão está em uso e oferece Criar campanha. Com uma
ativa, mostra nome, status, quantidade selecionada e acesso à edição.

## Banner padrão e mobile

O Hero padrão continua permanentemente em `HomeHero`, com o asset original
`/images/banner-editorial.png`; nenhuma arte foi gerada ou removida. A copy agora
descreve perfumes, presentes e cuidados, sem listar categorias antigas.

O asset original é quadrado (1024 × 1024). A antiga faixa mobile de 80px com
`object-cover` e posição deslocada cortava a composição. Agora a imagem ocupa uma
área própria, limitada em altura, com `object-contain`; o texto e o CTA vêm abaixo.
O desktop mantém a composição editorial anterior, com imagem de fundo e gradiente.

A campanha usa `<picture>`: arte mobile até 767px e desktop nas demais larguras.
As artes são contidas sem distorção/crop destrutivo, com texto e CTA em HTML separado.
O CTA vai para `/campanha/[slug]`, nunca para Categorias. O layout limita a altura
mobile da arte; dimensões/aspect ratios explícitos reduzem mudanças de layout.

Se a leitura falhar ou a campanha não for pública/elegível, o padrão permanece. Um
caso legado sem URL mobile pode usar desktop com layout seguro; a ativação normal,
entretanto, exige os dois objetos. Falha de carregamento da arte não mostra ícone de
imagem quebrada. Textos e CTA longos podem quebrar linha sem estourar a largura.

## Modelagem e migration

Migration versionada e aplicada ao projeto vinculado:
`supabase/migrations/202610310001_seasonal_campaigns.sql`.

- `campaigns`: UUID, nome, slug único, título, descrição, texto do botão, paths
  desktop/mobile, active e timestamps.
- `campaign_products`: FK da campanha, FK do produto e posição; sem IDs em string.
  Chaves únicas impedem produto/posição duplicados. Excluir campanha apaga apenas
  seus vínculos; os produtos são preservados.
- Índice parcial único garante no máximo uma campanha ativa, inclusive fora da UI.
- RPCs `save_campaign`, `set_campaign_active` e `delete_campaign` validam o Admin,
  serializam alterações com advisory lock e usam versão `updated_at` para conflitos.
- Salvar campanha, trocar seus vínculos e desativar a anterior ocorre numa transação.
  Uma validação que falha mantém a campanha anterior ativa.
- Migration reaplicável: tabelas/índice com IF NOT EXISTS, funções CREATE OR REPLACE,
  policies/triggers recriados pelos seus nomes e bucket com upsert de configuração.
- Nenhuma instrução altera produtos, preços, categorias, flags ou imagens de produto.
  Não há agendamento implementado.

Elegibilidade é verificada tanto na aplicação quanto no banco: produto ativo,
disponível, em categoria ativa, com ID UUID do fluxo real; os IDs legados dos mocks
e o nome Produto Teste Admin1 são rejeitados. Novos produtos reais com UUID entram
naturalmente, sem whitelist dos 69 atuais. Produtos desativados depois ficam ocultos
na seleção pública; se nenhum continuar elegível, o Hero retorna ao padrão.

## RLS, autenticação e Storage

Campanhas e vínculos têm RLS. Anon lê somente campanha ativa/elegível e vínculos de
produtos públicos elegíveis. URL de campanha inativa ou inexistente retorna 404,
inclusive quando visitada com uma sessão Admin; edição acontece pelo painel.

Todos os endpoints administrativos executam `requireAdmin()` antes de ler/escrever.
O client da sessão é passado ao repository e ao Storage; nenhuma service role chega
ao browser ou é usada nas ações da aplicação.

As tabelas concedem somente SELECT diretamente. A escrita administrativa acontece
pelas RPCs autenticadas, que conferem `is_admin()` internamente. Isso impede que um
cliente contorne a regra de ativação com INSERT/UPDATE direto. Anon não recebe EXECUTE
nas RPCs de escrita; usuário autenticado não autorizado também é rejeitado.

O bucket **campaign-banners** é privado, com MIME types permitidos e limite de 5 MiB.
O público pode obter leitura somente das artes de uma campanha pública; o Admin pode
ler rascunhos e inserir novas artes. URLs assinadas duram cinco minutos e são geradas
no servidor conforme as policies da sessão. Nenhuma arte QA foi enviada ao bucket.

Paths: `campaigns/{campaignId}/{desktop|mobile}/{novoUUID}.{ext}`. Não há overwrite:
`upsert:false`, sem policy UPDATE de objetos. O servidor reutiliza a validação de
MIME, tamanho e assinatura da infraestrutura de produtos e também confere a extensão.
As dimensões são recomendações, sem bloqueio rígido. Não foi adicionada biblioteca
de compressão ou de drag-and-drop.

A substituição faz upload novo, salva referência e somente então tenta remover a
arte antiga. A policy DELETE proíbe apagar qualquer objeto ainda referenciado por
campanha, protegendo inclusive uma resposta de save ambígua. Falhas podem deixar
arte não referenciada para revisão segura; nunca exigem apagar a imagem vigente.
O bucket e os 70 objetos anteriores de produtos não foram alterados.

`next.config.mjs` agora permite 12mb no corpo de Server Actions para receber duas
artes de até 5 MiB no mesmo formulário. A validação individual de 5 MiB permanece.

## Validação realizada

- **248/248 testes** da aplicação aprovados; TypeScript e build aprovados.
- **27 verificações PostgreSQL/RLS** com PGlite descartável: migration reaplicável,
  anon sem escrita/upload, Admin autorizado cria/edita/exclui, ativação A→B, limite
  único, versões conflitantes, referências de imagens protegidas e filtro posterior
  de produtos desativados/indisponíveis.
- Grants, RLS e `is_admin()` também conferidos no projeto remoto em transação somente
  leitura, com asserções. Não foi criada sessão ou campanha QA remota.
- Snapshot remoto antes/depois: 93 produtos e 12 categorias integralmente intactos;
  catálogo público continua com 69 produtos. Campanhas em produção: **0**, bucket
  privado e nenhuma campanha QA criada/ativa.
- Edge headless em **1920, 1440, 768 e 390px** para Hero padrão, campanha fixture e
  editor real renderizado isoladamente. Zero overflow, imagens quebradas ou exceções;
  arte mobile/desktop correta via currentSrc, dois previews e seleção preservada.
  CLS observado nas fixtures abaixo de 0,00001; CTA clicado abriu três produtos
  selecionados na página exclusiva.
- Build local conectado ao Supabase: Home 200 com banner padrão e 16 cards comerciais
  existentes; `/campanha/campanha-qa` 404; três rotas Admin sem sessão retornaram 307
  para login.
- Os fluxos de escrita foram exercitados por fixtures/SQL descartável e mocks de
  Storage, não por uma sessão Admin real em produção. Não havia senha de teste
  configurada. Os previews e a navegação visual usaram os componentes/CSS reais em
  harness isolado, sem rota de bypass na aplicação.

## Arquivos

- `components/home-hero.tsx`, `components/campaign-artwork.tsx`, `app/(loja)/page.tsx`.
- `app/(loja)/campanha/[slug]/page.tsx`.
- `lib/campaigns/model.ts`, `repository.ts`, `public-server.ts`, `save.ts`.
- `app/admin/(protected)/campanhas/`: listagem, cadastro, edição e Server Actions.
- `components/admin/campaign-form.tsx`, `campaign-controls.tsx`, `admin-navigation.tsx`.
- Home do Admin e `app/admin/admin.css`: resumo e estilos das campanhas.
- Migration citada acima e `next.config.mjs`.
- `tests/campaigns.test.cjs`, `campaign-database-qa.cjs`, `campaign-browser-qa.cjs`,
  `campaign-remote-qa.cjs`, `campaign-runtime-qa.cjs`, SQL de grants somente leitura e
  loader de testes (`File`, `Blob`, `FormData`).
- Este documento.

Os artefatos de evidência ficam em `catalog-import/`: `campaign-tests.log`,
`campaign-database-qa.json`, `campaign-remote-qa.json`, `campaign-browser-qa.json`,
`campaign-runtime-qa.json`, snapshot anterior e screenshots `campaign-*.png`.

Para repetir o SQL QA sem Docker, a dependência de teste é local e ignorada pelo Git:

```powershell
npm.cmd install --prefix catalog-import/.campaign-test-deps --no-save --package-lock=false @electric-sql/pglite
node tests/campaign-database-qa.cjs
```

O código da aplicação continua local, sem deploy, stage, commit, push, merge ou PR.
A migration aditiva já foi aplicada e o código anterior continua compatível.
As pendências anteriores foram preservadas; artefatos automáticos Next/TypeScript
são restaurados após os checks.
