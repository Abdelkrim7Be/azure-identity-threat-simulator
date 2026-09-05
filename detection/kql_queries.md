## Azure Threat Simulation Lab - KQL (Log Analytics / Sentinel)

> Adapt resource names, table availability, and time windows to your lab.

### 1) Key Vault secret access

```kusto
AzureDiagnostics
| where TimeGenerated > ago(2h)
| where ResourceProvider == "MICROSOFT.KEYVAULT"
| where OperationName in ("SecretList", "SecretGet")
| project TimeGenerated, OperationName, ResultType, ResultSignature, CallerIPAddress,
          identity_claim_appid_g, identity_claim_oid_g, ResourceId
| order by TimeGenerated desc
```

### 2) Scheduled query alert condition

```kusto
AzureDiagnostics
| where ResourceProvider == "MICROSOFT.KEYVAULT"
| where OperationName == "SecretGet"
```

### 3) Unusual Entra sign-in failures, if Entra logs are ingested

```kusto
SigninLogs
| where ResultType != 0
| summarize failures=count(), apps=make_set(AppDisplayName, 10)
    by UserPrincipalName, IPAddress, bin(TimeGenerated, 15m)
| where failures >= 5
| order by TimeGenerated desc
```

### 4) Azure Resource Manager enumeration

```kusto
AzureActivity
| where TimeGenerated > ago(2h)
| where OperationNameValue has "Microsoft.Resources/subscriptions/resourceGroups/resources/read"
   or OperationNameValue has "Microsoft.Resources/subscriptions/resourceGroups/resources/write"
| project TimeGenerated, Caller, CallerIpAddress, ActivityStatusValue,
          OperationNameValue, ResourceGroup, SubscriptionId
| order by TimeGenerated desc
```

### 5) Storage container/blob listing and sample downloads

```kusto
StorageBlobLogs
| where TimeGenerated > ago(2h)
| where OperationName in ("ListContainers", "GetBlob", "GetBlobProperties")
| project TimeGenerated, OperationName, StatusCode, AuthenticationType,
          CallerIpAddress, Uri, AccountName
| order by TimeGenerated desc
```

### 6) Simple Key Vault -> ARM -> Storage correlation

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
