# IDE Scanner Web

Local-first Next.js website for scanning installed VS Code-compatible extensions.

This project was bootstrapped with the official `create-next-app` template and uses:

- Next.js App Router
- TypeScript / TSX
- Next API routes
- The Python scanner engine from `../ide-scanner`

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
- `GET /api/scans/:id`
- `GET /api/scans/:id/report`


› The way of we display output is not good. Its a good security tool i think, its giving good data. But we are not
  able to build good UI/UX
