const AWS = require('aws-sdk');
const moment = require('moment');

const dynamo = new AWS.DynamoDB.DocumentClient();

const categoryFormater = (type) => {
  switch (type) {
    default: return type.slice(0, 1);
  }
}

// const dateFormater = (date) => {
//   const y = date.getFullYear();
//   const m = date.getMonth() + 1;
//   const d = date.getDate();
//   return [y, (m > 9 ? '' : '0') + m, (d > 9 ? '' : '0') + d].join('');
// }


exports.handler = async (event, context) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  let body;
  let statusCode = '200';
  const headers = {
    'Content-Type': 'application/json',
  };
  body = JSON.parse(event.body);
  const {provider, region, account, service, type} = body['URN-INPUT'];
  console.log('provider',provider);
  console.log('region', region);
  console.log('account', account);
  console.log('service', service);
  console.log('type', type);

  try {
    const newCategory = categoryFormater(service);
    const newDate = moment().format('YYYYMMDD');
    const table = 'user_urn_service_02';

    const readParams = {
      TableName: table,
      ProjectionExpression: '#name',
      FilterExpression: '#name = :value',
      ExpressionAttributeNames: { '#name': 'date' },
      ExpressionAttributeValues: { ':value': newDate }
    }
    const onScan = (err, data) => {
      if (err) {
        console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
      } else {
        // print all the movies
        console.log("Scan succeeded.");
    
        // // continue scanning if we have more movies, because
        // // scan can retrieve a maximum of 1MB of data
        // if (typeof data.LastEvaluatedKey != "undefined") {
        //   console.log("Scanning for more...");
        //   readParams.ExclusiveStartKey = data.LastEvaluatedKey;
        //   docClient.scan(readParams, onScan);
        // }
      }
    }
    const todayitems = await dynamo.scan(readParams, onScan).promise();
    console.log(todayitems);

    const num = todayitems.length + 1;

    const resource_id = `${newCategory}-${newDate}${num}`;
    const newUrn = `URN:${provider}:${region}:${account}:${service}-${type}:${resource_id}`;

    switch (event.httpMethod) {
      case 'POST':
        const writeParams = {
          TableName: table,
          Item: {
            date: newDate,
            "resource-id": resource_id,
            provider,
            region,
            account,
            service,
            type
          }
        }
        await dynamo.put(writeParams, (err) => {
          throw err;
        }).promise();
        body = newUrn;
        break;
      default:
        throw new Error(`Unsupported method "${event.httpMethod}"`);
    }
  } catch (err) {
    statusCode = '400';
    body = err.message;
  } finally {
    body = JSON.stringify(body);
  }

  return {
    statusCode,
    body,
    headers,
  };
};
