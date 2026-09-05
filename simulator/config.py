from __future__ import annotations

import os
from dataclasses import dataclass

# Fail closed instead of falling back to default Azure targets.
REQUIRED_ENV_VARS = (
    "AZURE_SUBSCRIPTION_ID",
    "AZURE_RESOURCE_GROUP",
    "AZURE_KEYVAULT_NAME",
    "AZURE_STORAGE_ACCOUNT_NAME",
)


class ConfigError(RuntimeError):
    """Required Azure lab configuration is missing."""


@dataclass(frozen=True)
class AzureConfig:
    subscription_id: str
    resource_group: str
    keyvault_name: str
    keyvault_secret_name: str
    storage_account_name: str
    storage_container_name: str

    @property
    def keyvault_url(self) -> str:
        return f"https://{self.keyvault_name}.vault.azure.net/"

    @property
    def storage_account_url(self) -> str:
        return f"https://{self.storage_account_name}.blob.core.windows.net"


def load_config() -> AzureConfig:
    missing = [
        name for name in REQUIRED_ENV_VARS if not os.environ.get(name, "").strip()
    ]
    if missing:
        raise ConfigError(
            "Missing required Azure lab configuration: "
            + ", ".join(missing)
            + ". Copy .env.example to .env at the project root and fill in your lab values."
        )

    return AzureConfig(
        subscription_id=os.environ["AZURE_SUBSCRIPTION_ID"].strip(),
        resource_group=os.environ["AZURE_RESOURCE_GROUP"].strip(),
        keyvault_name=os.environ["AZURE_KEYVAULT_NAME"].strip(),
        keyvault_secret_name=os.environ.get("AZURE_KEYVAULT_SECRET_NAME", "").strip(),
        storage_account_name=os.environ["AZURE_STORAGE_ACCOUNT_NAME"].strip(),
        storage_container_name=os.environ.get("AZURE_STORAGE_CONTAINER_NAME", "demo").strip(),
    )
