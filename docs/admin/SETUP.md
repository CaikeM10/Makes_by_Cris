# Fundação do Admin — configuração e validação

> Este documento registra a fundação de autenticação. A etapa posterior de
> listagem/edição e sua migration estão documentadas em [CATALOG.md](CATALOG.md).

Escopo: Supabase Auth, autorização explícita, login, recuperação e shell. Nenhum
produto foi migrado e nenhuma função de edição está disponível. A auditoria
anterior não estava presente no checkout; o escopo fornecido na tarefa foi seguido.

## Ambiente

Copie `.env.example` para `.env.local` (já ignorado pelo Git) e configure:

| Variável | Valor |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Chave pública publishable do projeto |
| `NEXT_PUBLIC_SITE_URL` | Origem canônica do app/catálogo, sem caminho, query ou fragmento |

Exemplo local: `http://localhost:3000`. Em produção, use sua origem HTTPS.
Para testar `pnpm start` (modo produção), utilize uma origem HTTPS de teste;
HTTP localhost é aceito apenas no modo desenvolvimento (`pnpm dev`).
URLs com credenciais, protocolos arbitrários e HTTP público são rejeitadas.
Não há fallback baseado no Host da requisição. Sem configuração, o login fica
indisponível de forma explícita, o Admin permanece fechado e o catálogo funciona.

Nunca use service role/secret key nas variáveis públicas. Não há cliente
privilegiado neste código. Reinicie o servidor após configurar o ambiente; refaça
o build ao mudar valores públicos em produção.

## Dashboard Supabase

1. Crie ou selecione o projeto correto. Em Connect/API Keys, obtenha URL e chave
   pública. Este app usa PostgreSQL e Auth; não configure Storage nesta fase.
2. Em Authentication, habilite login por e-mail/senha. Desabilite **Allow new users
   to sign up** e login anônimo. Não habilite provedores sociais para este MVP.
3. Em URL Configuration, defina **Site URL** igual a `NEXT_PUBLIC_SITE_URL`.
   Em **Redirect URLs**, permita exatamente `<SITE_URL>/auth/confirm`.
   Cadastre `http://localhost:3000/auth/confirm` apenas para desenvolvimento.
   Prefira projeto separado para testes e evite curingas em produção.
4. Em Email Templates → **Reset Password**, configure o link abaixo. Este passo é
   obrigatório: a rota usa `token_hash` com `verifyOtp`, não o link implícito padrão
   com fragmento nem um parâmetro `code`.

   ```html
   <h2>Redefinir sua senha</h2>
   <p>Solicitou a recuperação do acesso ao seu painel?</p>
   <p><a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery">Criar nova senha</a></p>
   <p>Se não solicitou, ignore esta mensagem.</p>
   ```

5. Configure SMTP próprio e remetente autorizado para entregas reais. O serviço
   de e-mail padrão do Supabase tem restrições de destinatários e limites de envio.
   Desabilite rastreamento/regravação de links no provedor de e-mail.
6. Configure expiração dos links e rate limits no Auth. Mantenha proteção contra
   abuso; a aplicação não desativa os limites do Supabase. Configure senha mínima
   de 12 caracteres. Se exigir classes de caracteres adicionais no dashboard,
   alinhe também a instrução do formulário.
7. Aplique `supabase/migrations/202610170001_admin_authorization.sql` no SQL Editor
   como operador do projeto (ou via seu fluxo Supabase CLI). Não foi aplicada
   automaticamente em nenhum ambiente remoto.
8. Mantenha o schema `private` fora dos **Exposed schemas** da Data API. O schema
   `public` precisa estar disponível para a RPC `is_admin`.

## Primeira administradora

Em Authentication → Users → Add user → Create new user, crie a conta de Cris com
e-mail correto e senha forte exclusiva. Confirme o e-mail pelo fluxo operacional
apropriado (Auto Confirm no cadastro manual de uma conta já verificada). O app
não inclui cadastro nem callback de convite; use **Create user**, não Invite.

Copie o UUID gerado e execute no SQL Editor, substituindo o marcador:

```sql
insert into private.admin_users (user_id, enabled)
values ('UUID-REAL-DA-CRIS'::uuid, true)
on conflict (user_id) do update set enabled = excluded.enabled;
```

Não cadastre outras pessoas nessa tabela. Para suspender o acesso:

```sql
update private.admin_users
set enabled = false
where user_id = 'UUID-REAL-DA-CRIS'::uuid;
```

A alteração é consultada novamente nas requisições protegidas, sem cache global.
Um usuário criado no Auth, sem linha habilitada, **não é administrador**.

## Autenticação e autorização

- `lib/supabase/client.ts`: cliente browser público, preparado para uso futuro.
- `lib/supabase/server.ts`: cliente SSR com cookies, usado nas Server Actions,
  Server Components e confirmação. Não utiliza `getSession()` para autorização.
- `lib/supabase/proxy.ts` + `proxy.ts`: renovam/validam sessão via `getUser()`;
  transportam cookies atualizados à requisição e resposta. Só interceptam
  `/admin/*` e `/auth/confirm`, com respostas privadas/no-store e no-referrer.
- `requireAdmin()`: valida identidade online (`getUser`) e chama `is_admin()`.
  Ausência de sessão → login; usuário comum ou falha de autorização → acesso
  negado; somente `true` libera. É chamado no layout protegido e na Home.
  Toda futura action/rota de dados deverá chamar essa proteção novamente.
- Login usa `signInWithPassword`, consulta autorização e redireciona apenas para
  destinos internos fixos. Erros de credenciais não expõem detalhes do provedor.
- Server Actions preservam a verificação de origem/CSRF padrão do Next.js.
- Logout é uma Server Action POST com `signOut({ scope: 'global' })`, que remove
  cookies e revoga refresh tokens das sessões. Só redireciona após sucesso.
  Tokens de acesso já emitidos seguem a expiração normal do Supabase; logout
  não deve ser descrito como revogação instantânea de todos os JWTs emitidos.

### RLS e privilégio mínimo

`private.admin_users` contém apenas `user_id`, `enabled` (padrão false) e
`created_at`, com FK para `auth.users`. RLS habilitada, nenhum grant de tabela e
nenhuma política para `anon`/`authenticated`: acesso direto é negado por padrão.
Não há política que permita que um usuário se promova ou altere `enabled`.

`public.is_admin()` é SECURITY DEFINER com `search_path = ''`, nomes qualificados,
sem SQL dinâmico e sem parâmetro de usuário. O proprietário da função lê a tabela
privada; o resultado revela somente se `auth.uid()` está habilitado. EXECUTE é
revogado de PUBLIC/anon e concedido apenas a authenticated. A função não retorna
linhas, UUIDs ou qualquer dado de outro usuário. Gerenciar a lista exige acesso
administrativo ao banco, fora do app.

### Recuperação

`/admin/recuperar-senha` chama `resetPasswordForEmail`. E-mail válido sempre recebe
a mesma resposta neutra, inclusive em falhas de envio/rate limit. Isso não garante
que a mensagem foi entregue; consulte os logs de Auth/SMTP para diagnóstico.

O e-mail aponta para `/auth/confirm?token_hash=...&type=recovery`. A rota aceita
somente recovery, valida o token no Supabase e estabelece os cookies da sessão.
Token inválido/expirado/reutilizado → recuperação com aviso; válido → redefinição.
Não aceita destinos `next` arbitrários. Tokens não são registrados pelo código;
evite capturar query strings dessa rota em logs externos.

`/admin/redefinir-senha` e sua action exigem identidade validada. Sessões já
autenticadas também podem trocar a própria senha, como permitido pelo Supabase;
a redefinição não concede autorização administrativa. A action valida 12–128
caracteres e confirmação, usa `updateUser`, encerra sessões e volta ao login.

## Visual

- Logo oficial: `public/logorenderizadacrisd.webp`, pelo `BrandLogo` existente,
  sem modificar o arquivo nem o componente compartilhado.
- Desktop ≥1024px: split 46%/54%; logo até 368px de largura, altura automática,
  base blush para legibilidade da transparência, espaço superior e alinhamento
  com a saudação. “Cris.” tem tamanho 25% maior, peso 500 e itálico em tom creme.
- Mobile: logo de 160px, saudação compacta e formulário em coluna. Texto de apoio
  decorativo omitido para priorizar o acesso. Sidebar vira bloco acima da Home.
- Cormorant Garamond nos títulos; Manrope na UI. Foco visível, labels,
  autocomplete, mostrar/ocultar senha, feedback anunciado e alvos de toque.
- Shell mostra somente Início, Ver catálogo e Sair. Não há dados fictícios nem
  links para páginas de funcionalidades ainda não implementadas.

## Validação

```sh
pnpm exec tsc --noEmit --incremental false
pnpm build
node --test tests/admin-auth.test.cjs
```

Teste HTTP sem Supabase configurado, com `pnpm start --port 3100` em outro terminal:

```sh
node tests/admin-smoke.mjs http://localhost:3100
```

Os testes unitários executam os módulos reais com fronteiras Next/Supabase
substituídas. Eles verificam decisões de segurança, não o serviço externo.
Os testes HTTP verificam redirects e renderização, não interações completas do
catálogo. O teste real abaixo continua necessário após configurar o projeto.

| Caso | Como testar | Resultado esperado |
| --- | --- | --- |
| A | Abrir `/admin` em janela anônima | Login, sem conteúdo protegido |
| B | Entrar com a administradora habilitada | Home e shell |
| C | Entrar com senha incorreta | Mensagem neutra, sem acesso |
| D | Criar usuário de teste no Auth, sem autorização | Acesso negado mesmo ao abrir `/admin` diretamente |
| D2 | Desabilitar `enabled` de conta autenticada e recarregar | Acesso negado |
| E | Sair, abrir `/admin` novamente e atualizar a aba | Login |
| F | Recuperar senha, seguir e-mail, salvar nova senha | Login; senha antiga falha, nova funciona |
| F2 | Reutilizar token, usar token alterado/expirado | Solicitação de novo link |
| F3 | Recuperar e-mail inexistente | Mesma resposta neutra |
| G | Ver catálogo | Origem configurada, em nova aba |
| H | Home, produto, categorias, busca, favoritos, sacola, checkout, WhatsApp | Fluxos públicos preservados |
| RLS | Chamar RPC como anon | Negado |
| RLS2 | Chamar RPC como usuário comum / admin | false / true |
| RLS3 | Tentar ler/escrever admin_users como authenticated | Negado |

Nenhuma credencial real foi adicionada. Configuração remota, envio de e-mail,
aplicação da migration e testes integrados dependem do projeto Supabase.

## Referências técnicas

- [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Autenticação por senha](https://supabase.com/docs/guides/auth/passwords)
- [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)

## Resultado da implementação local

- TypeScript: `pnpm exec tsc --noEmit --incremental false` passou.
- Build: `pnpm build` passou, com verificação de tipos habilitada.
- Aviso do build: `metadataBase` ausente na configuração existente. Não foi
  alterada a metadata do catálogo nesta fase.
- `next-env.d.ts` foi atualizado automaticamente pelo Next: imports de tipos
  passaram de `.next/dev/types` para `.next/types`. Não houve edição manual.
- 13 testes unitários de autenticação/autorização passaram.
- Smoke HTTP: `/admin` → 307 login; redefinição sem sessão → recuperação;
  acesso negado sem sessão → login; login/recuperação e páginas públicas
  verificadas responderam 200. Confirmação sem configuração respondeu 503.
- Chrome headless: login revisado a 1440, 390 e 320px, sem overflow horizontal;
  logo medida a 368px no desktop e 160px no mobile.
- Nenhum teste integrado com Supabase real foi realizado: faltam configuração
  do projeto, migration aplicada, conta autorizada e SMTP. A matriz acima é a
  sequência de aceitação após configurar esses recursos.
- Nenhum arquivo do catálogo, logo, componente compartilhado, preço, frete ou
  WhatsApp foi alterado. Nenhum commit ou push realizado.

### Arquivos criados

```text
.env.example
proxy.ts
lib/supabase/config.ts
lib/supabase/client.ts
lib/supabase/server.ts
lib/supabase/proxy.ts
lib/admin/auth.ts
lib/admin/form-state.ts
lib/admin/site-url.ts
app/admin/layout.tsx
app/admin/admin.css
app/admin/actions.ts
app/admin/(auth)/layout.tsx
app/admin/(auth)/login/page.tsx
app/admin/(auth)/recuperar-senha/page.tsx
app/admin/(auth)/redefinir-senha/page.tsx
app/admin/(auth)/acesso-negado/page.tsx
app/admin/(protected)/layout.tsx
app/admin/(protected)/page.tsx
app/auth/confirm/route.ts
components/admin/auth-form.tsx
components/admin/logout-button.tsx
components/admin/catalog-link.tsx
supabase/migrations/202610170001_admin_authorization.sql
tests/admin-auth.test.cjs
tests/admin-smoke.mjs
docs/admin/SETUP.md
```

### Arquivos modificados

- `package.json`, `pnpm-lock.yaml`: `@supabase/ssr` 0.12.7,
  `@supabase/supabase-js` 2.118.0 e `server-only` 0.0.1.
- `next.config.mjs`: removido `typescript.ignoreBuildErrors: true`.
- `next-env.d.ts`: regeneração automática pelo build.
