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

## Step 8: Configure SATS cameras

In the deployed SATS Render app, set each camera's `streamUrl`:

| Camera       | streamUrl                                              |
| ------------ | ------------------------------------------------------ |
| Local Webcam | `https://cameras.yourdomain.com/video/webcam`          |
| Front Gate   | `https://cameras.yourdomain.com/video/ipcam-front`     |
| Perimeter    | `https://cameras.yourdomain.com/video/ipcam-perimeter` |

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
