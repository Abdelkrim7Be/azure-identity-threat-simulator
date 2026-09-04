# Security Policy

Azure Threat Simulation Lab is an **educational cloud-security proof of
concept**. It intentionally generates suspicious-looking Azure activity
(credential access, resource enumeration, exfiltration attempts) using a
dedicated Microsoft Entra service principal, so a few rules apply that
wouldn't for a normal app.

## Intended use

- Only run this against **Azure resources you own or are explicitly
  authorized to test** (your own subscription, a dedicated lab/sandbox
  tenant, or an environment you have written permission to target).
- Do not point the "attacker" service principal at production resources,
  shared/corporate tenants, or anything you don't control.
- This project is for learning and demonstration. It is not a red-team
  platform, not a SOC product, and not intended for use against systems
  without authorization.

## Credentials and configuration

- Never commit real credentials, tenant IDs, subscription IDs, or any
  other identifying values. All configuration is read from environment
  variables (`.env`, gitignored) — see `.env.example` for the required
  variables. The app fails fast with a clear error if required
  configuration is missing rather than falling back to a default identity.
- Use a **dedicated lab service principal** for the "attacker" identity —
  never a real user account or a production app registration's
  credentials.
- Grant that service principal the **minimum permissions** needed to
  demonstrate the lab scenarios (Key Vault secret read, resource-group
  read, blob read) against **dedicated lab resources**, not broad
  `Contributor`/`Owner` roles or subscription-wide scope. See the README's
  "Security Model" section for the specific roles this code exercises.
- Prefer dedicated, disposable lab resources (a throwaway resource group,
  Key Vault, and storage account) over reusing anything shared.

## Running the simulator API

- The Flask simulator API is designed to be **localhost-only**
  (`127.0.0.1:5000`). Do not bind it to `0.0.0.0` or otherwise expose it
  on a network interface, and don't put it behind a public tunnel/reverse
  proxy.
- The API has **no authentication** by design — it's a local single-user
  demo tool. Its `/start-attack` endpoint triggers real calls against
  your configured Azure resources, so anything that can reach the port can
  trigger them. Never expose this endpoint publicly.

## Reporting a security issue

This is a personal learning/portfolio project without a dedicated security
team or SLA. If you find a credential accidentally committed, a real
vulnerability in the code (not in the demo behavior it's meant to
exhibit), or a way this could be misused beyond its intended scope, please
open a GitHub issue or contact the repository owner directly rather than
filing a public issue if it involves an exposed secret.
