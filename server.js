var app = require('express')();
var http = require('http').Server(app);
var request = require('request-promise');
//Socket.IO enables real-time bidirectional event-based communication.
var io = require('socket.io')(http);
var _ = require('lodash');

var cors = require('cors');

app.use(cors());

/**
Protect your API key with environment variables. Configure APPID to be set up using the node global object process.env This insures that: 1) The key is not exposed within any of the applications code. 2) The key will persist through shell closures and server re-starts.

npm run env APPID={YOUR APP ID HERE}

**/
var config = {
  APPID: process.env.APPID
}

//URL of the server
var VEHICLE_URL = 'http://developer.trimet.org/ws/v2/vehicles';
//blank array to store the vehicles
var vehicles = [];

//accepts a referer(origin ) with any domain name and any port *:*
io.set('origins', '*:*');

//Function getVehicles checks the trimetURL followed by the query string 'appID'
function getVehicles() {
  request(VEHICLE_URL, {
    qs: {
      'appID': config.APPID
    }
  //The then() method returns a Promise. It takes two arguments: callback functions for the success and failure cases of the Promise
  }).then(function(data) {
    //create variable to store parsed JSON 'data'
    var json = JSON.parse(data);
    //not quite sure what this is testing
    if (json && json.resultSet) {
      //maps the JSON data for each result to the vehicle array. The _.pick selects only the object properties that we need
      vehicles = _.map(json.resultSet.vehicle, function(vehicle) {
        return _.pick(vehicle, ['routeNumber', 'delay', 'inCongestion', 'latitude', 'longitude', 'type', 'vehicleID']);
      });
      //emit the new vheicles array
      io.emit('vehicles_update', vehicles);
    }
  });
}

//The setInterval() method calls getVehicles at specified intervals (5000 milliseconds).
setInterval(getVehicles, 5000);

//HTTP GET requests to the specified path with the specified callback functions.
app.get('/', function(req, res){
  //sends the vehicles array as the response 
  res.send(vehicles);
});

//not sure what is going on here
io.on('connection', function(socket){

  socket.emit('vehicles_update', vehicles);

});

//This code provides sensible defaults that will allow the application to run in local development environments
var IP = process.env.OPENSHIFT_NODEJS_PORT || 3001;
var SERVER = process.env.OPENSHIFT_NODEJS_IP || '127.0.0.1';

//a small check to test for the presence of OpenShift-provided environment variables in your server’s listen() call:
http.listen(IP, SERVER, function(){
  console.log('listening on ' + SERVER + ':' + IP);
});
