
var amqp = require('amqplib/callback_api');

function send(queueName, obj) {
  var msg = JSON.stringify(obj);
  amqp.connect('amqp://localhost', function (err, conn) {
    conn.createChannel(function (err, ch) {
      ch.assertQueue(queueName, {durable: false});
      ch.sendToQueue(queueName, new Buffer(msg));
      console.log(" [x] Sent %s", msg);
    });
    setTimeout(function () {
      conn.close();
      process.exit(0)
    }, 500);
  });
}

function receive(queueName, callback) {
  amqp.connect('amqp://localhost', function(err, conn) {
    conn.createChannel(function(err, ch) {
      ch.assertQueue(queueName, {durable: false});
      console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", queueName);
      ch.consume(queueName, function(msg) {
        callback(JSON.parse(msg.content));
      }, {noAck: true});
    });
  });
}

class RabbitMQ {

  constructor(queueName) {
    this.queueName = queueName;
  }

  send(obj) {
    send(this.queueName, obj);
  }

  receive(callback) {
    receive(this.queueName, callback);
  }

}


module.exports = { send, RabbitMQ };
