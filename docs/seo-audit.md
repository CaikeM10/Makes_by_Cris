# Auditoria SEO — Makes by Cris Martins

## Estado atual

Diagnóstico anterior às alterações, em 15/11/2026. Avaliação técnica aproximada: 5/10, por inspeção de código; não é uma medição Lighthouse ou de posicionamento. App Router com páginas públicas renderizadas no servidor e catálogo Supabase. Layout público dinâmico; metadata de produtos e categorias já existe, porém incompleta. Marca centralizada em store-config. Admin já tem noindex. Busca é um diálogo local, sem URL indexável própria. Não existe manifest, sitemap ou robots no código inicial.

## Problemas encontrados

## Critical

Nenhum confirmado. Autorização do Admin valida identidade e RPC is_admin no servidor.

## High

- Ausência de sitemap e domínio base de metadata; produtos, categorias e campanhas sem canonical.
- Open Graph de produto só define imagem, herdando título e descrição genéricos da loja.
- Checkout, sacola e favoritos sem noindex explícito.

## Medium

- Ausência de Product e Organization JSON-LD e Twitter cards.
- Imagem principal do produto sem dimensões/prioridade explícitas; imagens usam img/SafeImage e configuração global desativa otimização Next Image.
- Campanhas usam URLs assinadas de imagem com validade de 300 segundos: inadequadas para previews persistentes. Não tornar bucket público automaticamente.
- Consultas dinâmicas e verificação HEAD de imagens podem afetar TTFB/LCP; medir em produção antes de refatorar cache.

## Low

- Sem manifest (não é requisito de indexação); ícones PNG existentes.
- Fontes Manrope/Cormorant usam next/font, display swap e latin-ext. Avaliar peso dos subconjuntos com dados reais.
- Erro 404 global possui H1; páginas públicas principais possuem um H1, seções H2 e links Next rastreáveis. Busca client-side não substitui o conteúdo inicial do catálogo.
- `/conta` não tinha H1; corrigido com título acessível sem modificar a composição visual.
- Splash global cobre conteúdo por aproximadamente 2,8 segundos; possível impacto na percepção de carregamento. Preservada nesta tarefa.

## Alterações realizadas

- `metadataBase` usa a origem canônica validada já existente, sem inventar domínio. Template uniforme `Página | Makes by Cris Martins`.
- Helper `lib/seo.ts` com metadata, URL canônica e serialização JSON-LD protegida contra fechamento de script por conteúdo do catálogo.
- Home, categorias, categoria, produto e campanha possuem canonical próprio; OG/Twitter explícitos nas páginas indexáveis. Produtos usam nome, texto e imagem existentes. Quando não há descrição, não é criada uma descrição comercial.
- `Product` com preço PIX já exibido na página, BRL e disponibilidade real. Marca somente quando informada, sem reviews/rating/SKU/GTIN/estoque numérico. `Organization` na Home somente com nome e URL existentes.
- Sitemap dinâmico usa categorias públicas exibidas, todos os produtos públicos ativos (inclusive esgotados, cuja página continua válida) e campanha pública efetivamente disponível. Não inclui utilitários, Admin ou API e não inventa lastModified. Falhas de fonte não são convertidas em sitemap vazio de sucesso.
- Robots permite renderização pública e bloqueia Admin/API/auth; anuncia sitemap canônico. Noindex herdado do Admin preservado. Layouts específicos aplicam noindex em checkout, sacola, favoritos, conta e pedido enviado. Busca é diálogo local, sem rota separada a marcar noindex. O 404 já recebe noindex do Next.js.
- Dimensões e fetchPriority na imagem principal de produto; aspecto quadrado existente preservado. Nenhum arquivo de imagem foi modificado.

### Validação local

- Build de produção e TypeScript aprovados, sem biblioteca nova.
- `/robots.txt` e `/sitemap.xml` responderam 200. Conferidos HTML inicial (User-Agent Googlebot) e DOM/head no Edge: Home, categoria `hidratantes-corporais` e produtos `kit-floratta-red-embalagem-lata`, `kit-arbo-tradicional`, `kit-eico-cachos-definidos`.
- Conferidos title, canonical para origem configurada, OG com imagem real, Twitter e JSON-LD de produto/organização. Conteúdo importante/H1 presente no HTML inicial.
- Admin/API sem sessão redirecionam ao login. Login tem `noindex, nofollow`. Checkout, sacola, favoritos, conta e pedido enviado confirmados com noindex; página inexistente retornou 404 e noindex.
- Dez testes novos de contrato/segurança/SEO aprovados. Suíte completa: 298 testes, 290 aprovados e oito falhas históricas reproduzidas com os mesmos nomes numa cópia isolada do HEAD: cinco em categories-page, uma em client-catalog-review, uma em home-catalog e uma em optional-credit (CRLF/LF). Não alteradas fixtures comerciais nem migrations.
- Smoke legado `admin-smoke.mjs --configured` passou autenticação, login, recuperação, Home e categorias, depois falhou porque exige o antigo slug `batom-matte-vermelho-classico`, hoje 404. Produtos válidos do sitemap e utilitários foram verificados no QA novo.
- Não foi medido Lighthouse nem Core Web Vitals reais. Não há campanha pública ativa confirmada nesta rodada; metadata e seleção de campanha cobertas por contrato e inspeção.

## Melhorias recomendadas futuras

- Medir Core Web Vitals reais (LCP/CLS/INP); Speed Insights não está instalado. Não há valores de campo disponíveis nesta auditoria inicial.
- Definir imagem institucional de compartilhamento e estratégia de imagens permanentes para campanhas.
- Avaliar otimização responsiva de imagens sem modificar arquivos definitivos.
- Confirmar domínio canônico em NEXT_PUBLIC_SITE_URL no ambiente de produção e verificar Search Console após publicação.
- Configurar/validar credenciais de leitura de Analytics na Vercel; ativação remota e números reais não foram confirmados nesta máquina.
