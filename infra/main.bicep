targetScope = 'resourceGroup'

@description('Environment name')
@allowed(['staging', 'production'])
param environment string

@description('Azure region')
param location string = resourceGroup().location

@description('Unique suffix for globally unique names')
param suffix string = uniqueString(resourceGroup().id)

var prefix = 'firasa-${environment}'

// App Service Plan (shared between API and web)
module appServicePlan 'modules/app-service-plan.bicep' = {
  name: 'appServicePlan'
  params: {
    name: '${prefix}-plan'
    location: location
    sku: environment == 'production' ? 'B2' : 'B1'
  }
}

// API App Service
module api 'modules/app-service.bicep' = {
  name: 'apiAppService'
  params: {
    name: '${prefix}-api-${suffix}'
    location: location
    planId: appServicePlan.outputs.id
    runtime: 'NODE|20-lts'
    appSettings: [
      { name: 'NODE_ENV', value: environment }
      { name: 'PORT', value: '8080' }
      { name: 'CORS_ORIGIN', value: environment == 'production' ? 'https://firasa.app' : 'https://staging.firasa.app' }
    ]
  }
}

// Static Web App (Next.js frontend)
module web 'modules/static-web-app.bicep' = {
  name: 'staticWebApp'
  params: {
    name: '${prefix}-web'
    location: location
    sku: environment == 'production' ? 'Standard' : 'Free'
  }
}

// Azure SQL Database
module sql 'modules/sql-database.bicep' = {
  name: 'sqlDatabase'
  params: {
    serverName: '${prefix}-sql-${suffix}'
    databaseName: '${prefix}-db'
    location: location
    sku: environment == 'production' ? 'S1' : 'Basic'
  }
}

// Key Vault
module keyVault 'modules/key-vault.bicep' = {
  name: 'keyVault'
  params: {
    name: '${prefix}-kv-${suffix}'
    location: location
    apiPrincipalId: api.outputs.principalId
  }
}

// Redis Cache
module redis 'modules/redis-cache.bicep' = {
  name: 'redisCache'
  params: {
    name: '${prefix}-redis-${suffix}'
    location: location
    sku: environment == 'production' ? 'Standard' : 'Basic'
  }
}

// Outputs for CI/CD
output apiUrl string = api.outputs.url
output webUrl string = web.outputs.url
output sqlServerFqdn string = sql.outputs.serverFqdn
output keyVaultUri string = keyVault.outputs.uri
output redisHostname string = redis.outputs.hostname
