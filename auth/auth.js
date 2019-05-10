const express = require('express');
const bodyParser = require('body-parser');
const MongoClient = require('mongodb').MongoClient;
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const API_KEY = 'Your Authy API Key goes here.';
const authy = require('authy')(API_KEY);

const port = process.argv.slice(2)[0];
const app = express();
app.use(bodyParser.json());

const dbUrl = 'Your connection string URL goes here.';

const dbClient = new MongoClient(dbUrl, { useNewUrlParser: true});

dbClient.connect( err => {
  if (err) throw err;
});

const privateKey = fs.readFileSync(path.join(__dirname,'private.key'));

async function authenticateWithAuthy(authyId) {
   console.log('Auth: Requested for the Twilio Authy 2nd factor.');
   return new Promise((resolve, reject) => {
       authy.send_approval_request(authyId, {
           message: 'Request to login to Heroes Universe two factor authentication with Twilio'
         }, null, null,  (err, authResponse) => {
           if (err) {
               reject(err);
           } else {
               resolve(authResponse.approval_request.uuid);
           }
       });
   });
}

async function checkAuthyStatus(authyToken) {
   console.log('Auth: Check Authy status.');
   return new Promise((resolve, reject) => {
       authy.check_approval_status(authyToken, (err, authResponse) => {
           if (err) {
               reject(err);
           } else {
               if (authResponse.approval_request.status === 'approved') {
                   resolve(authResponse.approval_request._authy_id);
               } else {
                   reject(err);
               }
           }
         });
   });
}

async function retrieveUser(userId, password) {
   return new Promise((resolve, reject) => {
       dbClient.db('test').collection('administrators').find({userId: userId, password: password}).toArray((err, objects) => {
           if(objects.length === 1) {
               resolve(objects[0]);
           } else {
               reject("Administrator not found.");
           }
       });
   });
}

async function retrieveUserByAuthyId(authyId) {
   return new Promise((resolve, reject) => {
       dbClient.db('test').collection('administrators').find({authyId: authyId}).toArray((err, objects) => {
           if(objects.length === 1) {
               resolve(objects[0]);
           } else {
            reject("Administrator not found.");
           }
       });
   });
}

app.get('/auth/status', async (req,res) => {
    try {
        const authStatus = await checkAuthyStatus(req.headers.authytoken);
        const user = await retrieveUserByAuthyId(authStatus);
        console.log(user);
        res.status(200).send({jwtToken: jwt.sign({
            exp: Math.floor(Date.now() / 1000) + (60 * 60),
            privileges: user.privileges
        }, privateKey, {algorithm: 'RS256'})});
    } catch(error) {
        console.error(error);
        res.status(401).send('Unauthorized.');
    }
});

app.post('/auth', async (req, res) => {
    try {
        const userId = req.body.userId;
        const password = req.body.password;
        console.log(`Auth: Authorizing user: ${userId}`);
        const user = await retrieveUser(userId, password);

        let token;

        if (user.secondFactorEnabled) {
            const authyToken = await authenticateWithAuthy(user.authyId);
            token = {authyToken: authyToken};
        } else {
            token = {jwtToken: jwt.sign({
                exp: Math.floor(Date.now() / 1000) + (60 * 10),
                privileges: user.privileges
            }, privateKey, {algorithm: 'RS256'})};
        }

        res.status(200).send(token);
    } catch (error) {
        console.error(error);
        res.status(401).send('Unauthorized.');
    }
});

require('../eureka-helper/eureka-helper').registerWithEureka('auth-service', port);

app.listen(port);
console.log(`Auth service listening on port ${port}.`);
