# Admin Analytics

## Auditoria da estrutura existente

- App Router: `admin/layout.tsx` aplica CSS próprio, modo dinâmico e noindex. Grupo `(auth)` reúne login, recuperação, redefinição e acesso negado; `(protected)` contém início, produtos (listagem/criação/edição) e campanhas (listagem/criação/edição).
- `requireAdmin` consulta `auth.getUser()` e exige retorno explicitamente verdadeiro de `is_admin`; falhas bloqueiam acesso. Layout protegido e páginas/ações verificam autorização. Proxy renova sessão apenas em Admin e confirmação de autenticação.
- Navegação existente: Início, Todos os produtos, Campanhas, catálogo público e saída. Sidebar, identidade visual vinho/rosé, tipografia Manrope/Cormorant e foco visível foram preservados.
- Início: total de produtos, produtos ativos, categorias com produtos, imagens provisórias; campanha ativa e quantidade selecionada; atalhos para gerenciar/criar; lista de imagens para revisão. Dados reais de produtos/categorias/campanhas, sem contadores fictícios quando falha uma leitura.
- Reutilização: AdminNavigation, CatalogLink, LogoutButton, BrandLogo, componentes de formulário, filtros, paginação, editores e mensagens. CSS contém grids flexíveis e mudança de sidebar em telas grandes.
- Loading anterior: formulários usam estados de envio; a Home aguarda consultas no servidor, sem loading.tsx dedicado. Falhas do resumo/campanha têm mensagens e tentativa de recuperação, mantendo atalhos disponíveis. Analytics acrescenta skeleton próprio, vazio, erro e atualização independente.

## Fonte e contrato

API pública oficial: https://vercel.com/docs/analytics/web-analytics-api e https://vercel.com/docs/rest-api/web-analytics/aggregates-page-views (incluindo especificação https://vercel.com/openapi.json, consultadas em 15/11/2026).

Já existiam `@vercel/analytics@1.6.1` e `<Analytics />` no layout raiz em produção. Não foram encontrados Speed Insights, eventos track customizados ou outro armazenamento de acessos. A ativação e a existência de histórico no dashboard Vercel não podem ser deduzidas do componente instalado; exigem verificação no projeto remoto.

Consultas GET a `/v1/query/web-analytics/visits/aggregate`. A dimensão `environment` com filtro de produção mantém os totais de visitantes únicos por período, sem somar visitantes de grupos/dias. `requestPath` identifica URLs individuais; `day` fornece gráfico e `referrerHostname` fornece origens. Filtros excluem Admin, API e auth, inclusive acessos históricos dessas rotas. Lista de produtos tem consulta filtrada própria, sem depender de aparecerem no top geral.

Cards: visitantes nos últimos 5 minutos (janela agregada, sujeita ao atraso de processamento), visitantes/visualizações hoje em UTC e visitantes/visualizações dos últimos sete dias de calendário UTC, incluindo hoje parcial. Não são pessoas simultaneamente online. Não foram acrescentados eventos de coleta ou pageviews no Supabase.

Gráfico SVG leve com tabela acessível; nenhuma dependência adicionada. Top páginas/produtos e origens apresentam visualizações e visitantes. Nomes são resolvidos pelo catálogo público existente, com fallback para rota. Referrers não são reclassificados como Instagram/WhatsApp/Google sem evidência; vazio é “Sem referrer informado”. A API agrega excedentes em Others. Até dez valores mais o grupo residual por tabela. Dias ausentes não são inventados no gráfico.

## Configuração e segurança

- `VERCEL_TOKEN`: access token privado com acesso ao projeto/equipe; somente servidor.
- `VERCEL_PROJECT_ID`: projeto consultado; obrigatório.
- `VERCEL_TEAM_ID`: necessário somente para projeto pertencente a equipe; omitir em conta pessoal.
- `NEXT_PUBLIC_SITE_URL`: origem HTTPS canônica já existente, também usada por SEO.

Habilitar Web Analytics no dashboard Vercel. Não criar variável pública para o token. Configurar o token como Secret no ambiente escolhido. Não registrar seu valor no Git ou logs.

`/admin/analytics` chama `requireAdmin` antes de configuração/cache/dados. Respostas privadas usam no-store e X-Robots-Tag. O cliente recebe apenas DTO agregado, sem token, identificadores de projeto/equipe ou resposta bruta de erro da Vercel. Fetch externo usa destino fixo, timeout e bloqueio de redirects. Nenhuma sessão administrativa foi criada pelo código de QA.

Atualização a cada 60 segundos somente com aba visível, sem requisições simultâneas no componente. Botão Atualizar reutiliza cache compartilhado de 60 segundos no servidor; sete chamadas upstream por recomputação. Cache de sucesso tem timestamp real da consulta e preserva dados anteriores no cliente em caso de erro. Sem dados mostra estado vazio; credenciais ausentes mostram configuração pendente. Custos e janela de histórico dependem do plano Vercel; não há consulta fora do uso do painel.

## Arquivos principais

`lib/admin/analytics.ts`, `analytics-types.ts`, `app/admin/analytics/route.ts`, `components/admin/analytics-panel.tsx`, dashboard existente, `admin.css`, `.env.example` e `tests/admin-analytics.test.cjs`.

## Validação e limites

Os testes de contrato usam respostas controladas e verificam autenticação, filtros, períodos, visitantes únicos, erros e sigilo. As credenciais Vercel estão ausentes localmente: números reais, latência, habilitação remota e permissões do token continuam pendentes de configuração. Não são apresentados dados simulados no aplicativo. QA visual isolado renderiza o componente real com estados controlados sem criar bypass no aplicativo; validações HTTP usam o servidor real.

QA aprovado em 390, 768 e 1440 px: loading, sucesso, vazio, erro e dados anteriores após falha (15 combinações), sem overflow horizontal. Há tabelas acessíveis além do SVG. Build/TypeScript e testes do Admin passaram. Total da suíte: 290/298; as oito falhas são anteriores a esta tarefa, reproduzidas no HEAD isolado, descritas em `docs/seo-audit.md`. A leitura ao vivo da Vercel permanece pendente das variáveis acima, não de novas tabelas ou migrations.
