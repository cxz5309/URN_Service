const crypto = require('crypto');
const { categoryFormater, fillZero, getMoment } = require('./util');
const { initData, userData } = require('./datastore');

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

    const { provider, region, account, category, type } = eventBody['URN-INPUT'];

    const sessionKey = eventBody['sessionKey'];
    const randKey = [provider, region, account, category, type].join('|')
    const secretKey = process.env.SECRET_KEY;//'secret';
    const service = `${category}-${type}`

    //make new Category
    const newCategory = categoryFormater(category);
    //make new Date
    const { timestamp, newDate } = getMoment(region);

    const verify = crypto.createHmac('sha256', secretKey).update(randKey).digest('base64');

    if (verify !== sessionKey) {
      throw new Error('session key is not invalid');
    }
    if (!account || !region || !category || !type) {
      throw new Error('URN_INPUT is required')
    }
    
    //키 값을 포함하여 데이터가 하나도 없을 경우 임시 객체를 추가하여 키를 생성한다.
    const keys = Object.keys(userData.service);
    if (!keys.includes(service)) {
      userData.service[service] = initData(category, type);
    }
    //find service datas
    const items = Object.entries(userData.service)
      .filter((v) => {
        return service === v[0];      
      })
      .flat()
      .map((v) => {
        return v[1];
      })
    console.log('items', items);
    
    //make new Num
    const newNum = fillZero(items.length + 1);

    //create urn
    const resource_id = `${newCategory}-${newDate}${newNum}`;
    const newUrn = `URN:${provider}:${region}:${account}:${service}-${type}:${resource_id}`;

    //prevent replay attack
    //이전 타임스탬프와 비교하여 너무 빠른 요청은 거절한다.
    //+이미 등록된 id면 타임스탬프만 변경한다.
    let itemIndex = -1;
    for (let i = 0; i < count;i++) {
      if (items[i].resource_id === resource_id) {
        itemIndex = i;
        if (Number(items[i].timestamp) > Number(timestamp) - TIME_PREVENT) {
          throw new Error(`try again after ${TIME_PREVENT} ms.`)
        }
        items[i].timestamp = timestamp;
      }
    }
    switch (event.httpMethod) {
      case 'POST':        
        if (itemIndex < 0) {
          items.push({
            resource_id,
            date: newDate,
            provider,
            region,
            account,
            category,
            type,
            timestamp
          })
        }
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
