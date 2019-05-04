const express = require('express');
const bodyParser = require('body-parser');
const MongoClient = require('mongodb').MongoClient;
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const port = process.argv.slice(2)[0];
const app = express();
app.use(bodyParser.json());

const dbUrl = 'Your connection string URL goes here.';

const dbClient = new MongoClient(dbUrl, { useNewUrlParser: true});

dbClient.connect( err => {
  if (err) throw err;
});

const privateKey = fs.readFileSync(path.join(__dirname,'private.key'));

async function retrieveUser(userId, password) {
   return new Promise(resolve => {
       dbClient.db('test').collection('administrators').find({userId: userId, password: password}).toArray((err, objects) => {
           if(objects.length === 1) {
               resolve(objects[0]);
           } else {
               resolve(null);
           }
       });
   });
}

app.post('/auth', async (req, res) => {
   const userId = req.body.userId;
   const password = req.body.password;
   console.log(`Auth: Authorizing user: ${userId}`);
   const user = await retrieveUser(userId, password);
   if (!user) {
       res.status(403).send('Access Denied.');
       return;
   }
   let token;

   token = {jwtToken: jwt.sign({
       exp: Math.floor(Date.now() / 1000) + (60 * 60),
       privileges: user.privileges
   }, privateKey, {algorithm: 'RS256'})};

   res.status(200).send(token);
});

require('../eureka-helper/eureka-helper').registerWithEureka('auth-service', port);

console.log(`Auth service listening on port ${port}.`);
app.listen(port);
