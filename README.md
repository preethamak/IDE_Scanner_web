# IDE Scanner Web

Public, version-specific security intelligence for VS Code-compatible extensions.

The product has three independently truthful modes:

- Public catalog pages resolve registry metadata and version history without an account.
- Instant Preflight groups bounded hosted-static capability hints and never emits a security decision.
- Deep Scan runs the canonical Python engine on GitHub Actions with required native, AST, Semgrep, YARA, and dependency-intelligence providers.

## Free hosted architecture:

- Vercel hosts the Next.js UI and signed ingestion APIs.
- Supabase Free provides Postgres, Auth, and RLS-protected personal data.
- Standard GitHub-hosted runners in the public scanner repository execute exact-version Deep Scans.
- The weekly catalog workflow retains the top 250 extensions, lists registry versions, and gradually scans the latest four versions.

Apply [`supabase/migrations/001_product_intelligence.sql`](supabase/migrations/001_product_intelligence.sql) to a new Supabase project, then configure Vercel:

```bash
NEXT_PUBLIC_SITE_URL=https://ide-scanner-web.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SECRET_KEY=... # server-only; sb_secret_... preferred
GITHUB_ACTIONS_TOKEN=... # fine-grained Actions:write for IDE_Scanner only
GITHUB_REPO_OWNER=preethamak
GITHUB_SCANNER_REPO=IDE_Scanner
SCAN_CALLBACK_SECRET=... # random 32+ byte value
SCAN_RATE_LIMIT_SECRET=... # separate random value
```

Configure the scanner repository Action secret `SCAN_CALLBACK_SECRET` with the same callback value. Configure the web repository Action secrets:

```text
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SECRET_KEY
GITHUB_ACTIONS_TOKEN
```

The secret key and workflow token are server-only. Never expose them through `NEXT_PUBLIC_*` variables. Deep Scan callbacks are HMAC-verified before schema validation and ingestion.

Configure Supabase Auth with site URL `https://ide-scanner-web.vercel.app` and redirect URLs `https://ide-scanner-web.vercel.app/auth/callback` and `http://localhost:8765/auth/callback`. GitHub OAuth uses callback `https://PROJECT.supabase.co/auth/v1/callback`.

## Run the complete product locally

Start the scanner service from the sibling `ide-scanner` repository:

```bash
PYTHONPATH=src .venv/bin/python -m ide_scanner.service --host 127.0.0.1 --port 8787
```

Start the website:

```bash
IDE_SCANNER_API_URL=http://127.0.0.1:8787 npm run dev
```

Open `http://127.0.0.1:8765`.

`IDE_SCANNER_API_URL` remains supported for a local or self-hosted scanner. The free public architecture uses GitHub Actions for Deep Scan jobs instead.

Optional shared authorization:

```bash
IDE_SCANNER_API_TOKEN=replace-with-a-random-token
```

Set the same token on the website and scanner service.

## Verification

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Scanner contract verification is maintained in the sibling repository:

```bash
PYTHONPATH=src .venv/bin/python -m unittest discover -s tests -v
```
