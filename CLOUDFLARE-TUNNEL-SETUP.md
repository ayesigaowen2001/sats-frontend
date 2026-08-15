# Cloudflare Tunnel Setup — SATS Camera Relay

This guide explains how to expose the multi-camera relay server to the internet
using a free Cloudflare Tunnel, so the deployed SATS Vercel frontend can access
streams from your on-site IP cameras.

## Architecture

```
IP Cameras (RTSP) ──▶ Local Machine (webcam-stream.py) ──▶ Cloudflare Tunnel ──▶ Public URL
                                                                                    │
                                                                      SATS Vercel Deployed Site
                                                                      (camera.streamUrl = tunnel URL)
```

All cameras share **one tunnel, one domain, zero subscription cost**.

## Active Setup

| Item          | Value                                      |
| ------------- | ------------------------------------------ |
| Tunnel name   | `sats-camera-relay`                        |
| Tunnel ID     | `4f01ac31-6379-4525-ae1e-3cccd6b8efbc`     |
| Config file   | `C:\Users\AYESIGA\.cloudflared\config.yml` |
| Domain        | `cameras.mugotrack.online`                 |
| Local service | `http://localhost:8080`                    |

**Stream URLs:**

| Camera       | streamUrl                                     |
| ------------ | --------------------------------------------- |
| Local Webcam | `http://localhost:8080/video/webcam`          |
| Front Gate   | `http://localhost:8080/video/ipcam-front`     |
| Perimeter    | `http://localhost:8080/video/ipcam-perimeter` |
| Phone Cam    | `http://192.168.0.119:8080`                   |

All `localhost:8080` URLs are rewritten by the frontend to:

```
https://cameras.mugotrack.online/video/{camera_id}
```

---

## Prerequisites

1. A Cloudflare account (free tier is fine)
2. A domain managed by Cloudflare DNS (e.g., `mugotrack.online`)
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

## Step 2: Add your domain to Cloudflare

1. Log into [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click **"Add a domain"** → enter your domain → choose the **Free** plan
3. Cloudflare will give you two nameservers — update these at your domain registrar
4. Wait for the confirmation email (usually 5-60 minutes)

## Step 3: Authenticate cloudflared

```bash
cloudflared tunnel login
```

This opens a browser — select your domain as the zone to authorize.

> The cert is saved to `C:\Users\AYESIGA\.cloudflared\cert.pem`

## Step 4: Create the tunnel

```bash
cloudflared tunnel create sats-camera-relay
```

Take note of the tunnel UUID in the output (e.g., `4f01ac31-6379-4525-ae1e-3cccd6b8efbc`).

## Step 5: Configure the tunnel

Create `C:\Users\AYESIGA\.cloudflared\config.yml`:

```yaml
tunnel: 4f01ac31-6379-4525-ae1e-3cccd6b8efbc
credentials-file: C:\Users\AYESIGA\.cloudflared\4f01ac31-6379-4525-ae1e-3cccd6b8efbc.json

ingress:
  - hostname: cameras.mugotrack.online
    service: http://localhost:8080
  - service: http_status:404
```

## Step 6: Create DNS record

```bash
cloudflared tunnel route dns sats-camera-relay cameras.mugotrack.online
```

This creates a CNAME record in Cloudflare DNS routing `cameras.mugotrack.online` to your tunnel.

## Step 7: Start the tunnel

```bash
cloudflared tunnel run sats-camera-relay
```

Output should show 4 connections registered across multiple Cloudflare edge locations:

```
INF Registered tunnel connection connIndex=0 location=nbo04 protocol=quic
INF Registered tunnel connection connIndex=1 location=jnb01 protocol=quic
INF Registered tunnel connection connIndex=2 location=jnb04 protocol=quic
INF Registered tunnel connection connIndex=3 location=nbo04 protocol=quic
```

Your streams are now available at:

- **`https://cameras.mugotrack.online/video/webcam`**
- **`https://cameras.mugotrack.online/video/ipcam-front`**
- etc.

## Step 8: Run the tunnel as a Windows service (optional)

To keep it running after logout:

```powershell
cloudflared service install
```

This installs cloudflared as a Windows service using the config at
`C:\Users\AYESIGA\.cloudflared\config.yml`.

## Step 9: Configure the deployed SATS frontend (Vercel)

Add the `NEXT_PUBLIC_CAMERA_RELAY_TUNNEL` environment variable in your
**Vercel project settings** so the stream player rewrites local camera URLs
to the Cloudflare Tunnel:

**Vercel Dashboard** → your project → Settings → Environment Variables → Add:

```
NEXT_PUBLIC_CAMERA_RELAY_TUNNEL=https://cameras.mugotrack.online
```

Then **redeploy** the project for the env var to take effect.

The frontend automatically detects URLs pointing to `localhost:8080` or any
LAN IP on port 8080 and replaces the origin with this value. The path is
preserved — so `http://localhost:8080/video/webcam` becomes
`https://cameras.mugotrack.online/video/webcam`.

**No database changes needed.** The same camera records work in both
environments:

- Local dev (no tunnel env var) → proxied through `/api/video-proxy`
- Deployed (tunnel env var set) → rewritten to Cloudflare Tunnel HTTPS URL

## Step 10: Configure SATS cameras (same records work everywhere)

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
# to reach https://cameras.mugotrack.online/video/{camera_id}
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
                                  https://cameras.mugotrack.online
                                                         │
                                                         │
┌────────────────────────────────────────────────────────┼────────────┐
│ REMOTE USERS                                           │            │
│                                                        ▼            │
│  SATS deployed (Vercel) ──▶ NEXT_PUBLIC_CAMERA_RELAY_TUNNEL rewrites│
│  camera URLs from localhost:8080 → cameras.mugotrack.online         │
└──────────────────────────────────────────────────────────────────────┘
```

**How URL resolution works:**

| Environment       | Env var set?     | `http://localhost:8080/video/webcam` becomes...                |
| ----------------- | ---------------- | -------------------------------------------------------------- |
| Local dev (:3000) | No (undefined)   | `/api/video-proxy?url=...` (Next.js proxy)                     |
| Deployed (Vercel) | Yes (tunnel URL) | `https://cameras.mugotrack.online/video/webcam` (direct HTTPS) |

---

## Alternative: TryCloudflare (no account/domain needed)

For quick testing without a Cloudflare account or domain:

```bash
cloudflared tunnel --url http://localhost:8080
```

This prints a temporary `*.trycloudflare.com` URL. **The URL changes every restart** — use the named tunnel setup above for production.

## Troubleshooting

| Problem                     | Solution                                                       |
| --------------------------- | -------------------------------------------------------------- |
| `cloudflared` not found     | Restart terminal or reinstall                                  |
| Tunnel starts but 502       | Ensure `python webcam-stream.py` is running                    |
| RTSP camera offline         | Check camera IP reachable from local machine, verify RTSP URL  |
| CORS errors in SATS         | The relay server already sets `Access-Control-Allow-Origin: *` |
| `cloudflared service` fails | Run PowerShell as Administrator                                |
