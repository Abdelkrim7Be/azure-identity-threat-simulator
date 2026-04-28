## Azure Identity Threat Simulator

[![CI](https://github.com/Abdelkrim7Be/azure-identity-threat-simulator/actions/workflows/ci.yml/badge.svg)](https://github.com/Abdelkrim7Be/azure-identity-threat-simulator/actions/workflows/ci.yml)

Azure Identity Threat Simulator is a demo-ready project that **simulates identity-driven cloud attacks** on Azure and streams the resulting telemetry to a **real-time dashboard**.

The simulator emulates common attacker behaviors such as:
- attempting **Key Vault secret discovery and read**
- **Azure Resource Manager (ARM) enumeration**
- **Storage Blob discovery and sample download (exfil attempt)**

All actions are timestamped and tagged with an **outcome** (`success` / `failed` / `blocked`) and a **MITRE ATT&CK mapping**.

### Architecture (high level)

```
┌──────────────────────────┐          HTTP (JSON)           ┌──────────────────────────┐
│  Dashboard (React/Vite)   │  <──────────────────────────>  │   Simulator API (Flask)   │
│  - Timeline               │           /events              │  - /start-attack          │
│  - Alerts                 │           /status              │  - /stop-attack           │
│  - MITRE map              │                                │  - /events                │
└───────────────┬──────────┘                                └───────────────┬──────────┘
                │                                                        uses│
                │                                                         SP │
                │                                             (ClientSecretCredential)
                │                                                            │
                ▼                                                            ▼
     ┌─────────────────────┐   ┌───────────────────────┐   ┌────────────────────────┐
     │ Azure Key Vault      │   │ Azure Resource Manager │   │ Azure Storage Account   │
     │ redacted-keyvault    │   │ (management.azure.com) │   │ redacted-storage        │
     └─────────────────────┘   └───────────────────────┘   └────────────────────────┘
```

### Tech stack

- **Backend**: Python 3.11, Flask, flask-cors, requests  
- **Azure SDK**: azure-identity, azure-keyvault-secrets, azure-storage-blob  
- **Auth model (attacker)**: Service Principal via **`ClientSecretCredential`** loaded from `.env`
- **Frontend**: React + Vite, Tailwind CSS, Recharts
- **Detection**: KQL queries (`detection/kql_queries.md`)

### Repository structure

```
azure-identity-threat-simulator/
├── simulator/        # Python simulator + Flask API
├── dashboard/        # React dashboard (Vite + Tailwind)
└── detection/        # KQL detections
```

## Installation

### 1) Backend (simulator API)

```bash
cd simulator
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

### 2) Frontend (dashboard)

```bash
cd dashboard
npm install
```

## Configuration (.env)

Create a `.env` file at the **project root** (not in `simulator/`) and populate it with the attacker Service Principal credentials:

- `ATTACKER_CLIENT_ID`
- `ATTACKER_CLIENT_SECRET`
- `ATTACKER_TENANT_ID`

And your target context:

- `AZURE_SUBSCRIPTION_ID` (required for ARM enumeration)
- `AZURE_RESOURCE_GROUP`
- `AZURE_KEYVAULT_NAME`
- `AZURE_STORAGE_ACCOUNT_NAME`
- `AZURE_STORAGE_CONTAINER_NAME` (optional, default `demo`)

You can start from the template:

```bash
cp .env.example .env
```

> Security note: `.env` is intentionally ignored by git.

## Run the demo

### 1) Start the API (Flask)

```bash
cd simulator
source .venv/bin/activate
python attack_simulator.py
```

API base URL: `http://127.0.0.1:5000`

Endpoints:
- `GET /events`
- `POST /start-attack`
- `POST /stop-attack`
- `POST /reset`
- `GET /status`

### 2) Start the dashboard (Vite)

```bash
cd dashboard
npm run dev
```

Dashboard URL (default): `http://localhost:5173`

## Screenshots

> Placeholders (add your screenshots later):

- `docs/screenshots/dashboard-overview.png`
- `docs/screenshots/timeline.png`
- `docs/screenshots/mitre-map.png`

## MITRE ATT&CK mapping (demo)

| Simulator step | MITRE tactic | MITRE technique |
|---|---|---|
| Initial access (simulated) | Initial Access | T1078 - Valid Accounts |
| Key Vault access attempt | Credential Access | T1528 - Steal Application Access Token (simulated) |
| Key Vault enumeration | Discovery | T1526 - Cloud Service Discovery |
| Key Vault secret read | Collection | T1005 - Data from Local System (cloud analog) |
| ARM resource enumeration | Discovery | T1526 - Cloud Service Discovery |
| Storage enumeration + sample download | Exfiltration | T1020 - Automated Exfiltration |
| Simulation stopped | Impact | T1489 - Service Stop |

## Author

**Abdelkrim BELLAGNECH**  
ENSIBS × ENSET — Double Diploma in Cybersecurity


