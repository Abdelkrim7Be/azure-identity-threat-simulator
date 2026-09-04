from __future__ import annotations

import json
import os
import threading
import time
import uuid
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

import requests
from azure.identity import ClientSecretCredential
from azure.keyvault.secrets import SecretClient
from azure.storage.blob import BlobServiceClient
from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS

from config import load_config

Severity = Literal["critical", "warning", "info"]
Result = Literal["success", "failed", "blocked", "stopped"]

# .env lives at the repo root while the API runs from simulator/.
load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env")


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _is_blocked_error(message: str) -> bool:
    lower = message.lower()
    return any(
        word in lower
        for word in ("forbidden", "permission", "authorization")
    )


@dataclass(frozen=True)
class AttackEvent:
    id: str
    ts: str
    step: str
    target: str
    mitre_tactic: str
    mitre_technique: str
    severity: Severity
    result: Result
    details: str


class AttackSimulator:
    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._events: list[AttackEvent] = []
        self._running = False
        self._thread: threading.Thread | None = None
        self._stop_event = threading.Event()

        self._config = load_config()
        self._attacker_client_id = os.environ.get("ATTACKER_CLIENT_ID", "").strip()
        self._attacker_tenant_id = os.environ.get("ATTACKER_TENANT_ID", "").strip()
        self._attacker_client_secret = os.environ.get("ATTACKER_CLIENT_SECRET", "").strip()
        self._credential = self._build_attacker_credential()

    def _build_attacker_credential(self) -> ClientSecretCredential | None:
        if not (
            self._attacker_client_id
            and self._attacker_tenant_id
            and self._attacker_client_secret
        ):
            return None
        return ClientSecretCredential(
            tenant_id=self._attacker_tenant_id,
            client_id=self._attacker_client_id,
            client_secret=self._attacker_client_secret,
        )

    def reset(self) -> None:
        with self._lock:
            self._events.clear()

    def is_running(self) -> bool:
        with self._lock:
            return self._running

    def status(self) -> dict[str, Any]:
        with self._lock:
            return {
                "running": self._running,
                "event_count": len(self._events),
                "config": {
                    "resource_group": self._config.resource_group,
                    "keyvault_name": self._config.keyvault_name,
                    "keyvault_secret_name_set": bool(self._config.keyvault_secret_name),
                    "storage_account_name": self._config.storage_account_name,
                    "storage_container_name": self._config.storage_container_name,
                    "attacker_client_id_set": bool(self._attacker_client_id),
                    "attacker_tenant_id_set": bool(self._attacker_tenant_id),
                    "attacker_client_secret_set": bool(self._attacker_client_secret),
                },
            }

    def get_events(self) -> list[dict[str, Any]]:
        with self._lock:
            return [asdict(e) for e in self._events]

    def start(self) -> bool:
        with self._lock:
            if self._running:
                return False
            self._running = True
            self._stop_event.clear()
            self._thread = threading.Thread(
                target=self._run,
                name="attack-simulator",
                daemon=True,
            )
            self._thread.start()
            return True

    def stop(self) -> bool:
        with self._lock:
            if not self._running:
                return False
            self._stop_event.set()
            return True

    def _emit(
        self,
        *,
        step: str,
        target: str,
        mitre_tactic: str,
        mitre_technique: str,
        severity: Severity,
        result: Result,
        details: str,
    ) -> None:
        ev = AttackEvent(
            id=str(uuid.uuid4()),
            ts=_utc_now_iso(),
            step=step,
            target=target,
            mitre_tactic=mitre_tactic,
            mitre_technique=mitre_technique,
            severity=severity,
            result=result,
            details=details,
        )
        with self._lock:
            self._events.append(ev)

    def _stopped(self) -> bool:
        return self._stop_event.is_set()

    def _run(self) -> None:
        try:
            if self._credential is None:
                self._emit(
                    step="Attacker credential missing",
                    target="Local",
                    mitre_tactic="Initial Access",
                    mitre_technique="T1078 (Valid Accounts)",
                    severity="critical",
                    result="failed",
                    details="Missing ATTACKER_CLIENT_ID / ATTACKER_CLIENT_SECRET / ATTACKER_TENANT_ID in .env (or environment).",
                )
                return

            self._emit(
                step="Initial access (simulated)",
                target="Azure",
                mitre_tactic="Initial Access",
                mitre_technique="T1078 (Valid Accounts)",
                severity="info",
                result="success",
                details="Starting simulation with attacker ClientSecretCredential.",
            )

            self._simulate_stolen_token_keyvault_access()
            if self._stopped():
                return

            self._simulate_resource_enumeration()
            if self._stopped():
                return

            self._simulate_storage_exfiltration()
            if self._stopped():
                return

            self._emit(
                step="Simulation complete",
                target="Local",
                mitre_tactic="Execution",
                mitre_technique="T1204 (User Execution)",
                severity="info",
                result="success",
                details="Attack simulation finished.",
            )
        finally:
            with self._lock:
                self._running = False
            if self._stopped():
                self._emit(
                    step="Simulation stopped",
                    target="Local",
                    mitre_tactic="Impact",
                    mitre_technique="T1489 (Service Stop)",
                    severity="warning",
                    result="stopped",
                    details="Stop requested by operator.",
                )

    def _simulate_stolen_token_keyvault_access(self) -> None:
        if self._stopped():
            return

        # Simulates token abuse by recording whether Azure allows sensitive operations.
        target = self._config.keyvault_url
        self._emit(
            step="Stolen token (simulated): Key Vault access",
            target=target,
            mitre_tactic="Credential Access",
            mitre_technique="T1528 (Steal Application Access Token)",
            severity="critical",
            result="success",
            details="Attempting to enumerate and read secrets.",
        )

        try:
            client = SecretClient(vault_url=target, credential=self._credential)

            names: list[str] = []
            for prop in client.list_properties_of_secrets():
                if self._stopped():
                    return
                names.append(prop.name)
                if len(names) >= 10:
                    break

            if not names:
                self._emit(
                    step="Key Vault enumeration",
                    target=target,
                    mitre_tactic="Discovery",
                    mitre_technique="T1087 (Account Discovery)",
                    severity="warning",
                    result="failed",
                    details="No secrets found (or list denied).",
                )
                return

            self._emit(
                step="Key Vault enumeration",
                target=target,
                mitre_tactic="Discovery",
                mitre_technique="T1526 (Cloud Service Discovery)",
                severity="warning",
                result="success",
                details=f"Found {len(names)} secret name(s); names are not logged.",
            )

            secret_name = self._config.keyvault_secret_name or names[0]
            if secret_name not in names:
                self._emit(
                    step="Key Vault configured secret check",
                    target=f"{target}secrets/{secret_name}",
                    mitre_tactic="Collection",
                    mitre_technique="T1005 (Data from Local System) [cloud analog]",
                    severity="warning",
                    result="failed",
                    details="Configured demo secret was not found in the vault.",
                )
                return

            _ = client.get_secret(secret_name)
            self._emit(
                step="Key Vault secret read",
                target=f"{target}secrets/{secret_name}",
                mitre_tactic="Collection",
                mitre_technique="T1005 (Data from Local System) [cloud analog]",
                severity="critical",
                result="success",
                details=f"Successfully read secret '{secret_name}' (value not logged).",
            )
        except Exception as e:
            msg = f"{type(e).__name__}: {e}"
            self._emit(
                step="Key Vault access attempt",
                target=target,
                mitre_tactic="Credential Access",
                mitre_technique="T1528 (Steal Application Access Token)",
                severity="critical",
                result="blocked" if _is_blocked_error(msg) else "failed",
                details=msg[:500],
            )

        time.sleep(0.8)

    def _simulate_resource_enumeration(self) -> None:
        if self._stopped():
            return

        self._emit(
            step="Azure resource enumeration",
            target=f"resourceGroup/{self._config.resource_group}",
            mitre_tactic="Discovery",
            mitre_technique="T1526 (Cloud Service Discovery)",
            severity="info",
            result="success",
            details=f"Listing resources in resource group '{self._config.resource_group}'.",
        )

        try:
            token = self._credential.get_token("https://management.azure.com/.default").token
            url = (
                "https://management.azure.com/subscriptions/"
                f"{self._config.subscription_id}/resourceGroups/{self._config.resource_group}/resources"
            )
            params = {"api-version": "2021-04-01"}
            resp = requests.get(
                url,
                headers={"Authorization": f"Bearer {token}"},
                params=params,
                timeout=20,
            )

            if resp.status_code in (401, 403):
                self._emit(
                    step="ARM enumeration blocked",
                    target=f"resourceGroup/{self._config.resource_group}",
                    mitre_tactic="Discovery",
                    mitre_technique="T1526 (Cloud Service Discovery)",
                    severity="warning",
                    result="blocked",
                    details=f"HTTP {resp.status_code}: access denied.",
                )
                return

            resp.raise_for_status()
            data = resp.json()
            values = data.get("value", [])
            sample = [
                {
                    "name": r.get("name"),
                    "type": r.get("type"),
                    "location": r.get("location"),
                }
                for r in values[:10]
            ]
            self._emit(
                step="ARM enumeration results",
                target=f"resourceGroup/{self._config.resource_group}",
                mitre_tactic="Discovery",
                mitre_technique="T1526 (Cloud Service Discovery)",
                severity="info",
                result="success",
                details=json.dumps(
                    {"count": len(values), "sample": sample},
                    ensure_ascii=False,
                )[:900],
            )
        except Exception as e:
            msg = f"{type(e).__name__}: {e}"
            self._emit(
                step="ARM enumeration error",
                target="ARM",
                mitre_tactic="Discovery",
                mitre_technique="T1526 (Cloud Service Discovery)",
                severity="warning",
                result="blocked" if _is_blocked_error(msg) else "failed",
                details=msg[:500],
            )

        time.sleep(0.8)

    def _simulate_storage_exfiltration(self) -> None:
        if self._stopped():
            return

        account_url = self._config.storage_account_url
        container = self._config.storage_container_name
        self._emit(
            step="Storage discovery & exfiltration attempt",
            target=f"{account_url}/{container}",
            mitre_tactic="Exfiltration",
            mitre_technique="T1537 (Transfer Data to Cloud Account)",
            severity="critical",
            result="success",
            details="Attempting to list containers/blobs and download a sample.",
        )

        try:
            bsc = BlobServiceClient(
                account_url=account_url,
                credential=self._credential,
            )

            containers = [
                c["name"]
                for c in bsc.list_containers(name_starts_with=container)
            ]
            if self._stopped():
                return

            if container not in containers:
                self._emit(
                    step="Storage container check",
                    target=f"{account_url}/{container}",
                    mitre_tactic="Discovery",
                    mitre_technique="T1613 (Container and Resource Discovery)",
                    severity="warning",
                    result="failed",
                    details=f"Container '{container}' not found (or listing denied).",
                )
                return

            self._emit(
                step="Storage container enumeration",
                target=f"{account_url}/{container}",
                mitre_tactic="Discovery",
                mitre_technique="T1526 (Cloud Service Discovery)",
                severity="warning",
                result="success",
                details=f"Container '{container}' is accessible.",
            )

            cc = bsc.get_container_client(container)
            blob_names: list[str] = []
            for b in cc.list_blobs():
                if self._stopped():
                    return
                blob_names.append(b.name)
                if len(blob_names) >= 10:
                    break

            if not blob_names:
                self._emit(
                    step="Storage blob enumeration",
                    target=f"{account_url}/{container}",
                    mitre_tactic="Discovery",
                    mitre_technique="T1613 (Container and Resource Discovery)",
                    severity="info",
                    result="failed",
                    details="No blobs found (or listing denied).",
                )
                return

            self._emit(
                step="Storage blob enumeration",
                target=f"{account_url}/{container}",
                mitre_tactic="Discovery",
                mitre_technique="T1613 (Container and Resource Discovery)",
                severity="info",
                result="success",
                details=f"Found {len(blob_names)} blob(s) (showing up to 10): {', '.join(blob_names)}",
            )

            blob = blob_names[0]
            bc = cc.get_blob_client(blob)
            stream = bc.download_blob(offset=0, length=1024 * 1024)
            data = stream.readall()
            self._emit(
                step="Storage exfiltration (sample download)",
                target=f"{account_url}/{container}/{blob}",
                mitre_tactic="Exfiltration",
                mitre_technique="T1020 (Automated Exfiltration)",
                severity="critical",
                result="success",
                details=f"Downloaded {len(data)} bytes from '{blob}' (first 1MB max; content not logged).",
            )
        except Exception as e:
            msg = f"{type(e).__name__}: {e}"
            self._emit(
                step="Storage exfiltration attempt",
                target=f"{account_url}/{container}",
                mitre_tactic="Exfiltration",
                mitre_technique="T1020 (Automated Exfiltration)",
                severity="critical",
                result="blocked" if _is_blocked_error(msg) else "failed",
                details=msg[:500],
            )

        time.sleep(0.8)


simulator = AttackSimulator()

app = Flask(__name__)
# Only the local dashboard should call an API that can trigger Azure activity.
CORS(app, origins=["http://localhost:5173", "http://127.0.0.1:5173"])


@app.get("/events")
def events() -> Any:
    return jsonify(simulator.get_events())


@app.get("/status")
def status() -> Any:
    return jsonify(simulator.status())


@app.post("/start-attack")
def start_attack() -> Any:
    ok = simulator.start()
    if not ok:
        return jsonify({"ok": False, "error": "already_running"}), 409
    return jsonify({"ok": True})


@app.post("/stop-attack")
def stop_attack() -> Any:
    ok = simulator.stop()
    if not ok:
        return jsonify({"ok": False, "error": "not_running"}), 409
    return jsonify({"ok": True})


@app.post("/reset")
def reset() -> Any:
    simulator.reset()
    return jsonify({"ok": True})


@app.get("/healthz")
def healthz() -> Any:
    return jsonify({"ok": True})


if __name__ == "__main__":
    # Localhost-only because /start-attack has no auth and calls Azure.
    app.run(host="127.0.0.1", port=5000, debug=False)
