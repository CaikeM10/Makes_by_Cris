# Home do Admin: ações e resumo do catálogo

## Causa do CTA invisível

Em `app/admin/admin.css`, `.admin-home-note a` tinha especificidade (0,1,1), maior
que `.admin-button` (0,1,0). A regra destinada ao link secundário sobrescrevia
`color: #fff` do CTA com `color: var(--admin-wine)`. O texto resultava em vinho
#743b4b sobre o mesmo fundo #743b4b: contraste 1:1.

A regra foi restringida a `.admin-home-note .admin-catalog-link`. O componente
AdminHome continua usando um link com `.admin-button`, agora com texto explícito
Gerenciar produtos. Os estados hover e active escurecem o fundo; o foco mantém
outline de 3px com offset. Botões desabilitados da mesma classe mantêm texto branco
e fundo vinho dessaturado sem reduzir a opacidade de todo o controle.

## Ações e conteúdo

- Gerenciar produtos: `/admin/produtos`.
- Adicionar produto: `/admin/produtos/novo`.
- Ver catálogo permanece um link secundário discreto, usando a configuração existente.
- A sidebar mantém logo, Início, Todos os produtos, Ver catálogo e Sair.
- Um bloco de atenção mostra até três produtos com imagem provisória e links para
  suas rotas de edição existentes. Nenhum formulário ou rota foi duplicado.

O CSS do logout recebeu estados hover/active e uma cor legível quando desabilitado.
A lógica de `LogoutButton` e da server action `logout` permanece inalterada.

## Origem e significado dos números

`lib/catalog/admin-summary.ts` lê os dados com o client retornado por
`requireAdmin()`. Não usa service role na aplicação, não expõe rota adicional e não
faz escrita. A leitura de produtos é paginada, selecionando apenas ID, nome, path da
imagem, categoria e flags necessárias. Categorias são lidas em paralelo.

| Indicador conferido remotamente | Valor | Origem |
|---|---:|---|
| Total de produtos | 93 | Todos os registros acessíveis ao Admin |
| Produtos ativos | 69 | Flag active |
| Categorias com produtos | 8 | Categorias ativas com produto ativo e disponível |
| Imagens para revisar | 36 | Evidência generated-provisional do path atual |

O total administrativo inclui os 23 mocks e Admin1 desativados. Exibir 69 como
total de todos os registros administrativos seria incorreto. A tela informa que o
total inclui desativados; o catálogo público continua com 69 reais.

A origem das imagens é a evidência confiável já existente em
`lib/catalog/home-image-origins.json`, compartilhada pela apresentação pública e
indexada pelo path exato, não por nome ou posição. Não foi criada migration nem
alterado imageSource/imageStatus. Uma imagem substituída no Admin não herda o status
provisório do path anterior. Arquivos sem essa evidência não são contados como
provisórios por suposição.

Em falha de leitura, o resumo mostra uma mensagem de indisponibilidade e link de
nova tentativa, mantendo os CTAs utilizáveis. Não mostra zeros inventados.

## Verificação visual e acessibilidade

O Edge headless renderizou os componentes reais e CSS do build de produção em um
harness isolado, com resumo lido no Supabase atual. Não foi criada rota de bypass
nem utilizada sessão real autenticada: a senha de teste não estava configurada.
Os mocks de autenticação/logout existem somente no harness e nos testes.

| Estado do CTA | Contraste texto/fundo |
|---|---:|
| Normal / focus | 8,50:1 |
| Hover | 10,55:1 |
| Active | 12,25:1 |
| Disabled (classe compartilhada de botão) | 5,45:1 |

O foco por Tab foi exercitado no navegador, com outline sólido de 3px. O botão Sair
tem altura de 44px e contraste normal de 7,73:1 contra a sidebar. CTAs têm altura
de 56px. Os links têm texto próprio e o item ativo da sidebar usa aria-current.

Em 1440, 768 e 390px não houve overflow, corte dos textos medidos ou exceções
JavaScript. No mobile a navegação continua acima do conteúdo, conforme o layout
anterior; os indicadores e CTAs se reorganizam sem adicionar um drawer novo.

A aplicação em produção foi iniciada separadamente para confirmar que `/admin`
sem sessão retorna 307 para `/admin/login`, e a página de login responde 200.
Os testes verificam autenticação antes da leitura e a server action de logout,
incluindo retorno ao login e tratamento de erro. Não foi executado logout real.

O N preto é o indicador de desenvolvimento do Next.js, documentado em
https://nextjs.org/docs/app/api-reference/config/next-config-js/devIndicators.
Não foi ocultado por CSS nem alterado next.config. O HTML de produção também foi
conferido sem portal de desenvolvimento.

## Validação e artefatos

- 219/219 testes aprovados.
- TypeScript e build aprovados.
- Zero escritas remotas. Produtos e categorias comparados integralmente antes/depois
  do QA somente leitura, sem diferenças.
- Pendências da Home pública, categorias e WhatsApp preservadas.
- Artefatos automáticos de Next/TypeScript restaurados ao conteúdo versionado.
- Sem stage, commit, push, merge, PR ou deploy.

Evidências locais: `catalog-import/admin-home-qa.json`, `admin-production-qa.json`,
`admin-home-tests.log`, `admin-home-1440.png`, `admin-home-768.png` e
`admin-home-390.png`. O HTML isolado fica em `admin-home-visual.html` e não faz parte
das rotas da aplicação.

## Arquivos desta tarefa

- `app/admin/(protected)/page.tsx`: ações, indicadores e atenção às imagens.
- `app/admin/admin.css`: correção da especificidade e estados/estilo dos componentes.
- `lib/catalog/admin-summary.ts`: resumo administrativo somente leitura.
- `tests/admin-home.test.cjs`: dez novos testes de regressão.
- `tests/admin-home-qa.cjs`: QA remoto somente leitura e visual isolado.
- `tests/helpers/edge-cdp.cjs`: automação do Edge instalado para o QA.
- Este relatório.
