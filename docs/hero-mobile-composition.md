# Hero mobile compacto

Escopo: composição visual; nenhuma migration, alteração de dados ou mudança de fluxo de campanhas.

O Hero anterior do HEAD usava uma faixa de imagem de 80px, espaçamentos menores e ocultava a descrição no celular. A implementação encontrada na branch somava uma imagem separada de até 192px ao bloco completo de texto e CTA; campanhas ainda usavam proporção 4:5. Essa soma empurrava as categorias para baixo.

A nova composição mantém a descrição HTML e integra arte, gradientes e texto em um painel de 320px abaixo de 1024px. Em 390px, a área útil mede 350 × 320px; em 360px, 320 × 320px. Título: 28px; descrição: 13px; CTA: mínimo de 40px. Título e descrição têm até três linhas com reticências; os limites existentes de validação continuam, e o texto integral permanece na página da campanha. O Admin explica esse comportamento.

A imagem padrão existente usa cover e foco 75%/30% no celular; no tablet, contain à direita. As regras editoriais desktop do banner padrão permanecem. A arte de campanhas usa source mobile até 767px e desktop a partir de 768px, preservando URLs assinadas, uploads e fallback. No mobile, cover central ocupa a mesma composição compacta. Recomenda-se arte mobile 1080 × 720 (3:2), com margem de segurança central e espaço para texto à esquerda e abaixo: essa dimensão é do arquivo, que será reenquadrado no painel. O preview da arte mantém a proporção 350:320 da Home de referência, inclusive quando o formulário fica estreito. Desktop continua 1920 × 720.

Mantidos picture/img nativos: o navegador solicita somente a fonte correspondente, sem transformar/cachear URLs assinadas. Dimensões explícitas, área reservada e fetchPriority high evitam espera desnecessária pela imagem principal. Não foram adicionados arquivos de imagem, bibliotecas ou requests ao Hero. LCP e payload não foram medidos em condições de produção.

## Validação

- 279 testes Node aprovados; tsc --noEmit e build aprovados.
- Harness local com os componentes reais da Home, Header, BottomNavigation e Admin e CSS compilado: 1920, 1440, 768, 390 e 360px; fallback, campanha, textos longos e editor.
- Em 390 × 844: painel de 320px, seção Hero incluindo padding de 336px; título Categorias em y=478px e cards em aproximadamente y=567px. CTA termina em y=381px, acima da navegação fixa. Sem overflow e CLS mobile igual a zero no harness.
- Fontes desktop/mobile e clique do CTA da campanha verificados no navegador. Admin conserva seleção de produtos e os testes de edição/ativação passam. Harness estático não valida envio real de formulários nem hidratação da aplicação.
- Consulta remota protegida para permitir somente GET/HEAD: zero campanhas, 69 produtos públicos, produtos/categorias íntegros, bucket privado; 8 leituras e zero escritas.
- Screenshots e relatórios locais em catalog-import: hero-default-390-viewport.png, hero-campaign-390-viewport.png, campaign-{default,campaign,editor}-{largura}.png, campaign-browser-qa.json e campaign-remote-qa.json.
- Sem commit, push ou alterações de banco. Artefatos next-env.d.ts e tsconfig.tsbuildinfo recuperados byte a byte do estado encontrado nesta tarefa, incluindo alterações que já estavam pendentes.
