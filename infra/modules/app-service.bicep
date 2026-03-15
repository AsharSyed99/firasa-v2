param name string
param location string
param planId string
param runtime string
param appSettings array = []

resource app 'Microsoft.Web/sites@2023-12-01' = {
  name: name
  location: location
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: planId
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: runtime
      alwaysOn: true
      minTlsVersion: '1.2'
      appSettings: appSettings
    }
  }
}

output url string = 'https://${app.properties.defaultHostName}'
output principalId string = app.identity.principalId
