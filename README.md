## Azure Identity Threat Simulator

Démo "cybersécurité Azure" : simulation d’un scénario type *token volé* avec tentatives d’accès Key Vault, énumération ARM, et exfiltration Storage — le tout visualisé via un dashboard temps réel.

### Prérequis

- Python 3.11
- Node.js 18+
- Accès Azure (idéalement via `az login`) et droits (ou policies) pour observer **succès/échecs/bloqués**

### Configuration

Le simulateur lit sa config via variables d’environnement:

- `AZURE_SUBSCRIPTION_ID` (requis pour l’énumération ARM)
- `AZURE_RESOURCE_GROUP` (défaut `redacted-resource-group`)
- `AZURE_KEYVAULT_NAME` (défaut `redacted-keyvault`)
- `AZURE_STORAGE_ACCOUNT_NAME` (défaut `redacted-storage`)
- `AZURE_STORAGE_CONTAINER_NAME` (défaut `demo`)

### Lancer l’API (Flask)

```bash
cd simulator
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

export AZURE_SUBSCRIPTION_ID="<ton-subscription-id>"
python attack_simulator.py
```

Endpoints:

- `GET /events`
- `POST /start-attack`
- `POST /stop-attack`
- `POST /reset`
- `GET /status`

### Lancer le dashboard (React)

```bash
cd dashboard
npm install
npm run dev
```

Le dashboard poll l’API sur `http://localhost:5000`.

### Détection (KQL)

Voir `detection/kql_queries.md`.

