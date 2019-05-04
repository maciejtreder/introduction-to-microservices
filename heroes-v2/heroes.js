const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const MongoClient = require('mongodb').MongoClient;

const port = process.argv.slice(2)[0];
const app = express();
app.use(bodyParser.json());

const fs = require('fs');
const jwt = require('jsonwebtoken');
const publicKey = fs.readFileSync(path.join(__dirname,'../public.key'));


const dbUrl = 'Your connection string URL goes here.';

const dbClient = new MongoClient(dbUrl, { useNewUrlParser: true});

dbClient.connect( err => {
   if (err) throw err;
});

function retrieveFromDb(collectionName) {
 return new Promise(resolve => {
       dbClient.db('test').collection(collectionName).find({}).project({_id: 0}).toArray((err, objects) => {
           resolve(objects);
       });
   });
}

app.post('/hero', (req, res) => {
    console.log(`Heroes v2: Adding new hero`);
    console.log(req.body);
    const token = req.headers.auth;
    try {
        var decoded = jwt.verify(token, publicKey);
        console.log(`Heroes v2: Token decoded, privileges:`);
        console.log(decoded.privileges);
        if(decoded.privileges.indexOf('CREATE_HERO') > 0) {
            const heroCollection = dbClient.db('test').collection('heroes');
            heroCollection.find().sort({id:-1}).limit(1).next().then(result => {
                const lastId = result.id;
                const newHero = {
                    id: lastId + 1,
                    type: req.body.type,
                    displayName: req.body.displayName,
                    powers: req.body.powers,
                    img: req.body.img,
                    busy: false
                };
                heroCollection.insertOne(newHero);
                res.status(201).send(newHero);
            });
        } else {
            
            console.log('Requesting user does not have the CREATE_HERO privilege.');
            console.log('Heroes v2: Lack of the CREATE_HERO privilege.');
            res.status(403).send('Access Denied.');   
        }
    } catch(error) {
        console.log(error);
        res.status(401).send('Unauthorized.');
    }
 });
 

app.get('/heroes', (req, res) => {
 console.log('Heroes v2: Returning heroes list.');
 retrieveFromDb('heroes').then(heroes => res.send(heroes));
});

app.get('/powers', (req, res) => {
 console.log('Heroes v2: Returning powers list.');
 retrieveFromDb('powers').then(heroes => res.send(heroes));
});

app.post('/hero/**', (req, res) => {
    const token = req.headers.auth;
 
    try {
        var decoded = jwt.verify(token, publicKey);
        console.log(`Heroes v2: Token decoded, privileges:`);
        console.log(decoded.privileges);
        if(!(decoded.privileges.indexOf('ASSIGN_HERO') >= 0)) {
            console.log('Heroes v2: Lack of the ASSIGN_HERO privilege.');
            console.log('Requesting user does not have the ASSIGN_HERO privilege.');
            res.status(403).send('Access Denied.');
            return;
        }
    } catch(error) {
        console.log(error);
        res.status(401).send('Unauthorized.');
        return;
    }
 
    const heroId = parseInt(req.params[0]);
    console.log('Heroes v2: Updating hero: ' + heroId);
    const heroCollection = dbClient.db('test').collection('heroes');

    heroCollection.find({}).project({_id: 0}).toArray((err, heroes) => {
      
         const foundHero = heroes.find(subject => subject.id === heroId);

         if (foundHero) {
             for (let attribute in foundHero) {
                 if (req.body[attribute]) {
                     foundHero[attribute] = req.body[attribute];

                     heroCollection.updateOne({id: heroId }, {$set: req.body});
                     console.log(`Set ${attribute} to ${req.body[attribute]} in hero: ${heroId}`);
                 }
             }
             res.status(202).header({Location: `http://localhost:8080/hero-service/hero/${foundHero.id}`}).send(foundHero);
         } else {
             console.log(`Hero not found.`);
             res.status(404).send('Hero not found.');
         }
     });
});

app.use('/img', express.static(path.join(__dirname,'img')));

require('../eureka-helper/eureka-helper').registerWithEureka('heroes-service', port);

console.log(`Heroes service listening on port ${port}.`);
app.listen(port);
