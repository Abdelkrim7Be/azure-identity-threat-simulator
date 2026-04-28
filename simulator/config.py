from __future__ import annotations

import os
from dataclasses import dataclass


SUBSCRIPTION_ID = "REDACTED-SUBSCRIPTION-ID"
TENANT_ID = "REDACTED-TENANT-ID"
KEYVAULT_NAME = "redacted-keyvault"
STORAGE_ACCOUNT_NAME = "redacted-storage"
RESOURCE_GROUP = "redacted-resource-group"
LOCATION = "uaenorth"


@dataclass(frozen=True)
class AzureConfig:
    subscription_id: str
    tenant_id: str
    resource_group: str
    keyvault_name: str
    storage_account_name: str
    location: str
    storage_container_name: str

    @property
    def keyvault_url(self) -> str:
        return f"https://{self.keyvault_name}.vault.azure.net/"

    @property
    def storage_account_url(self) -> str:
        return f"https://{self.storage_account_name}.blob.core.windows.net"


def load_config() -> AzureConfig:
    """
    Loads config from environment variables so the simulator can run in demos
    without hardcoding secrets into source control.
    """
    return AzureConfig(
        subscription_id=os.environ.get("AZURE_SUBSCRIPTION_ID", SUBSCRIPTION_ID).strip(),
        tenant_id=os.environ.get("AZURE_TENANT_ID", TENANT_ID).strip(),
        resource_group=os.environ.get("AZURE_RESOURCE_GROUP", RESOURCE_GROUP).strip(),
        keyvault_name=os.environ.get("AZURE_KEYVAULT_NAME", KEYVAULT_NAME).strip(),
        storage_account_name=os.environ.get("AZURE_STORAGE_ACCOUNT_NAME", STORAGE_ACCOUNT_NAME).strip(),
        location=os.environ.get("AZURE_LOCATION", LOCATION).strip(),
        storage_container_name=os.environ.get("AZURE_STORAGE_CONTAINER_NAME", "demo").strip(),
    )

