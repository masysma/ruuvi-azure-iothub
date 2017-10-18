(function () {
  'use strict';

  const ruuvi = require('node-ruuvitag');
  var config = require('./config');
  // var Protocol = require('azure-iot-device-mqtt').Mqtt;
  // Uncomment one of these transports and then change it in fromConnectionString to test other transports
  // var Protocol = require('azure-iot-device-amqp').AmqpWs;
  // var Protocol = require('azure-iot-device-http').Http;
  var Protocol = require('azure-iot-device-amqp').Amqp;
  // var Protocol = require('azure-iot-device-mqtt').MqttWs;
  var Client = require('azure-iot-device').Client;
  var Message = require('azure-iot-device').Message;


  // fromConnectionString must specify a transport constructor, coming from any transport package.
  var client = Client.fromConnectionString(config.connectionString, Protocol);

  var connectCallback = function (err) {
    if (err) {
      console.error('Could not connect: ' + err.message);
    } else {
      console.log('Client connected');
      client.on('message', function (msg) {
        console.log('Id: ' + msg.messageId + ' Body: ' + msg.data);
        // When using MQTT the following line is a no-op.
        client.complete(msg, printResultFor('completed'));
        // The AMQP and HTTP transports also have the notion of completing, rejecting or abandoning the message.
        // When completing a message, the service that sent the C2D message is notified that the message has been processed.
        // When rejecting a message, the service that sent the C2D message is notified that the message won't be processed by the device. the method to use is client.reject(msg, callback).
        // When abandoning the message, IoT Hub will immediately try to resend it. The method to use is client.abandon(msg, callback).
        // MQTT is simpler: it accepts the message by default, and doesn't support rejecting or abandoning a message.
      });

      client.on('error', function (err) {
        console.error(err.message);
      });

      client.on('disconnect', function () {
        clearInterval(sendInterval);
        client.removeAllListeners();
        client.open(connectCallback);
      });
    }
  };

  client.open(connectCallback);

  // Helper function to print results in the console
  function printResultFor(op) {
    return function printResult(err, res) {
      if (err) console.log(op + ' error: ' + err.toString());
      if (res) console.log(op + ' status: ' + res.constructor.name);
    };
  }

  // Set up ruuvitag event handlers
  ruuvi.on('found', tag => {
    console.log('Found RuuviTag, id: ' + tag.id);

    tag.on('updated', data => {
      //console.log('Got data from RuuviTag ' + tag.id + ':\n' + JSON.stringify(data, null, '\t'));
      var data = JSON.stringify({
        deviceId: 'ruuvi-' + tag.id,
        "rssi": data.rssi,
        "humidity": data.humidity,
        "temperature": data.temperature,
        "pressure": data.pressure,
        "accelerationX": data.accelerationX,
        "accelerationY": data.accelerationY,
        "accelerationZ": data.accelerationZ,
        "battery": data.battery
      });
      var message = new Message(data);
      //   message.properties.add('temperatureAlert', (temperature > 28) ? 'true' : 'false');
      console.log('Sending message: ' + message.getData());
      client.sendEvent(message, printResultFor('send'));
    });
  });

})();
