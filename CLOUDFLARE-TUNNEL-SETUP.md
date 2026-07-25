# Cloudflare Tunnel Setup — SATS Camera Relay

This guide explains how to expose the multi-camera relay server to the internet
using a free Cloudflare Tunnel, so the deployed SATS Render frontend can access
streams from your on-site IP cameras.

## Architecture

```
IP Cameras (RTSP) ──▶ Local Machine (webcam-stream.py) ──▶ Cloudflare Tunnel ──▶ Public URL
                                                                                    │
                                                                      SATS Render Deployed Site
                                                                      (camera.streamUrl = tunnel URL)
```

All cameras share **one tunnel, one domain, zero subscription cost**.

## Prerequisites

1. A Cloudflare account (free tier is fine)
2. A domain managed by Cloudflare DNS (or use a free `*.cfargotunnel.com` subdomain)
3. The `cloudflared` CLI installed on the local machine

## Step 1: Install cloudflared

**Windows (PowerShell as Admin):**

```powershell
winget install --id Cloudflare.cloudflared
```

Or download from: https://github.com/cloudflare/cloudflared/releases

Verify:

```bash
cloudflared --version
```

## Step 2: Authenticate with Cloudflare

```bash
cloudflared tunnel login
```

This opens a browser window. Authorize the app and select your domain.

## Step 3: Create the tunnel

```bash
cloudflared tunnel create sats-camera-relay
```

Take note of the tunnel UUID in the output.

## Step 4: Configure the tunnel

Create a `config.yml` (e.g., in `C:\Users\YOURNAME\.cloudflared\config.yml`):

```yaml
tunnel: <YOUR-TUNNEL-UUID>
credentials-file: C:\Users\YOURNAME\.cloudflared\<YOUR-TUNNEL-UUID>.json

ingress:
  - hostname: cameras.yourdomain.com
    service: http://localhost:8080
  - service: http_status:404
```

> If you don't have a custom domain, omit the `hostname` line and use the
> `*.cfargotunnel.com` URL that cloudflared prints when starting.

## Step 5: Create DNS record (custom domain only)

```bash
cloudflared tunnel route dns sats-camera-relay cameras.yourdomain.com
```

## Step 6: Start the tunnel

```bash
cloudflared tunnel run sats-camera-relay
```

Output:

```
INF Connection registered connIndex=0 ip=198.41.200.43 location=CPH
INF Registered tunnel connection ...
```

Your streams are now available at:

- **`https://cameras.yourdomain.com/video/webcam`**
- **`https://cameras.yourdomain.com/video/ipcam-front`**
- etc.

## Step 7: Run the tunnel as a Windows service (optional)

To keep it running after logout:

```powershell
cloudflared service install
```

This installs cloudflared as a Windows service using the config at
`C:\Users\YOURNAME\.cloudflared\config.yml`.

## Step 8: Configure the deployed SATS frontend

Add the `NEXT_PUBLIC_CAMERA_RELAY_TUNNEL` environment variable on the
deployed (Render) instance so the stream player rewrites local camera URLs
to the Cloudflare Tunnel:

```
NEXT_PUBLIC_CAMERA_RELAY_TUNNEL=https://cameras.yourdomain.com
```

The frontend automatically detects URLs pointing to `localhost:8080` or any
LAN IP on port 8080 and replaces the origin with this value. The path is
preserved — so `http://localhost:8080/video/webcam` becomes
`https://cameras.yourdomain.com/video/webcam`.

**No database changes needed.** The same camera records work in both
environments:

- Local dev (no tunnel env var) → proxied through `/api/video-proxy`
- Deployed (tunnel env var set) → rewritten to Cloudflare Tunnel HTTPS URL

## Step 9: Configure SATS cameras (same records work everywhere)

In the SATS app, set each camera's `streamUrl` to the **local relay**
address — the frontend rewrites it automatically for remote users:

| Camera       | streamUrl                                     |
| ------------ | --------------------------------------------- |
| Local Webcam | `http://localhost:8080/video/webcam`          |
| Front Gate   | `http://localhost:8080/video/ipcam-front`     |
| Perimeter    | `http://localhost:8080/video/ipcam-perimeter` |
| Phone Cam    | `http://192.168.0.119:8080`                   |

## Starting everything

```bash
# Terminal 1 — start the camera relay (on-site machine)
python webcam-stream.py --config cameras.json

# Terminal 2 — start the Cloudflare Tunnel
cloudflared tunnel run sats-camera-relay

# The deployed SATS app now uses NEXT_PUBLIC_CAMERA_RELAY_TUNNEL
# to reach https://cameras.yourdomain.com/video/{camera_id}
```

## Architecture (updated)

```
┌─────────────────────────────────────────────────────────────────────┐
│ ON-SITE MACHINE (Windows/Linux)                                      │
│                                                                      │
│  IP Cameras / Webcams ──▶ webcam-stream.py (:8080) ──▶ cloudflared  │
│                                    │                         │       │
│                                    │                         │       │
│  SATS local dev (:3000) ◀─────────╯               Cloudflare Tunnel │
│  (proxied via /api/video-proxy)                                      │
└─────────────────────────────────────────────────────────────────────┘
                                                         │
                                                         ▼
                                            https://cameras.yourdomain.com
                                                         │
                                                         │
┌────────────────────────────────────────────────────────┼────────────┐
│ REMOTE USERS                                           │            │
│                                                        ▼            │
│  SATS deployed (Render) ──▶ NEXT_PUBLIC_CAMERA_RELAY_TUNNEL rewrites │
│  camera URLs from localhost:8080 → https://cameras.yourdomain.com    │
└───────────────────────────────────────────────────────────────────────┘
```

**How URL resolution works:**

| Environment       | Env var set?     | `http://localhost:8080/video/webcam` becomes...              |
| ----------------- | ---------------- | ------------------------------------------------------------ |
| Local dev (:3000) | No (undefined)   | `/api/video-proxy?url=...` (Next.js proxy)                   |
| Deployed (Render) | Yes (tunnel URL) | `https://cameras.yourdomain.com/video/webcam` (direct HTTPS) |

## Starting everything

```bash
# Terminal 1 — start the camera relay
python webcam-stream.py --config cameras.json

# Terminal 2 — start the tunnel
cloudflared tunnel run sats-camera-relay
```

## Troubleshooting

| Problem                 | Solution                                                       |
| ----------------------- | -------------------------------------------------------------- |
| `cloudflared` not found | Restart terminal or reinstall                                  |
| Tunnel starts but 502   | Ensure `python webcam-stream.py` is running                    |
| RTSP camera offline     | Check camera IP reachable from local machine, verify RTSP URL  |
| CORS errors in SATS     | The relay server already sets `Access-Control-Allow-Origin: *` |
