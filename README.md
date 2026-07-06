# IDE Scanner Web

Next.js website for scanning and reviewing VS Code-compatible extension reports.

This project was bootstrapped with the official `create-next-app` template and uses:

- Next.js App Router
- TypeScript / TSX
- Next API routes
- The Python scanner engine from `../ide-scanner`

## Production Model

The production scan path is a local collector. A hosted website cannot silently enumerate a visitor's extension folders from the browser. The user runs a small local command on macOS, Windows, or Linux; that command discovers installed VS Code, Cursor, and Windsurf extensions and posts an inventory report to this website.

The lightweight collectors are served from:

- `/collect-ide-extensions.py` for macOS/Linux and Windows systems with Python.
- `/collect-ide-extensions.ps1` for Windows PowerShell without Python.

They do not require `ide_scanner` or this repository to be installed on the user's machine.

For deployments where you also want the server-local scan buttons to work, build the included container from the workspace root, not from this subdirectory. It ships Python and the scanner source with the Next.js app:

```bash
docker build -f ide-scanner-web/Dockerfile -t ide-scanner-web .
docker run --rm -p 8765:8765 ide-scanner-web
```

For full static package scanning, run the scanner on the user machine and upload the report to this website:

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
