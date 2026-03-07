# NetPulse Local Agent (Windows)

Lightweight local HTTP agent for NetPulse.

- Runtime: Node.js + TypeScript
- Bind: `127.0.0.1:5055` only
- Auth: `X-NETPULSE-TOKEN`
- Platform: Windows

## 1) Setup

```powershell
cd local-agent
npm install
```

Set token (PowerShell):

```powershell
$env:NETPULSE_TOKEN="your-strong-shared-token"
```

## 2) Run (dev)

```powershell
npm run dev
```

## 3) Build + Run (prod)

```powershell
npm run build
npm run start
```

Starts server on:

- `http://127.0.0.1:5055`

## 4) Endpoints

- `GET /health`
- `GET /network/info`
- `GET /scan/devices`
- `GET /ping?host=192.168.1.1`
- `POST /terminal/run`

All except `/health` require header:

- `X-NETPULSE-TOKEN: <NETPULSE_TOKEN>`

## 5) Example requests

```powershell
curl http://127.0.0.1:5055/health
```

```powershell
curl -H "X-NETPULSE-TOKEN: your-strong-shared-token" http://127.0.0.1:5055/network/info
```

```powershell
curl -H "X-NETPULSE-TOKEN: your-strong-shared-token" "http://127.0.0.1:5055/ping?host=192.168.1.1"
```

```powershell
curl -X POST http://127.0.0.1:5055/terminal/run `
  -H "Content-Type: application/json" `
  -H "X-NETPULSE-TOKEN: your-strong-shared-token" `
  -d "{\"cmd\":\"ipconfig\",\"args\":\"\"}"
```

## 6) Optional: Windows service

Use NSSM:

1. Install NSSM.
2. Create service pointing to `node.exe`.
3. Arguments: `dist/index.js`
4. Startup directory: `...\netpulse-web\local-agent`
5. Add environment variable `NETPULSE_TOKEN`.
6. Start service and set startup type to Automatic.

