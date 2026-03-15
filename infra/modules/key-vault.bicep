param name string
param location string
param apiPrincipalId string

resource kv 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: name
  location: location
  properties: {
    tenantId: subscription().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    accessPolicies: [
      {
        tenantId: subscription().tenantId
        objectId: apiPrincipalId
        permissions: {
          secrets: ['get', 'list']
        }
      }
    ]
    enableSoftDelete: true
    softDeleteRetentionInDays: 30
  }
}

output uri string = kv.properties.vaultUri
output id string = kv.id
