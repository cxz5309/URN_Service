const params = {
  readParams: (newDate) => {
    return {
      TableName: table,
      ProjectionExpression: '#date, timestamp',
      FilterExpression: '#date = :value',
      ExpressionAttributeNames: { '#date': 'date' },
      ExpressionAttributeValues: { ':value': newDate }
    }
  },
  writeParams: (table, date, resource_id, provider, region, account, service, type, timestamp) => {
    return {
      TableName: table,
      Item: {
        date,
        resource_id,
        provider,
        region,
        account,
        service,
        type,
        timestamp
      }
    }
  }
}

module.exports = {params}