const request = require('request');
const ip = require('ip');

const eurekaService = `http://localhost:8761/eureka`;

module.exports = {
   registerWithEureka: (appName, port) => {
       console.log(`Registering ${appName} with Eureka`);
       request.post({
           headers: {'content-type': 'application/json'},
           url: `${eurekaService}/apps/${appName}`,
           body: JSON.stringify({
               instance: {
                   hostName: `localhost`,
                   instanceId: `${appName}-${port}`,
                   vipAddress: `${appName}`,
                   app: `${appName.toUpperCase()}`,
                   ipAddr: ip.address(),
                   status: `UP`,
                   port: {
                       $: port,
                       "@enabled": true
                   },
                   dataCenterInfo: {
                       "@class": `com.netflix.appinfo.InstanceInfo$DefaultDataCenterInfo`,
                       name: `MyOwn`
                   }
               }
           })
       },
       (error, response, body) => {
           if(!error) {
               console.log(`Registered with Eureka.`);
               setInterval(() => {
                   request.put({
                       headers: {'content-type': 'application/json'},
                       url: `${eurekaService}/apps/${appName}/${appName}-${port}`
                   }, (error, response, body => {
                       if (error) {
                           console.log('Sending heartbeat to Eureka failed.');
                       } else {
                           console.log('Successfully sent heartbeat to Eureka.');
                       }
                   }));
               }, 50 * 1000);
      
           } else {
               console.log(`Not registered with eureka due to: ${error}`);
           }
       });
   }
};
