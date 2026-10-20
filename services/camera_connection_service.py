import os
import re
import json
import socket
import ipaddress
import logging
import time
from datetime import datetime, timezone
from urllib.parse import urlparse, quote, urlunparse
from typing import Dict, Any, Optional, List, Tuple
import urllib3
import requests
from requests.auth import HTTPBasicAuth

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

from database.database import SessionLocal, engine, Base
from database.models import CameraSetting

logger = logging.getLogger("camera_connection_service")

CAMERA_SETTINGS_FILE = os.path.join("data", "camera_settings.json")
DEFAULT_CAMERA_ID = "IP-WEBCAM-01"

# SSRF Protection: Denied IP ranges and hosts
FORBIDDEN_HOSTS = {
    "169.254.169.254", # AWS/GCP/Azure instance metadata
    "metadata.google.internal",
    "instance-data",
}

class CameraConnectionService:
    def __init__(self):
        os.makedirs("data", exist_ok=True)
        try:
            Base.metadata.create_all(bind=engine)
        except Exception as e:
            logger.debug(f"[CameraConnectionService] create_all notice: {e}")

    # ─────────────────────────────────────────────────────────────────────────
    # Validation & URL Construction
    # ─────────────────────────────────────────────────────────────────────────

    def validate_host(self, host: str) -> str:
        """
        Validates host/IP for local network safety and SSRF prevention.
        Only RFC 1918 private IPv4 addresses, loopback, or valid local hostnames are allowed.
        Public internet endpoints and cloud metadata endpoints are strictly rejected.
        """
        if not host or not isinstance(host, str):
            raise ValueError("Hostname or IPv4 address cannot be empty.")

        clean_host = host.strip().lower()

        # Strip protocol if user mistakenly typed 'http://192.168.1.5'
        if "://" in clean_host:
            parsed = urlparse(clean_host)
            clean_host = parsed.hostname or clean_host
            if ":" in clean_host:
                clean_host = clean_host.split(":")[0]

        if clean_host in FORBIDDEN_HOSTS:
            raise ValueError(f"Access to '{clean_host}' is forbidden for security (cloud metadata endpoint).")

        # Check if valid IP
        try:
            ip = ipaddress.ip_address(clean_host)
            if ip.version != 4:
                raise ValueError("Only IPv4 addresses are currently supported for local camera networking.")

            # Reject cloud metadata link-local address explicitly (169.254.0.0/16)
            if ip.is_link_local:
                raise ValueError(f"Link-local address '{clean_host}' is forbidden.")

            # Allow loopback (127.0.0.1) for testing or private local Wi-Fi networks (RFC 1918)
            if not (ip.is_private or ip.is_loopback):
                raise ValueError(
                    f"IP address '{clean_host}' is a public WAN address. "
                    "This system only supports local same-Wi-Fi cameras (RFC 1918 private subnets: 192.168.x.x, 10.x.x.x, 172.16-31.x.x)."
                )

            return clean_host
        except ValueError as e:
            # If not an IP, validate as hostname
            if "does not appear to be an IPv4" in str(e):
                pass
            elif "Only IPv4" in str(e) or "forbidden" in str(e) or "public WAN" in str(e):
                raise

        # Hostname validation
        if not re.match(r"^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$", clean_host):
            raise ValueError(f"Invalid hostname format: '{clean_host}'")

        # Resolve DNS with safety check
        try:
            resolved_ip = socket.gethostbyname(clean_host)
            ip_obj = ipaddress.ip_address(resolved_ip)
            if ip_obj.is_link_local or resolved_ip in FORBIDDEN_HOSTS:
                raise ValueError(f"Hostname '{clean_host}' resolves to forbidden address '{resolved_ip}'.")
            if not (ip_obj.is_private or ip_obj.is_loopback):
                raise ValueError(
                    f"Hostname '{clean_host}' resolves to public WAN IP '{resolved_ip}'. Local network cameras only."
                )
        except socket.gaierror:
            # In unit tests or offline environments, local hostname resolution may not be active;
            # allow standard .local or localhost names if formatted correctly
            if not (clean_host.endswith(".local") or clean_host == "localhost"):
                raise ValueError(f"Hostname '{clean_host}' could not be resolved on the local network.")

        return clean_host

    def validate_port(self, port: Any) -> int:
        """Validates HTTP port number (1-65535, default 8080)."""
        if port is None or port == "":
            return 8080
        try:
            p = int(port)
            if p < 1 or p > 65535:
                raise ValueError()
            return p
        except Exception:
            raise ValueError(f"Invalid port '{port}'. Port must be an integer between 1 and 65535.")

    def validate_path(self, path: Optional[str]) -> str:
        """Validates stream path (default /videofeed)."""
        if not path or not path.strip():
            return "/videofeed"
        clean = path.strip()
        if not clean.startswith("/"):
            clean = "/" + clean
        if ".." in clean:
            raise ValueError("Directory traversal in stream path is forbidden.")
        if not re.match(r"^/[a-zA-Z0-9_\-\./]*$", clean):
            raise ValueError(f"Invalid characters in stream path '{path}'.")
        return clean

    def build_stream_url(
        self,
        host: Optional[str],
        port: int = 8080,
        path: str = "/videofeed",
        username: Optional[str] = None,
        password: Optional[str] = None,
        scheme: str = "http",
        mask_credentials: bool = False
    ) -> Optional[str]:
        """
        Constructs the full stream URL.
        If host is None or empty, returns None (unconfigured).
        """
        if not host:
            return None

        clean_scheme = scheme.lower() if scheme else "http"
        clean_host = host
        if "://" in host:
            parsed = urlparse(host)
            if parsed.scheme.lower() in ("http", "https"):
                clean_scheme = parsed.scheme.lower()
            clean_host = parsed.hostname or host

        clean_host = self.validate_host(clean_host)
        clean_path = self.validate_path(path)
        clean_port = self.validate_port(port)

        if username and password:
            if mask_credentials:
                auth_part = "****:****@"
            else:
                user_enc = quote(username, safe="")
                pass_enc = quote(password, safe="")
                auth_part = f"{user_enc}:{pass_enc}@"
            return f"{clean_scheme}://{auth_part}{clean_host}:{clean_port}{clean_path}"
        elif username:
            auth_part = f"{quote(username, safe='')}@"
            return f"{clean_scheme}://{auth_part}{clean_host}:{clean_port}{clean_path}"
        else:
            return f"{clean_scheme}://{clean_host}:{clean_port}{clean_path}"

    def normalize_stream_url(self, raw_url: str) -> str:
        """
        Normalizes any user-entered camera URL or address:
        - Ensures scheme (defaults to http:// or preserves https://)
        - Validates host against SSRF and RFC 1918 private IP guardrails
        - Ensures a valid video stream path is present (defaults to /videofeed if path is empty or '/')
        """
        if not raw_url or not isinstance(raw_url, str) or not raw_url.strip():
            raise ValueError("Camera URL cannot be empty.")

        s = raw_url.strip()
        # If user didn't provide scheme, e.g. '10.61.181.231:8080'
        if not re.match(r"^[a-zA-Z0-9+-.]+://", s):
            s = f"http://{s}"

        parsed = urlparse(s)
        scheme = parsed.scheme.lower()
        if scheme not in ("http", "https"):
            scheme = "http"

        raw_host = parsed.hostname
        if not raw_host:
            raise ValueError(f"Could not extract valid hostname from '{raw_url}'.")

        clean_host = self.validate_host(raw_host)
        clean_port = self.validate_port(parsed.port) if parsed.port else 8080

        # Validate and fix path: if missing, empty, or just '/', append '/videofeed'
        path = parsed.path
        if not path or path == "/" or not path.strip():
            path = "/videofeed"
        else:
            path = self.validate_path(path)

        query_str = f"?{parsed.query}" if parsed.query else ""

        auth_part = ""
        if parsed.username and parsed.password:
            auth_part = f"{quote(parsed.username, safe='')}:{quote(parsed.password, safe='')}@"
        elif parsed.username:
            auth_part = f"{quote(parsed.username, safe='')}@"

        return f"{scheme}://{auth_part}{clean_host}:{clean_port}{path}{query_str}"

    def mask_url(self, url: Optional[str]) -> Optional[str]:
        """Masks username:password credentials in a URL for safe logging and UI display."""
        if not url:
            return None
        return re.sub(r"://([^:@]+):([^@]+)@", r"://****:****@", url)

    # ─────────────────────────────────────────────────────────────────────────
    # Persistence (DB + JSON fallback)
    # ─────────────────────────────────────────────────────────────────────────

    def get_configuration(self, camera_id: str = DEFAULT_CAMERA_ID) -> Dict[str, Any]:
        """
        Retrieves the persistent camera configuration from database or JSON fallback.
        Passwords are included only internally; callers must use get_public_configuration
        when serializing responses to the dashboard.
        """
        # 1. Try SQLite
        try:
            db = SessionLocal()
            try:
                setting = db.query(CameraSetting).filter(CameraSetting.camera_id == camera_id).first()
                if setting:
                    return {
                        "camera_id": setting.camera_id,
                        "name": setting.name or "Android IP Webcam",
                        "host": setting.host,
                        "port": setting.port or 8080,
                        "path": setting.path or "/videofeed",
                        "username": setting.username,
                        "password": setting.password,
                        "auto_reconnect": bool(setting.auto_reconnect),
                        "is_connected": bool(setting.is_connected),
                        "last_connected_at": setting.last_connected_at,
                        "last_error": setting.last_error,
                        "updated_at": setting.updated_at,
                        "source": "database"
                    }
            finally:
                db.close()
        except Exception as e:
            logger.debug(f"[CameraConnectionService] DB read notice: {e}")

        # 2. Try JSON fallback
        if os.path.exists(CAMERA_SETTINGS_FILE):
            try:
                with open(CAMERA_SETTINGS_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    cam = data.get(camera_id) or data.get("default")
                    if cam:
                        cam["source"] = "json_file"
                        return cam
            except Exception as e:
                logger.debug(f"[CameraConnectionService] JSON read notice: {e}")

        # 3. Unconfigured Default
        return {
            "camera_id": camera_id,
            "name": "Android IP Webcam",
            "host": None,
            "port": 8080,
            "path": "/videofeed",
            "username": None,
            "password": None,
            "auto_reconnect": True,
            "is_connected": False,
            "last_connected_at": None,
            "last_error": None,
            "updated_at": None,
            "source": "unconfigured"
        }

    def get_public_configuration(self, camera_id: str = DEFAULT_CAMERA_ID) -> Dict[str, Any]:
        """Returns non-sensitive configuration dictionary for dashboard display."""
        config = self.get_configuration(camera_id)
        host = config.get("host")
        port = config.get("port", 8080)
        path = config.get("path", "/videofeed")
        username = config.get("username")
        has_password = bool(config.get("password"))

        active_url_masked = self.build_stream_url(
            host=host,
            port=port,
            path=path,
            username=username,
            password="secret" if has_password else None,
            mask_credentials=True
        )

        return {
            "camera_id": config.get("camera_id", camera_id),
            "name": config.get("name", "Android IP Webcam"),
            "host": host,
            "port": port,
            "path": path,
            "username": username,
            "has_password": has_password,
            "is_configured": bool(host and host.strip()),
            "active_url_masked": active_url_masked,
            "auto_reconnect": config.get("auto_reconnect", True),
            "is_connected": config.get("is_connected", False),
            "last_connected_at": config.get("last_connected_at"),
            "last_error": config.get("last_error"),
            "updated_at": config.get("updated_at"),
            "source": config.get("source", "unconfigured")
        }

    def save_configuration(
        self,
        data: Dict[str, Any],
        camera_id: str = DEFAULT_CAMERA_ID,
        updated_by: str = "admin"
    ) -> Dict[str, Any]:
        """
        Validates, normalizes, and persists the camera configuration.
        """
        # Validation
        host_input = data.get("host")
        validated_host = self.validate_host(host_input) if host_input and str(host_input).strip() else None
        validated_port = self.validate_port(data.get("port", 8080))
        validated_path = self.validate_path(data.get("path", "/videofeed"))
        name = (data.get("name") or "Android IP Webcam").strip()
        username = data.get("username")
        username = username.strip() if username and isinstance(username, str) and username.strip() else None

        # Existing password check: if empty password passed, retain existing password if flagged, or update
        existing = self.get_configuration(camera_id)
        new_password = data.get("password")
        if new_password is not None and str(new_password).strip():
            password = str(new_password).strip()
        elif data.get("retain_existing_password") and existing.get("password"):
            password = existing.get("password")
        else:
            password = None

        auto_reconnect = bool(data.get("auto_reconnect", True))
        now_iso = datetime.now(timezone.utc).isoformat()

        # 1. Save to Database
        db = SessionLocal()
        try:
            setting = db.query(CameraSetting).filter(CameraSetting.camera_id == camera_id).first()
            if setting:
                setting.name = name
                setting.host = validated_host
                setting.port = validated_port
                setting.path = validated_path
                setting.username = username
                setting.password = password
                setting.auto_reconnect = auto_reconnect
                setting.updated_at = now_iso
                setting.updated_by = updated_by
            else:
                setting = CameraSetting(
                    camera_id=camera_id,
                    name=name,
                    host=validated_host,
                    port=validated_port,
                    path=validated_path,
                    username=username,
                    password=password,
                    auto_reconnect=auto_reconnect,
                    updated_at=now_iso,
                    updated_by=updated_by
                )
                db.add(setting)
            db.commit()
        except Exception as e:
            db.rollback()
            logger.error(f"[CameraConnectionService] Database write error: {e}")
            raise RuntimeError(f"Database error saving camera configuration: {e}")
        finally:
            db.close()

        # 2. Save to JSON backup
        try:
            file_data = {}
            if os.path.exists(CAMERA_SETTINGS_FILE):
                try:
                    with open(CAMERA_SETTINGS_FILE, "r", encoding="utf-8") as f:
                        file_data = json.load(f)
                except Exception:
                    file_data = {}
            file_data[camera_id] = {
                "camera_id": camera_id,
                "name": name,
                "host": validated_host,
                "port": validated_port,
                "path": validated_path,
                "username": username,
                "password": password,
                "auto_reconnect": auto_reconnect,
                "updated_at": now_iso,
                "updated_by": updated_by
            }
            with open(CAMERA_SETTINGS_FILE, "w", encoding="utf-8") as f:
                json.dump(file_data, f, indent=4)
        except Exception as e:
            logger.warning(f"[CameraConnectionService] JSON backup write notice: {e}")

        masked_url = self.build_stream_url(
            host=validated_host,
            port=validated_port,
            path=validated_path,
            username=username,
            password="secret" if password else None,
            mask_credentials=True
        )
        logger.info(f"[CameraConnectionService] Saved configuration for {camera_id}: {masked_url}")

        return self.get_public_configuration(camera_id)

    def update_connection_state(
        self,
        is_connected: bool,
        error_message: Optional[str] = None,
        camera_id: str = DEFAULT_CAMERA_ID
    ) -> None:
        """Updates runtime connection flag and timestamp in the database."""
        now_iso = datetime.now(timezone.utc).isoformat() if is_connected else None
        try:
            db = SessionLocal()
            try:
                setting = db.query(CameraSetting).filter(CameraSetting.camera_id == camera_id).first()
                if setting:
                    setting.is_connected = is_connected
                    if is_connected:
                        setting.last_connected_at = now_iso
                        setting.last_error = None
                    elif error_message:
                        setting.last_error = error_message
                    db.commit()
            finally:
                db.close()
        except Exception as e:
            logger.debug(f"[CameraConnectionService] Update state notice: {e}")

        # Broadcast via WebSocket if available
        try:
            from routes.ws import ws_event_queue
            ws_event_queue.put({
                "type": "CAMERA_STATUS",
                "camera_id": camera_id,
                "is_connected": is_connected,
                "error": error_message,
                "timestamp": now_iso or datetime.now(timezone.utc).isoformat()
            })
        except Exception:
            pass

    # ─────────────────────────────────────────────────────────────────────────
    # Reachability Test & Handshake
    # ─────────────────────────────────────────────────────────────────────────

    def check_tcp_port(self, host: str, port: int, timeout: float = 1.5) -> bool:
        """Helper to test raw TCP reachability before HTTP handshake."""
        try:
            with socket.create_connection((host, port), timeout=timeout):
                return True
        except (socket.timeout, ConnectionRefusedError, OSError):
            return False

    def test_connection(
        self,
        host: Optional[str] = None,
        port: int = 8080,
        path: str = "/videofeed",
        username: Optional[str] = None,
        password: Optional[str] = None,
        camera_id: str = DEFAULT_CAMERA_ID,
        timeout: float = 2.5
    ) -> Dict[str, Any]:
        """
        Tests reachability of the candidate or currently saved IP Webcam configuration.
        Does not spin up full AI inference workers.
        """
        if not host:
            saved = self.get_configuration(camera_id)
            host = saved.get("host")
            port = saved.get("port", 8080)
            path = saved.get("path", "/videofeed")
            username = saved.get("username")
            password = saved.get("password")

        if not host or not str(host).strip():
            return {
                "success": False,
                "status_code": None,
                "message": "Camera is unconfigured. Please provide a valid IPv4 address or hostname.",
                "url_masked": None,
                "latency_ms": None
            }

        valid_host = self.validate_host(host)
        valid_port = self.validate_port(port)
        valid_path = self.validate_path(path)

        # Check basic TCP socket open first with 1.5s timeout for speed
        t_start = time.perf_counter()
        if not self.check_tcp_port(valid_host, valid_port, timeout=1.5):
            latency_ms = (time.perf_counter() - t_start) * 1000.0
            masked_url = self.build_stream_url(valid_host, valid_port, valid_path, username, password, mask_credentials=True)
            return {
                "success": False,
                "status_code": None,
                "latency_ms": round(latency_ms, 1),
                "url_masked": masked_url,
                "message": f"Connection refused or timed out reaching {valid_host}:{valid_port}. Ensure IP Webcam app is running on the phone and both devices are on the same Wi-Fi network."
            }

        # HTTP request test
        url = self.build_stream_url(valid_host, valid_port, valid_path, mask_credentials=False)
        masked_url = self.build_stream_url(valid_host, valid_port, valid_path, username, password, mask_credentials=True)
        auth = HTTPBasicAuth(username, password) if username and password else None

        try:
            t0 = time.perf_counter()
            resp = None
            try:
                resp = requests.get(
                    url,
                    auth=auth,
                    stream=True,
                    timeout=timeout,
                    verify=False,
                    allow_redirects=False,
                    headers={"User-Agent": "WomenDistressAI-CameraProbe/1.0"}
                )
            except (requests.exceptions.SSLError, requests.exceptions.ConnectionError):
                alt_scheme = "https" if url.startswith("http://") else "http"
                alt_url = self.build_stream_url(valid_host, valid_port, valid_path, scheme=alt_scheme, mask_credentials=False)
                try:
                    resp = requests.get(
                        alt_url,
                        auth=auth,
                        stream=True,
                        timeout=timeout,
                        verify=False,
                        allow_redirects=False,
                        headers={"User-Agent": "WomenDistressAI-CameraProbe/1.0"}
                    )
                    url = alt_url
                    masked_url = self.build_stream_url(valid_host, valid_port, valid_path, username, password, scheme=alt_scheme, mask_credentials=True)
                except Exception:
                    raise

            latency_ms = (time.perf_counter() - t0) * 1000.0

            content_type = resp.headers.get("Content-Type", "")
            status_code = resp.status_code

            # Close immediately
            resp.close()

            if status_code == 200:
                is_mjpeg = "multipart/x-mixed-replace" in content_type or "image" in content_type
                return {
                    "success": True,
                    "status_code": 200,
                    "latency_ms": round(latency_ms, 1),
                    "url_masked": masked_url,
                    "content_type": content_type,
                    "message": f"Camera reachable ({latency_ms:.1f}ms). Stream type: {content_type or 'MJPEG video feed'}."
                }
            elif status_code == 401:
                return {
                    "success": False,
                    "status_code": 401,
                    "latency_ms": round(latency_ms, 1),
                    "url_masked": masked_url,
                    "message": "Authentication required. Please configure the username and password set in the phone's IP Webcam app."
                }
            elif status_code in (301, 302, 307, 308):
                return {
                    "success": False,
                    "status_code": status_code,
                    "latency_ms": round(latency_ms, 1),
                    "url_masked": masked_url,
                    "message": f"HTTP Redirect ({status_code}) to {resp.headers.get('Location')}. Please specify the direct endpoint URL."
                }
            else:
                return {
                    "success": False,
                    "status_code": status_code,
                    "latency_ms": round(latency_ms, 1),
                    "url_masked": masked_url,
                    "message": f"Server returned unexpected HTTP status {status_code}."
                }
        except requests.exceptions.Timeout:
            latency_ms = (time.perf_counter() - t0) * 1000.0
            return {
                "success": False,
                "status_code": None,
                "latency_ms": round(latency_ms, 1),
                "url_masked": masked_url,
                "message": f"Connection to {valid_host}:{valid_port} timed out after {timeout}s."
            }
        except requests.exceptions.RequestException as e:
            latency_ms = (time.perf_counter() - t0) * 1000.0
            return {
                "success": False,
                "status_code": None,
                "latency_ms": round(latency_ms, 1),
                "url_masked": masked_url,
                "message": f"Network error connecting to camera: {str(e)}"
            }

    # ─────────────────────────────────────────────────────────────────────────
    # Local Subnet Bounded Discovery (Optional feature)
    # ─────────────────────────────────────────────────────────────────────────

    def discover_local_cameras(self, timeout_per_host: float = 0.15) -> List[Dict[str, Any]]:
        """
        Scans the local /24 subnet on port 8080 to find IP Webcam servers.
        Strictly restricted to the current local private subnet.
        """
        # Get primary local IPv4 address
        local_ip = "127.0.0.1"
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
            s.close()
        except Exception:
            pass

        try:
            ip_obj = ipaddress.ip_address(local_ip)
            if not ip_obj.is_private:
                logger.warning(f"[Discovery] Local IP {local_ip} is not private; aborting subnet discovery.")
                return []
        except Exception:
            return []

        # Create /24 network
        parts = local_ip.split(".")
        if len(parts) != 4:
            return []
        subnet_prefix = f"{parts[0]}.{parts[1]}.{parts[2]}."

        found_devices = []
        logger.info(f"[Discovery] Scanning local subnet {subnet_prefix}0/24 on port 8080...")

        # Scan candidate hosts (e.g. 1 to 254)
        for host_num in range(1, 255):
            candidate_ip = f"{subnet_prefix}{host_num}"
            if candidate_ip == local_ip:
                continue

            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(timeout_per_host)
            t0 = time.perf_counter()
            try:
                res = sock.connect_ex((candidate_ip, 8080))
                sock.close()
                if res == 0:
                    latency = (time.perf_counter() - t0) * 1000.0
                    # Probe HTTP for IP Webcam signature
                    try:
                        probe = requests.get(
                            f"http://{candidate_ip}:8080/status.json",
                            timeout=0.6,
                            allow_redirects=False
                        )
                        name = "Android IP Webcam"
                        if probe.status_code == 200:
                            found_devices.append({
                                "host": candidate_ip,
                                "port": 8080,
                                "name": name,
                                "latency_ms": round(latency, 1),
                                "path": "/videofeed"
                            })
                        else:
                            # Also check /
                            found_devices.append({
                                "host": candidate_ip,
                                "port": 8080,
                                "name": name,
                                "latency_ms": round(latency, 1),
                                "path": "/videofeed"
                            })
                    except Exception:
                        found_devices.append({
                            "host": candidate_ip,
                            "port": 8080,
                            "name": "HTTP Device on Port 8080",
                            "latency_ms": round(latency, 1),
                            "path": "/videofeed"
                        })
            except Exception:
                pass

        logger.info(f"[Discovery] Discovered {len(found_devices)} camera candidate(s).")
        return found_devices

camera_connection_service = CameraConnectionService()
