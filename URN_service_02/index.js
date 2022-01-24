const AWS = require('aws-sdk');
const crypto = require('crypto');

const { categoryFormater, dateFormater, fillZero, getMoment } = require('./util');
const { params } = require('./dynamo');

const dynamo = new AWS.DynamoDB.DocumentClient();

const TIME_PREVENT = 500;

exports.handler = async (event, context) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  let body;
  let statusCode = '200';
  const headers = {
    'Content-Type': 'application/json',
  };

  try {
    const eventBody = JSON.parse(event.body);
    const eventHeader = JSON.parse(event.headers);

    const { provider, region, account, service, type } = eventBody['URN-INPUT'];

    const sessionKey = eventHeader['sessionKey'];
    const randKey = [provider, region, account, service, type].join('|')
    const secretKey = 'secret';//process.env.SECRET_KEY;
    const table = 'urn_service_02';

    //make new Category
    const newCategory = categoryFormater(service);
    //make new Date
    const { timestamp, newDate } = getMoment(region);

    const verify = crypto.createHmac('sha256', secretKey).update(randKey).digest('base64');

    if (verify !== sessionKey) {
      throw new Error('session key is not invalid');
    }
    if (!account || !service || !region) {
      throw new Error('URN_INPUT is required')
    }
    const readParams = params.readParams(newDate);
    const onScan = (err, data) => {
      if (err) {
        console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
      } else {
        console.log("Scan succeeded.");
        // continue scanning if we have more movies, because
        // scan can retrieve a maximum of 1MB of data
        if (typeof data.LastEvaluatedKey != "undefined") {
          console.log("Scanning for more...");
          readParams.ExclusiveStartKey = data.LastEvaluatedKey;
          dynamo.scan(readParams, onScan);
        }
        else {
          console.log("Scanning fin");
        }
      }
    }
    
    //find today db
    const dynamoTodayItems = await dynamo.scan(readParams, onScan).promise();
    const { Items, Count } = dynamoTodayItems;
    console.log('todayitems', dynamoTodayItems);

    if (Number(Items.timestamp) > Number(timestamp) - TIME_PREVENT) {
      throw new Error(`try again after ${TIME_PREVENT} ms.`)
    }
    //make new Num
    const newNum = fillZero(Count + 1);

    //create urn
    const resource_id = `${newCategory}-${newDate}${newNum}`;
    const newUrn = `URN:${provider}:${region}:${account}:${service}-${type}:${resource_id}`;

    switch (event.httpMethod) {
      case 'POST':        
        writeParams = params.writeParams(table, newDate, resource_id, provider, region, account, service, type, timestamp);
        const dynamoInput = await dynamo.put(writeParams).promise();
        body = {
          'URN-OUTPUT': { 'urn': newUrn }
        };
        break;
      default:
        throw new Error(`Unsupported method "${event.httpMethod}"`);
    }
  } catch (err) {
    console.error(err);
    statusCode = '400';
    body = {
      'URN-OUTPUT': { 'urn': 'NULL' },
      'message': err.message
    }
  } finally {
    body = JSON.stringify(body);
  }

  return {
    statusCode,
    body,
    headers,
  };
};
