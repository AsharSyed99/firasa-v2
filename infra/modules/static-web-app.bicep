param name string
param location string
param sku string = 'Free'

resource swa 'Microsoft.Web/staticSites@2023-12-01' = {
  name: name
  location: location
  sku: {
    name: sku
  }
  properties: {
    stagingEnvironmentPolicy: 'Enabled'
  }
}

output url string = 'https://${swa.properties.defaultHostname}'
output id string = swa.id
