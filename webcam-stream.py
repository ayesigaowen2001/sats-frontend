"""
Multi-Camera MJPEG Relay Server for SATS Video Monitoring.

Usage:
    python webcam-stream.py --config cameras.json [--port PORT]

Each camera defined in the config file gets its own stream endpoint at:
    /video/{camera-id}

All streams are served as MJPEG (multipart/x-mixed-replace) compatible with
the SATS `<img>` player. A single Cloudflare Tunnel exposes all streams.

Endpoints:
    GET  /                          — Control panel listing all cameras
    GET  /video/{camera_id}         — Raw MJPEG stream for a specific camera
    POST /api/{camera_id}/record/start   — Start recording
    POST /api/{camera_id}/record/stop    — Stop recording
    GET  /api/{camera_id}/status        — Camera status & settings
    GET  /api/{camera_id}/settings      — Read image settings
    POST /api/{camera_id}/settings      — Update image settings
    GET  /recordings/{filename}         — Download a saved recording
"""

import argparse
import datetime
import http.server
import json
import os
import socketserver
import threading
import time
from typing import Any

import cv2

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
DEFAULT_PORT = 8080
DEFAULT_CONFIG = "cameras.json"
RECORDINGS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "recordings")

# ---------------------------------------------------------------------------
# Camera config model
# ---------------------------------------------------------------------------
class CameraConfig:
    __slots__ = ("id", "name", "source", "width", "height")

    id: str
    name: str
    source: str
    width: int
    height: int

    def __init__(self, raw: dict[str, Any]) -> None:
        self.id = str(raw.get("id", ""))
        self.name = str(raw.get("name", self.id))
        self.source = str(raw.get("source", "0"))
        try:
            w_str, h_str = str(raw.get("resolution", "640x480")).split("x")
            self.width = int(w_str)
            self.height = int(h_str)
        except (ValueError, AttributeError):
            self.width = 640
            self.height = 480

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "source": self.source,
            "width": self.width,
            "height": self.height,
        }

    @staticmethod
    def from_dict_list(items: list[dict[str, Any]]) -> list["CameraConfig"]:
        return [CameraConfig(item) for item in items]


# ---------------------------------------------------------------------------
# Camera instance (one per config entry)
# ---------------------------------------------------------------------------
class CameraInstance:
    """Holds the VideoCapture, recording state, and settings for one camera."""

    def __init__(self, cfg: CameraConfig) -> None:
        self.config = cfg
        self.capture: cv2.VideoCapture | None = None
        self.lock = threading.Lock()
        self.recording = False
        self.recorder: cv2.VideoWriter | None = None
        self.record_start_time: float | None = None
        self.record_filename = ""
        self.settings: dict[str, float] = {
            "brightness": 1.0,
            "contrast": 1.0,
            "saturation": 1.0,
            "blur": 0.0,
        }
        self.connected = False

    def open(self) -> bool:
        """Open the VideoCapture source (webcam index or RTSP URL)."""
        src = self.config.source
        # If it looks like an integer, treat as webcam index
        try:
            index = int(src)
            self.capture = cv2.VideoCapture(index)
        except ValueError:
            self.capture = cv2.VideoCapture(src)

        if not self.capture.isOpened():
            self.connected = False
            return False

        self.capture.set(cv2.CAP_PROP_FRAME_WIDTH, self.config.width)
        self.capture.set(cv2.CAP_PROP_FRAME_HEIGHT, self.config.height)
        self.connected = True
        return True

    def close(self) -> None:
        with self.lock:
            self.connected = False
            if self.recording and self.recorder:
                self.recorder.release()
                self.recorder = None
                self.recording = False
            if self.capture:
                self.capture.release()
                self.capture = None

    def read_frame(self):
        """Returns (ok, frame) or (False, None). Applies settings on success."""
        with self.lock:
            if self.capture is None or not self.capture.isOpened():
                return False, None
            ok, frame = self.capture.read()
            if not ok:
                return False, None
            frame = self._apply_settings(frame)
            return True, frame

    def write_record_frame(self, frame) -> None:
        with self.lock:
            if self.recording and self.recorder:
                try:
                    self.recorder.write(frame)
                except Exception:
                    pass

    def start_recording(self) -> tuple[bool, str]:
        with self.lock:
            if self.recording:
                return False, "Already recording"
            os.makedirs(RECORDINGS_DIR, exist_ok=True)
            ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            self.record_filename = f"{self.config.id}_{ts}.mp4"
            path = os.path.join(RECORDINGS_DIR, self.record_filename)
            fourcc = cv2.VideoWriter_fourcc(*"mp4v")
            fps = 30.0
            if self.capture and self.capture.isOpened():
                fps = self.capture.get(cv2.CAP_PROP_FPS) or 30.0
            self.recorder = cv2.VideoWriter(
                path, fourcc, fps, (self.config.width, self.config.height)
            )
            if not self.recorder.isOpened():
                self.recorder = None
                return False, "Could not create video file"
            self.recording = True
            self.record_start_time = time.time()
        print(f"[recording] {self.config.id} — started → {path}")
        return True, self.record_filename

    def stop_recording(self) -> dict[str, Any]:
        with self.lock:
            if not self.recording:
                return {"ok": False, "error": "Not recording"}
            self.recording = False
            if self.recorder:
                self.recorder.release()
                self.recorder = None
            dur = time.time() - (self.record_start_time or time.time())
            fname = self.record_filename
            self.record_start_time = None
            self.record_filename = ""
        print(f"[recording] {self.config.id} — stopped ({round(dur, 1)}s)")
        return {"ok": True, "filename": fname, "duration": round(dur, 1)}

    def status(self) -> dict[str, Any]:
        dur = 0.0
        if self.recording and self.record_start_time:
            dur = time.time() - self.record_start_time
        return {
            "cameraId": self.config.id,
            "cameraName": self.config.name,
            "connected": self.connected,
            "recording": self.recording,
            "recordingDuration": round(dur, 1),
            "recordingFilename": self.record_filename,
            "width": self.config.width,
            "height": self.config.height,
            "settings": self.settings,
        }

    def update_settings(self, body: dict[str, Any]) -> None:
        allowed = {"brightness", "contrast", "saturation", "blur"}
        with self.lock:
            for key in allowed:
                if key in body:
                    val = float(body[key])
                    self.settings[key] = max(0.0, min(3.0, val))

    # --- helpers -----------------------------------------------------------
    def _apply_settings(self, frame):
        b = self.settings["brightness"]
        c = self.settings["contrast"]
        s = self.settings["saturation"]
        bl = self.settings["blur"]

        if abs(b - 1.0) > 0.01 or abs(c - 1.0) > 0.01:
            frame = cv2.convertScaleAbs(frame, alpha=c, beta=(b - 1.0) * 255)
        if abs(s - 1.0) > 0.01 and len(frame.shape) == 3 and frame.shape[2] == 3:
            hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV).astype("float32")
            hsv[:, :, 1] = (hsv[:, :, 1] * s).clip(0, 255)
            frame = cv2.cvtColor(hsv.astype("uint8"), cv2.COLOR_HSV2BGR)
        if bl > 0:
            ksize = int(bl * 2) | 1
            if ksize < 3:
                ksize = 3
            frame = cv2.GaussianBlur(frame, (ksize, ksize), 0)
        return frame


# ---------------------------------------------------------------------------
# Camera registry (shared across handler instances)
# ---------------------------------------------------------------------------
class CameraRegistry:
    cameras: dict[str, CameraInstance] = {}
    lock = threading.Lock()

    @classmethod
    def init(cls, configs: list[CameraConfig]) -> list[str]:
        errors: list[str] = []
        with cls.lock:
            cls.cameras.clear()
            for cfg in configs:
                inst = CameraInstance(cfg)
                if inst.open():
                    cls.cameras[cfg.id] = inst
                    print(f"  ✅ {cfg.id} — {inst.config.width}x{inst.config.height}")
                else:
                    errors.append(f"  ❌ {cfg.id} — could not open source '{cfg.source}'")
        return errors

    @classmethod
    def get(cls, camera_id: str) -> CameraInstance | None:
        with cls.lock:
            return cls.cameras.get(camera_id)

    @classmethod
    def shutdown(cls) -> None:
        with cls.lock:
            for inst in cls.cameras.values():
                inst.close()
            cls.cameras.clear()


# ---------------------------------------------------------------------------
# HTTP request handler
# ---------------------------------------------------------------------------
class RelayHandler(http.server.BaseHTTPRequestHandler):
    """Routes requests to the correct camera based on URL prefix."""

    def _set_headers(self, status=200, content_type="text/html") -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.end_headers()

    def _json(self, data: dict, status=200) -> None:
        self._set_headers(status, "application/json")
        self.wfile.write(json.dumps(data).encode())

    def _camera_from_path(self) -> tuple[str | None, str | None]:
        """Parse /video/{id} or /api/{id}/... from the URL path. Returns (camera_id, sub_path)."""
        parts = self.path.strip("/").split("/", 2)
        if len(parts) >= 2 and parts[0] in ("video", "api"):
            return parts[1], parts[2] if len(parts) > 2 else ""
        return None, None

    # ---- Routing -----------------------------------------------------------

    def do_GET(self):
        camera_id, sub = self._camera_from_path()

        if self.path in ("/", "/index.html"):
            return self._control_panel()
        if camera_id and self.path.startswith("/video/"):
            return self._stream(camera_id)
        if camera_id and self.path.startswith("/api/") and sub == "status":
            return self._api_status(camera_id)
        if camera_id and self.path.startswith("/api/") and sub == "settings":
            return self._api_get_settings(camera_id)
        if self.path.startswith("/recordings/"):
            return self._serve_recording()
        if self.path == "/api/status":
            return self._api_all_status()

        self._set_headers(404)
        self.wfile.write(b"Not Found")

    def do_POST(self):
        camera_id, sub = self._camera_from_path()
        if camera_id and sub == "record/start":
            return self._record_start(camera_id)
        if camera_id and sub == "record/stop":
            return self._record_stop(camera_id)
        if camera_id and sub == "settings":
            return self._api_update_settings(camera_id)
        self._set_headers(404)
        self.wfile.write(b"Not Found")

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    # ---- MJPEG stream ------------------------------------------------------
    def _stream(self, camera_id: str):
        cam = CameraRegistry.get(camera_id)
        if cam is None:
            self._set_headers(404)
            self.wfile.write(b"Camera not found")
            return

        self._set_headers(200, "multipart/x-mixed-replace; boundary=frame")
        reconnect_interval = 5.0  # seconds between reconnect attempts for RTSP

        while True:
            ok, frame = cam.read_frame()
            if not ok:
                # Try to reopen the source (important for RTSP disconnects)
                time.sleep(reconnect_interval)
                cam.close()
                if cam.open():
                    continue
                break

            cam.write_record_frame(frame)

            _ok, jpeg = cv2.imencode(".jpg", frame)
            if not _ok:
                continue

            try:
                self.wfile.write(b"--frame\r\n")
                self.wfile.write(b"Content-Type: image/jpeg\r\n\r\n")
                self.wfile.write(jpeg.tobytes())
                self.wfile.write(b"\r\n")
            except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError, OSError):
                break

    # ---- API endpoints per camera ------------------------------------------
    def _api_status(self, camera_id: str):
        cam = CameraRegistry.get(camera_id)
        if cam is None:
            return self._json({"error": "Camera not found"}, 404)
        self._json(cam.status())

    def _api_all_status(self):
        cameras_status = [
            cam.status() for cam in CameraRegistry.cameras.values()
        ]
        self._json({"cameras": cameras_status})

    def _api_get_settings(self, camera_id: str):
        cam = CameraRegistry.get(camera_id)
        if cam is None:
            return self._json({"error": "Camera not found"}, 404)
        self._json(cam.settings)

    def _api_update_settings(self, camera_id: str):
        cam = CameraRegistry.get(camera_id)
        if cam is None:
            return self._json({"error": "Camera not found"}, 404)
        length = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(length)) if length else {}
        cam.update_settings(body)
        self._json({"ok": True, "settings": cam.settings})

    def _record_start(self, camera_id: str):
        cam = CameraRegistry.get(camera_id)
        if cam is None:
            return self._json({"error": "Camera not found"}, 404)
        ok, msg = cam.start_recording()
        if ok:
            self._json({"ok": True, "filename": msg})
        else:
            self._json({"ok": False, "error": msg}, 409)

    def _record_stop(self, camera_id: str):
        cam = CameraRegistry.get(camera_id)
        if cam is None:
            return self._json({"error": "Camera not found"}, 404)
        result = cam.stop_recording()
        self._json(result, 200 if result["ok"] else 409)

    def _serve_recording(self):
        filename = os.path.basename(self.path[len("/recordings/"):])
        path = os.path.join(RECORDINGS_DIR, filename)
        if not os.path.isfile(path):
            self._set_headers(404)
            self.wfile.write(b"File not found")
            return
        self.send_response(200)
        self.send_header("Content-Type", "video/mp4")
        self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
        self.send_header("Content-Length", str(os.path.getsize(path)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        with open(path, "rb") as f:
            self.wfile.write(f.read())

    # ---- Control panel -----------------------------------------------------
    def _control_panel(self):
        self._set_headers(200, "text/html")
        port = self.server.server_address[1]

        camera_cards = ""
        for cam in CameraRegistry.cameras.values():
            cfg = cam.config
            camera_cards += f"""\
      <div class="card cam-card" data-cam-id="{cfg.id}">
        <h3>{cfg.name} <span class="badge" id="badge-{cfg.id}">{'● Live' if cam.connected else '● Offline'}</span></h3>
        <div class="video-box">
          <img src="/video/{cfg.id}" alt="{cfg.name}" />
        </div>
        <p class="info-line" style="margin-top:6px;">Stream URL: <code>http://localhost:{port}/video/{cfg.id}</code></p>
        <div class="row" style="margin-top:8px;">
          <button class="record" id="rec-start-{cfg.id}" onclick="startRecording('{cfg.id}')">⏺ Start</button>
          <button class="stop"   id="rec-stop-{cfg.id}" disabled onclick="stopRecording('{cfg.id}')">⏹ Stop</button>
          <button class="download" id="rec-dl-{cfg.id}" disabled onclick="downloadRecording('{cfg.id}')">⬇ Download</button>
        </div>
        <p id="rec-info-{cfg.id}" class="info-line" style="margin-top:6px;"></p>
        <div class="row" style="gap:16px;margin-top:10px;">
          <label>Brightness <span id="val-brightness-{cfg.id}">1.00</span>
            <input type="range" id="sl-br-{cfg.id}" min="0" max="3" step="0.05" value="1"
                   oninput="onSliderChange('{cfg.id}')">
          </label>
          <label>Contrast <span id="val-contrast-{cfg.id}">1.00</span>
            <input type="range" id="sl-ct-{cfg.id}" min="0" max="3" step="0.05" value="1"
                   oninput="onSliderChange('{cfg.id}')">
          </label>
          <label>Saturation <span id="val-saturation-{cfg.id}">1.00</span>
            <input type="range" id="sl-st-{cfg.id}" min="0" max="3" step="0.05" value="1"
                   oninput="onSliderChange('{cfg.id}')">
          </label>
          <label>Blur <span id="val-blur-{cfg.id}">0.0</span>
            <input type="range" id="sl-bl-{cfg.id}" min="0" max="3" step="0.1" value="0"
                   oninput="onSliderChange('{cfg.id}')">
          </label>
          <button onclick="resetSettings('{cfg.id}')">↺ Reset</button>
        </div>
      </div>"""

        html = f"""\
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SATS Camera Relay</title>
<style>
  *,*::before,*::after{{box-sizing:border-box;margin:0;padding:0;}}
  body{{background:#0d1117;color:#c9d1d9;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;padding:20px;}}
  .container{{max-width:1400px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(420px,1fr));gap:20px;}}
  h2{{grid-column:1/-1;font-size:1.5rem;color:#f0f6fc;margin-bottom:4px;}}
  .subtitle{{grid-column:1/-1;color:#8b949e;font-size:0.85rem;margin-bottom:8px;}}
  .card{{background:#161b22;border:1px solid #30363d;border-radius:12px;padding:16px;}}
  .card h3{{font-size:0.85rem;text-transform:uppercase;letter-spacing:0.06em;color:#8b949e;margin-bottom:10px;display:flex;justify-content:space-between;}}
  .video-box{{background:#000;border:1px solid #30363d;border-radius:8px;overflow:hidden;}}
  .video-box img{{width:100%;display:block;aspect-ratio:4/3;object-fit:contain;}}
  .row{{display:flex;flex-wrap:wrap;gap:8px;align-items:center;}}
  button{{font-size:0.75rem;font-weight:600;padding:6px 12px;border-radius:6px;border:1px solid #30363d;background:#21262d;color:#c9d1d9;cursor:pointer;transition:0.15s;}}
  button:hover{{background:#30363d;}}
  button.record{{border-color:#da3633;color:#f85149;}} button.record.active{{background:#da3633;color:#fff;}}
  button.stop{{border-color:#d29922;color:#d29922;}} button.stop.active{{background:#d29922;color:#fff;}}
  button.download{{border-color:#238636;color:#3fb950;}}
  button:disabled{{opacity:0.4;cursor:not-allowed;}}
  .badge{{font-size:0.68rem;padding:2px 8px;border-radius:20px;background:#21262d;border:1px solid #30363d;}}
  label{{font-size:0.72rem;color:#8b949e;display:flex;flex-direction:column;gap:3px;}}
  input[type=range]{{width:90px;}}
  .info-line{{font-size:0.72rem;color:#8b949e;}}
  .info-line code{{color:#58a6ff;word-break:break-all;}}
</style>
</head>
<body>
<div class="container">
  <h2>📹 SATS Camera Relay</h2>
  <p class="subtitle">Port {port} · {len(CameraRegistry.cameras)} cameras online</p>
  {camera_cards}
</div>
<script>
const BASE = '';
const timers = {{}};
const lastFil: Record<string, string> = {{}};

async function api(path, method='GET', body) {{
  const opts = {{ method, headers: {{}} }};
  if (body) {{ opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }}
  const r = await fetch(BASE + path, opts);
  return r.json();
}}

// ---- Recording ---------------------------------------------------------
async function startRecording(camId) {{
  const res = await api('/api/' + camId + '/record/start', 'POST');
  if (res.ok) {{ lastFil[camId] = res.filename; setRecUI(camId, true); }}
  else alert(res.error || 'Failed');
}}
async function stopRecording(camId) {{
  const res = await api('/api/' + camId + '/record/stop', 'POST');
  if (res.ok) {{
    setRecUI(camId, false);
    document.getElementById('rec-info-' + camId).innerHTML =
      'Saved <code>' + res.filename + '</code> (' + res.duration + 's)';
  }}
}}
function downloadRecording(camId) {{
  if (lastFil[camId]) window.open('/recordings/' + encodeURIComponent(lastFil[camId]), '_blank');
}}
function setRecUI(camId, active) {{
  document.getElementById('rec-start-' + camId).disabled = active;
  document.getElementById('rec-stop-' + camId).disabled = !active;
  document.getElementById('rec-dl-' + camId).disabled = true;
  if (active) {{
    document.getElementById('rec-start-' + camId).classList.add('active');
    document.getElementById('rec-stop-' + camId).classList.add('active');
  }} else {{
    document.getElementById('rec-start-' + camId).classList.remove('active');
    document.getElementById('rec-stop-' + camId).classList.remove('active');
  }}
}}

// ---- Settings -----------------------------------------------------------
function onSliderChange(camId) {{
  clearTimeout(timers[camId]);
  timers[camId] = setTimeout(() => syncSettings(camId), 120);
}}
async function syncSettings(camId) {{
  const s = {{
    brightness: parseFloat(document.getElementById('sl-br-'+camId).value),
    contrast:   parseFloat(document.getElementById('sl-ct-'+camId).value),
    saturation: parseFloat(document.getElementById('sl-st-'+camId).value),
    blur:       parseFloat(document.getElementById('sl-bl-'+camId).value),
  }};
  document.getElementById('val-brightness-'+camId).textContent = s.brightness.toFixed(2);
  document.getElementById('val-contrast-'+camId).textContent   = s.contrast.toFixed(2);
  document.getElementById('val-saturation-'+camId).textContent  = s.saturation.toFixed(2);
  document.getElementById('val-blur-'+camId).textContent        = s.blur.toFixed(1);
  await api('/api/' + camId + '/settings', 'POST', s);
}}
async function resetSettings(camId) {{
  document.getElementById('sl-br-'+camId).value = 1;
  document.getElementById('sl-ct-'+camId).value = 1;
  document.getElementById('sl-st-'+camId).value = 1;
  document.getElementById('sl-bl-'+camId).value = 0;
  await syncSettings(camId);
}}

// ---- Init ---------------------------------------------------------------
(async function init() {{
  const all = await api('/api/status');
  for (const c of (all.cameras || [])) {{
    const id = c.cameraId;
    if (c.recording) {{ lastFil[id] = c.recordingFilename; setRecUI(id, true); }}
    if (c.settings) {{
      document.getElementById('sl-br-'+id).value = c.settings.brightness || 1;
      document.getElementById('sl-ct-'+id).value = c.settings.contrast || 1;
      document.getElementById('sl-st-'+id).value = c.settings.saturation || 1;
      document.getElementById('sl-bl-'+id).value = c.settings.blur || 0;
    }}
    syncSettings(id);
  }}
}})();
</script>
</body>
</html>"""
        self.wfile.write(html.encode())

    def log_message(self, format, *args):  # noqa: A002
        return


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="Multi-camera MJPEG relay server")
    parser.add_argument(
        "--config", default=DEFAULT_CONFIG,
        help=f"Path to cameras.json config file (default: {DEFAULT_CONFIG})",
    )
    parser.add_argument(
        "--port", type=int, default=DEFAULT_PORT,
        help=f"Port to listen on (default: {DEFAULT_PORT})",
    )
    args = parser.parse_args()

    # Load config
    config_path = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), args.config
    ) if not os.path.isabs(args.config) else args.config

    try:
        with open(config_path, encoding="utf-8") as f:
            raw = json.load(f)
    except FileNotFoundError as exc:
        raise SystemExit(
            f"Config file not found: {config_path}. "
            "Copy cameras.json.example or create your own."
        ) from exc
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Invalid JSON in config file: {exc}") from exc

    configs = CameraConfig.from_dict_list(raw)
    if not configs:
        raise SystemExit("Config file contains no camera entries.")

    # Init cameras
    print(f"Loading {len(configs)} camera(s) from {config_path}...")
    errors = CameraRegistry.init(configs)
    for err in errors:
        print(err)

    if not CameraRegistry.cameras:
        raise SystemExit("No cameras could be opened. Check config and connectivity.")

    os.makedirs(RECORDINGS_DIR, exist_ok=True)
    print(f"\nRelay server running on http://localhost:{args.port}")
    print(f"Control panel:    http://localhost:{args.port}/")
    print(f"Recordings dir:   {RECORDINGS_DIR}")
    print("Endpoints:")
    for cam_id in CameraRegistry.cameras:
        print(f"  /video/{cam_id}")
    print("\nPress Ctrl+C to stop.")

    with socketserver.ThreadingTCPServer(("", args.port), RelayHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down...")
        finally:
            CameraRegistry.shutdown()


if __name__ == "__main__":
    main()