# IDE Scanner Web

Next.js website for scanning and reviewing VS Code-compatible extension reports.

This project was bootstrapped with the official `create-next-app` template and uses:

- Next.js App Router
- TypeScript / TSX
- Next API routes
- The Python scanner engine from `../ide-scanner`

## Production Model

A hosted website cannot directly scan a visitor's Windows, macOS, or Linux machine from the browser. Browser code cannot read local IDE extension folders or execute Python.

For production, run the scanner on the user machine and upload the report to this website:

```bash
IDE_SCANNER_AGENT_TOKEN=<shared-token> \
PYTHONPATH=src python -m ide_scanner agent \
  --server https://your-ide-scanner-web.example \
  --all
```

On the web deployment, set the same token:

```bash
IDE_SCANNER_AGENT_TOKEN=<shared-token>
```

Uploaded reports are accepted at `POST /api/agent/reports` and stored under `.ide-scanner-reports/`.

## Run

```bash
npm install
npm run dev
```

Open:

```text
http://127.0.0.1:8765
```

## LAN Testing

To access the website from another computer on the same network:

```bash
npm run dev:lan
```

Then open the host machine's LAN IP on port `8765`.

## Scanner Location

By default the app expects the scanner repo next to this folder:

```text
../ide-scanner
```

Override it with:

```bash
IDE_SCANNER_ROOT=/path/to/ide-scanner npm run dev
```

If Python is not available as `python3` on macOS/Linux or `python` on Windows:

```bash
IDE_SCANNER_PYTHON=/path/to/python npm run dev
```

## API

- `GET /api/inventory`
- `POST /api/scans`
- `POST /api/agent/reports`
- `GET /api/scans/:id`
- `GET /api/scans/:id/report`
