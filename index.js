const crypto = require('crypto');
const mongoose = require('mongoose');
require('dotenv').config();

const UserSchema = mongoose.Schema({
  service: {
    type: String,
    required: true
  },
  region: {
    type: String,
    required: true
  },
  account: {
    type: String,
    required: true
  },
  resource: {
    type: String,
    required: true
  },
});

let connection = null;

const connect = async () => {
  if (connection && mongoose.connection.readyState === 1)
    return Promise.resolve(connection);
  return await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true
  }).then(conn => {
    connection = conn;
    return connection;
  });
};

exports.handler = async (event, context, callback) => {
  try {
    context.callbackWaitsForEmptyEventLoop = false;
    const operation = event.httpMethod ? event.httpMethod : event.context['http-method'];

    await connect().then(() => {
      console.log('mongo connect');
    });
    const User = mongoose.model('user', UserSchema);

    switch (operation) {
      case 'GET':
        const users = await User.find({});

        callback(null, {
          statusCode: 200,
          headers: {},
          body: JSON.stringify({
            'message': 'get all users',
            users
          })
        });
        break;
      case 'POST':
        const data = event['body-json'] ? event['body-json'] : JSON.parse(event.body);
        const randKey = data['RandomKey'];
        // const sessionKey = data['SessionKey'];
        const {
          service,
          region,
          account,
          resource
        } = data['ARN-INPUT'];

        const secretKey = process.env.SECRET_KEY;
        var sessKey = crypto.createHmac('sha256', secretKey).update(randKey).digest('base64');

        // if(sessionKey !== sessKey){
        //    throw new Error('session key is not valid')
        // }

        let user = await User.findOne({
          service,
          region,
          account,
          resource
        });
        if (!user) {
          user = new User({
            service,
            region,
            account,
            resource
          });
          await user.save();
        }
        const key = crypto.scryptSync(sessKey, process.env.SALT, 32);
        const iv = crypto.randomBytes(16)
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

        let resourceId = cipher.update(user._id.toString(), 'utf8', 'base64');
        resourceId += cipher.final('base64');

        callback(null, {
          statusCode: 200,
          headers: {},
          body: JSON.stringify({
            'message': 'post user',
            'ARN-OUTPUT': {
              'resource-id': resourceId
            }
          })
        });
        break;
    }
  } catch (err) {
    console.log(err);
    callback(null, {
      statusCode: 400,
      headers: {},
      body: JSON.stringify({
        'message': err.message,
        'ARN-OUTPUT': {
          'resource-id': 'NULL'
        }
      })
    });
  }
}