param name string
param location string
param sku string = 'Basic'

resource redis 'Microsoft.Cache/redis@2023-08-01' = {
  name: name
  location: location
  properties: {
    sku: {
      name: sku
      family: sku == 'Basic' ? 'C' : 'C'
      capacity: 0
    }
    enableNonSslPort: false
    minimumTlsVersion: '1.2'
    redisConfiguration: {
      'maxmemory-policy': 'allkeys-lru'
    }
  }
}

output hostname string = redis.properties.hostName
output port int = redis.properties.sslPort
output id string = redis.id
