const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const request = require('request');
const MongoClient = require('mongodb').MongoClient;

const port = process.argv.slice(2)[0];
const app = express();

app.use(bodyParser.json());

const heroesService = 'http://localhost:8080/heroes-service';

const dbUrl = 'Your connection string URL goes here.';
const dbClient = new MongoClient(dbUrl, { useNewUrlParser: true});

dbClient.connect( err => {
   if (err) throw err;
});

app.get('/threats', (req, res) => {
    console.log('Threats v2: Returns threats list.');
   dbClient.db('test').collection('threats').find({}).project({_id: 0}).toArray((err, objects) => {
       res.send(objects);
   });
});

app.post('/assignment', (req, res) => {
    console.log('Threats v2: Assigning hero.');

    const threatsCollection = dbClient.db('test').collection('threats');
    
    request.post({
        headers: {'content-type': 'application/json', 'auth': req.headers.auth},
        url: `${heroesService}/hero/${req.body.heroId}`,
        body: `{
            "busy": true
        }`
    }, (err, heroResponse, body) => {
        if (!err && heroResponse.statusCode === 202) {
            const threatId = parseInt(req.body.threatId);
            threatsCollection.find({}).project({_id: 0}).toArray((err, threats) => {
                const threat = threats.find(subject => subject.id === threatId);

                if (threat) {
                    console.log('Threats v2: Updating threat.');
                    threat.assignedHero = req.body.heroId;
                    threatsCollection.updateOne({id: threat.id }, {$set: {assignedHero: threat.assignedHero}});
                    res.status(202).send(threat);
                } else {
                    console.log('Threats v2: Threat not found.');
                    res.status(404).send('Threat not found.');
                }
            });
        } else {
            if (err) res.status(400).send({problem: `Hero Service responded with issue ${err}.`});
            if (heroResponse.statusCode != 202) res.status(heroResponse.statusCode).send(heroResponse.body);
        }
    });
});
app.use('/img', express.static(path.join(__dirname,'img')));

require('../eureka-helper/eureka-helper').registerWithEureka('threats-service', port);

console.log(`Threats service listening on port ${port}.`);
app.listen(port);
