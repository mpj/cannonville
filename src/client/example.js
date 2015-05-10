var net = require('net');

var client = net.connect(1234, 'localhost');
client.setEncoding('utf8');

setInterval(function() {
  client.write(JSON.stringify({
    event: {
      topic: 'mytopic',
      body: {
        hello: 123
      }
    }
  }));
}, 250)

client.on('data', function(data) {
  console.log('data was', data)
})
