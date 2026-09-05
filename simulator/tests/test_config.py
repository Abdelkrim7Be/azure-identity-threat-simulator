import pytest

from config import ConfigError, load_config


def test_load_config_success_reads_env():
    cfg = load_config()
    assert cfg.subscription_id == "00000000-0000-0000-0000-000000000000"
    assert cfg.resource_group == "rg-test-lab"
    assert cfg.keyvault_url == "https://test-keyvault.vault.azure.net/"
    assert cfg.keyvault_secret_name == ""
    assert cfg.storage_account_url == "https://teststorageacct.blob.core.windows.net"
    assert cfg.storage_container_name == "demo"  # default, not set by fixture


def test_load_config_reads_optional_demo_secret_name(monkeypatch):
    monkeypatch.setenv("AZURE_KEYVAULT_SECRET_NAME", "demo-secret")
    assert load_config().keyvault_secret_name == "demo-secret"


@pytest.mark.parametrize(
    "missing_var",
    [
        "AZURE_SUBSCRIPTION_ID",
        "AZURE_RESOURCE_GROUP",
        "AZURE_KEYVAULT_NAME",
        "AZURE_STORAGE_ACCOUNT_NAME",
    ],
)
def test_load_config_missing_required_var_raises(monkeypatch, missing_var):
    monkeypatch.delenv(missing_var, raising=False)
    with pytest.raises(ConfigError, match=missing_var):
        load_config()


def test_load_config_never_falls_back_to_a_default_identity(monkeypatch):
    for var in (
        "AZURE_SUBSCRIPTION_ID",
        "AZURE_RESOURCE_GROUP",
        "AZURE_KEYVAULT_NAME",
        "AZURE_STORAGE_ACCOUNT_NAME",
    ):
        monkeypatch.delenv(var, raising=False)
    with pytest.raises(ConfigError):
        load_config()
