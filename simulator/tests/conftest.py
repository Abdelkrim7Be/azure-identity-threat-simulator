import os
import sys
from pathlib import Path

import pytest

# Match the app's direct module imports when pytest runs from the repo root.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# Set fake target config before attack_simulator creates its module singleton.
REQUIRED_TARGET_ENV = {
    "AZURE_SUBSCRIPTION_ID": "00000000-0000-0000-0000-000000000000",
    "AZURE_RESOURCE_GROUP": "rg-test-lab",
    "AZURE_KEYVAULT_NAME": "test-keyvault",
    "AZURE_STORAGE_ACCOUNT_NAME": "teststorageacct",
}
# Override any real shell values during collection.
for _key, _value in REQUIRED_TARGET_ENV.items():
    os.environ[_key] = _value
os.environ["AZURE_KEYVAULT_SECRET_NAME"] = ""

# Block python-dotenv from loading real attacker credentials during tests.
for _key in ("ATTACKER_CLIENT_ID", "ATTACKER_CLIENT_SECRET", "ATTACKER_TENANT_ID"):
    os.environ[_key] = ""


@pytest.fixture(autouse=True)
def _base_env(monkeypatch):
    for key, value in REQUIRED_TARGET_ENV.items():
        monkeypatch.setenv(key, value)
    monkeypatch.delenv("ATTACKER_CLIENT_ID", raising=False)
    monkeypatch.delenv("ATTACKER_CLIENT_SECRET", raising=False)
    monkeypatch.delenv("ATTACKER_TENANT_ID", raising=False)
    monkeypatch.delenv("AZURE_KEYVAULT_SECRET_NAME", raising=False)
    yield
