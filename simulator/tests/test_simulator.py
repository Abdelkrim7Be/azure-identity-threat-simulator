from unittest.mock import MagicMock, patch

import attack_simulator as sim_module


def test_no_attacker_credential_emits_failure_event_and_stops():
    """Missing ATTACKER_* values must fail closed without Azure calls."""
    simulator = sim_module.AttackSimulator()
    assert simulator._credential is None

    assert simulator.start() is True
    simulator._thread.join(timeout=5)

    assert simulator.is_running() is False
    events = simulator.get_events()
    assert len(events) == 1
    assert events[0]["step"] == "Attacker credential missing"
    assert events[0]["result"] == "failed"
    assert events[0]["severity"] == "critical"


def test_start_twice_is_rejected_while_running():
    simulator = sim_module.AttackSimulator()
    assert simulator.start() is True
    assert simulator.start() is False
    simulator._thread.join(timeout=5)


def test_stop_when_not_running_returns_false():
    simulator = sim_module.AttackSimulator()
    assert simulator.stop() is False


def test_reset_clears_events():
    simulator = sim_module.AttackSimulator()
    simulator.start()
    simulator._thread.join(timeout=5)
    assert simulator.get_events()
    simulator.reset()
    assert simulator.get_events() == []


def test_full_run_with_mocked_azure_sdks(monkeypatch):
    """Full success path with every Azure call mocked."""
    monkeypatch.setenv("ATTACKER_CLIENT_ID", "11111111-1111-1111-1111-111111111111")
    monkeypatch.setenv("ATTACKER_CLIENT_SECRET", "fake-secret")
    monkeypatch.setenv("ATTACKER_TENANT_ID", "22222222-2222-2222-2222-222222222222")

    fake_secret_prop = MagicMock()
    fake_secret_prop.name = "fake-secret-name"
    fake_secret_client = MagicMock()
    fake_secret_client.list_properties_of_secrets.return_value = [fake_secret_prop]
    fake_secret_client.get_secret.return_value = MagicMock(value="not-logged")

    # Matches azure-storage-blob's dict-style ContainerProperties access.
    fake_container = {"name": "demo"}
    fake_blob = MagicMock()
    fake_blob.name = "sample.txt"
    fake_container_client = MagicMock()
    fake_container_client.list_blobs.return_value = [fake_blob]
    fake_blob_client = MagicMock()
    fake_blob_client.download_blob.return_value.readall.return_value = b"fake-bytes"
    fake_container_client.get_blob_client.return_value = fake_blob_client

    fake_bsc = MagicMock()
    fake_bsc.list_containers.return_value = [fake_container]
    fake_bsc.get_container_client.return_value = fake_container_client

    fake_credential = MagicMock()
    fake_credential.get_token.return_value = MagicMock(token="fake-token")

    fake_arm_response = MagicMock(status_code=200)
    fake_arm_response.json.return_value = {"value": []}
    fake_arm_response.raise_for_status.return_value = None

    with patch.object(sim_module, "ClientSecretCredential", return_value=fake_credential), \
         patch.object(sim_module, "SecretClient", return_value=fake_secret_client), \
         patch.object(sim_module, "BlobServiceClient", return_value=fake_bsc), \
         patch.object(sim_module.requests, "get", return_value=fake_arm_response):
        simulator = sim_module.AttackSimulator()
        assert simulator.start() is True
        simulator._thread.join(timeout=5)

    assert simulator.is_running() is False
    steps = [e["step"] for e in simulator.get_events()]
    assert "Simulation complete" in steps
    assert "Key Vault secret read" in steps
    assert "Storage exfiltration (sample download)" in steps


def test_configured_keyvault_secret_must_exist(monkeypatch):
    monkeypatch.setenv("ATTACKER_CLIENT_ID", "11111111-1111-1111-1111-111111111111")
    monkeypatch.setenv("ATTACKER_CLIENT_SECRET", "fake-secret")
    monkeypatch.setenv("ATTACKER_TENANT_ID", "22222222-2222-2222-2222-222222222222")
    monkeypatch.setenv("AZURE_KEYVAULT_SECRET_NAME", "expected-demo-secret")

    fake_secret_prop = MagicMock()
    fake_secret_prop.name = "other-secret"
    fake_secret_client = MagicMock()
    fake_secret_client.list_properties_of_secrets.return_value = [fake_secret_prop]

    fake_credential = MagicMock()

    with patch.object(sim_module, "ClientSecretCredential", return_value=fake_credential), \
         patch.object(sim_module, "SecretClient", return_value=fake_secret_client):
        simulator = sim_module.AttackSimulator()
        simulator._simulate_stolen_token_keyvault_access()

    events = simulator.get_events()
    assert events[-1]["step"] == "Key Vault configured secret check"
    assert events[-1]["result"] == "failed"
    fake_secret_client.get_secret.assert_not_called()
