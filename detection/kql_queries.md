## Azure Identity Threat Simulator — KQL (Log Analytics / Sentinel)

> Objectif: détecter des comportements typiques "token volé" / découverte / exfiltration.
> Adapte les noms (Key Vault, Storage, RG) à ton environnement.

### 1) Accès Key Vault (lecture de secrets, échecs/403)

```kusto
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.KEYVAULT"
| where Category in ("AuditEvent", "AzurePolicyEvaluationDetails")
| where OperationName has_any ("SecretGet", "SecretList", "VaultGet", "VaultList")
| project TimeGenerated, OperationName, ResultType, ResultSignature, CallerIPAddress, identity_claim_appid_g, identity_claim_oid_g, ResourceId
| order by TimeGenerated desc
```

### 2) Détection "token replay"/sign-in anormal (si logs Entra ID ingérés)

```kusto
SigninLogs
| where ResultType != 0
| summarize failures=count(), apps=make_set(AppDisplayName, 10) by UserPrincipalName, IPAddress, bin(TimeGenerated, 15m)
| where failures >= 5
| order by TimeGenerated desc
```

### 3) Énumération Azure Resource Manager (liste resources / 403)

```kusto
AzureActivity
| where OperationNameValue has "Microsoft.Resources/subscriptions/resourceGroups/resources/read"
   or OperationNameValue has "Microsoft.Resources/subscriptions/resourceGroups/resources/write"
| project TimeGenerated, Caller, CallerIpAddress, ActivityStatusValue, OperationNameValue, ResourceGroup, SubscriptionId
| order by TimeGenerated desc
```

### 4) Storage Account — list containers/blobs, downloads

```kusto
StorageBlobLogs
| where OperationName in ("ListBlobs", "GetBlob", "ListContainers")
| project TimeGenerated, OperationName, StatusCode, AuthenticationType, CallerIpAddress, Uri, AccountName
| order by TimeGenerated desc
```

### 5) Corrélation simple "Kill chain" (KV -> ARM -> Storage sur une fenêtre)

```kusto
let window = 30m;
let kv = AzureDiagnostics
| where ResourceProvider == "MICROSOFT.KEYVAULT"
| where OperationName has_any ("SecretGet", "SecretList")
| project kvTime=TimeGenerated, kvIP=CallerIPAddress, kvCaller=identity_claim_oid_g;
let arm = AzureActivity
| where OperationNameValue has "resources/read"
| project armTime=TimeGenerated, armIP=CallerIpAddress, armCaller=Caller;
let st = StorageBlobLogs
| where OperationName in ("ListBlobs", "GetBlob")
| project stTime=TimeGenerated, stIP=CallerIpAddress;
kv
| join kind=innerunique (arm) on $left.kvIP == $right.armIP
| where armTime between (kvTime .. kvTime + window)
| join kind=innerunique (st) on $left.kvIP == $right.stIP
| where stTime between (kvTime .. kvTime + window)
| project kvTime, armTime, stTime, kvIP, kvCaller, armCaller
| order by kvTime desc
```

