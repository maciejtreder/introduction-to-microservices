const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');

const port = process.argv.slice(2)[0];
const app = express();
app.use(bodyParser.json());

const powers = [
   { id: 1, name: 'flying' },
   { id: 2, name: 'teleporting' },
   { id: 3, name: 'super strength' },
   { id: 4, name: 'clairvoyance'},
   { id: 5, name: 'mind reading' }
];

const heroes = [
   {
       id: 1,
       type: 'spider-dog',
       displayName: 'Cooper',
       powers: [1, 4],
       img: 'cooper.jpg',
       busy: false
   },
   {
       id: 2,
       type: 'flying-dogs',
       displayName: 'Jack & Buddy',
       powers: [2, 5],
       img: 'jack_buddy.jpg',
       busy: false
   },
   {
       id: 3,
       type: 'dark-light-side',
       displayName: 'Max & Charlie',
       powers: [3, 2],
       img: 'max_charlie.jpg',
       busy: false
   },
   {
       id: 4,
       type: 'captain-dog',
       displayName: 'Rocky',
       powers: [1, 5],
       img: 'rocky.jpg',
       busy: false
   }
];

app.get('/heroes', (req, res) => {
   console.log('Returning heroes list');
   res.send(heroes);
});

app.get('/powers', (req, res) => {
   console.log('Returning powers list');
   res.send(powers);
});

app.post('/hero/**', (req, res) => {
   const heroId = parseInt(req.params[0]);
   const foundHero = heroes.find(subject => subject.id === heroId);

   if (foundHero) {
       for (let attribute in foundHero) {
           if (req.body[attribute]) {
               foundHero[attribute] = req.body[attribute];
               console.log(`Set ${attribute} to ${req.body[attribute]} in hero: ${heroId}`);
           }
       }
       res.status(202).header({Location: `http://localhost:${port}/hero/${foundHero.id}`}).send(foundHero);
   } else {
       console.log(`Hero not found.`);
       res.status(404).send();
   }
});

app.use('/img', express.static(path.join(__dirname,'img')));

require('../eureka-helper/eureka-helper').registerWithEureka('heroes-service', port);

console.log(`Heroes service listening on port ${port}`);
app.listen(port);
