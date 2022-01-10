const crypto = require('crypto');
const mongoose = require('mongoose'); 
require('dotenv').config();

const UserSchema = mongoose.Schema({ 
    service: { type: String, required: true }, 
    region: { type: String, required: true }, 
    account: { type: String, required: true }, 
    resource: { type: String, required: true }, 
}); 

let connection = null; 

const connect = async () => { 
    if (connection && mongoose.connection.readyState === 1) 
    return Promise.resolve(connection); 
    return await mongoose.connect(process.env.MONGODB_URI, { 
        useNewUrlParser: true 
    }).then( conn => { 
        connection = conn; 
        return connection; 
    }); 
};

exports.handler = async (event, context, callback) => {
    try{
        const User = mongoose.model('user', UserSchema);
        context.callbackWaitsForEmptyEventLoop = false;

        const operation = event.httpMethod;
        
        console.log('event', event);
        console.log('event.body', event.body);
        const data = JSON.parse(event.body);
        console.log('data', data);
        const randKey = data['RandomKey'];
        // const sessionKey = data['SessionKey'];
        const {service, region, account, resource} = data['ARN-INPUT'];

        const secretKey = process.env.SECRET_KEY;
        var sessKey = crypto.createHmac('sha256', secretKey).update(randKey).digest('base64');

        // if(sessionKey !== sessKey){
        //    throw new Error('session key is not valid')
        // }

        await connect().then(() =>{
            console.log('mongo connect');
        });

        switch (operation) {
            case 'GET':
                const users = await User.find({});
                connect().then(() =>{
                    console.log('connect and get users');
                });

                callback(null, {
                    'statusCode':200,
                    'body':JSON.stringify({
                        'message':'get all users', 
                        users})
                });
                 break;
            case 'POST':
                let user = await User.findOne({
                    service,
                    region,
                    account,
                    resource
                });
                if(!user){
                    console.log('!user')
                    user = new User({
                        service,
                        region,
                        account,
                        resource
                    });
                    await user.save();
                }
                const key = crypto.scryptSync(sessKey, 'salt', 32);
                const iv = crypto.randomBytes(16)          
                const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

                let resourceId = cipher.update(user._id.toString(), 'utf8', 'base64');
                resourceId += cipher.final('base64');

                callback(null, {
                    'statusCode':200,
                    'body':JSON.stringify({
                        'message':'post user', 
                        'ARN-OUTPUT':{
                            'resource-id': resourceId
                        }})
                });
                break;
        }
    }catch(err){
        callback(null, {
            'statusCode': 400,
            'body': JSON.stringify({
                'message': err.message, 
                'ARN-OUTPUT':{
                    'resource-id': 'NULL'
                }
            })
        });
    }
}