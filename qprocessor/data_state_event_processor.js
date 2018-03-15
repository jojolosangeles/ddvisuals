var rabbitmq = require('./rabbitmq')
var Entity = require('./entity')
var Clock = require('./clock')

/*
The System Model of Reality here is that each entity has its own state of shared data,
with assumptions about the other entities, and an algorithm for maintaining that state.

Here process an ordered sequence of events, and verify after each event that assumptions
are met.
 */
class EntityManager {
  constructor() {
    this.entities = {};
    this.entityList = [];
  }

  tick(callback) {
    this.entityList.forEach( e => e.tick(callback));
  }

  key(eType, eName) {
    return eType + "_" + eName;
  }

  create(eType, eName) {
    var entity = new Entity.Entity(eType, eName);
    this.entityList.push(entity);
    this.entities[this.key(eType, eName)] = entity;
    return entity;
  }

  get(eType, eName) {
    return this.entities[this.key(eType, eName)]
  }

  stringify(cmd) {
    return cmd.value + "@" + cmd.timestamp
  }
}

var entityManager = new EntityManager();
var clock = {};
var echoOn = false;

//
// Delays are handled by putting any delayed command in its target as a future command.
//

function delayExecution(delayMe) {
  var futureCommand = delayMe.command_executing_in_future;
  if (futureCommand && futureCommand.command == "set") {
    // a future "set" command uses the "from" entity's current time (the time the variable was set on the "from" node)
    var sourceEntity = entityManager.get(futureCommand.from.entityType, futureCommand.from.entityName);
    futureCommand.timestamp = sourceEntity.time();
    var destEntity = entityManager.get(futureCommand.to.entityType, futureCommand.to.entityName);
    destEntity.addFutureCommand(delayMe);
  }
}


// flags
var verboseFlag = false;
var lwwEnabled = false;
var rawFlag = false;
var groupFlag = false;
var verifyFlag = false;
var testChecksPassed = 0;
var testChecksFailed = 0;

function log(obj) {
  if (verboseFlag) {
    var s = "";
    if (obj.command) {
      s += obj.command;
    }
    if (obj.entityType) {
      if (s.length > 0) s += " ";
      s += obj.entityType;
    }
    if (obj.entityName) {
      if (s.length > 0) s += " ";
      s += obj.entityName;
    }
    if (obj.tickDuration) {
      if (s.length > 0) s += " ";
      s += obj.tickDuration;
    }
    if (obj.duration) {
      if (s.length > 0) s += " ";
      s += obj.duration;
    }
    if (obj.featureName) {
      if (s.length > 0) s += " ";
      s += obj.featureName;
    }
    if (obj.time) {
      if (s.length > 0) s += " ";
      s += obj.time;
    }
    if (obj.expectedValue) {
      if (s.length > 0) s += " ";
      s += obj.expectedValue;
    }
    console.log(s);
  }
  if (rawFlag) {
    console.log(obj);
  }
}

function processCommand(obj) {
  log(obj);
  if (obj.command == "create") {
    entityManager.create(obj.entityType, obj.entityName)
  } else if (obj.command == "clock") {
    clock = new Clock.Clock(Number(obj.tickDuration));
  } else if (obj.command == "register") {
    clock.register(entityManager.get(obj.entityType, obj.entityName), Number(obj.time));
  } else if (obj.command == "tick") {
    clock.tick();
    entityManager.tick(processCommand);
  } else if (obj.command == "tick*") {
    // as long as there  is any duration > 0, go through tick sequence
    while (delaysRemain()) {
      clock.tick();
      entityManager.tick(processCommand)
    }
  } else if (obj.command == "using") {
    if (obj.featureName == "LWW") {
      lwwEnabled = true;
    }
  } else if (obj.command == "echo") {
    if (obj.message == "on") {
      echoOn = true;
    } else if (obj.message == "off") {
      echoOn = false;
    } else if (echoOn) {
      console.log("::::::: " + obj.message);
    }
  } else if (obj.command == "verify") {
    var entity = entityManager.get(obj.entityType,  obj.entityName);
    data = obj.keyName.split(".")
    var verifyKey = data[0]
    var verifyField = (data.length > 1) ? data[1] : undefined;
    var actualValue = entity.get(verifyKey);
    var currentNumericValue = (verifyField == undefined) ? actualValue : actualValue[verifyField];
    var expectedValue = (obj.expectedValue[0] == "d") ?
      obj.expectedValue :
      ((obj.expectedValue == "undefined") ? undefined : obj.expectedValue);
    if (currentNumericValue == expectedValue) {
      testChecksPassed += 1;
      console.log("✓ verified: " + entity.entityType + " " + entity.name + " " + obj.keyName + "=" + expectedValue);
    } else {
      testChecksFailed += 1;
      console.log("❌ failed: " + entity.getDisplayName() + " " + obj.keyName + ", expected " + expectedValue + ", got " + currentNumericValue);
      if (entity.lastSetStatus) {
        console.log("(last set): " + entity.lastSetStatus);
      }
    }
  } else if (obj.command == "exit") {
    console.log("");
    console.log("Test complete:  " + testChecksPassed + " passed, " + testChecksFailed + " failed");
    console.log("")
    process.exit();
  } else if (obj.command == "delay") {
    delayExecution(obj);
  } else if (obj.command == "group") {
    if (groupFlag) {
      console.log(obj.message);
    }
  } else if (obj.command == "set") {
    var entity = entityManager.get(obj.to.entityType, obj.to.entityName)
    var kv = obj.value.split("=")
    var key = kv[0]
    var value = kv[1]
    if (lwwEnabled) {
      var creationTime = (obj.timestamp != undefined) ? obj.timestamp : entity.get(Clock.ClockTimeKey);
      if (creationTime) {
        entity.lastSetStatus = entity.getDisplayName() + " set " + obj.value + " at " + creationTime;
        value = { "value": value, "timestamp": creationTime };

        var oldValue = entity.get(key);
        if (!oldValue) {

        } else if (!oldValue.timestamp) {
          console.log("..value present, but does NOT have a timestamp");
        } else if (oldValue.timestamp > obj.timestamp) {
          entity.lastSetStatus = entity.getDisplayName() + " NOT setting " + obj.value +
            ", current: " + oldValue.value + "@" + oldValue.timestamp +
            ", proposed timestamp: " + obj.timestamp;
          value = oldValue;
        }
      }
    }

    entity.set(key, value)
  } else {
    console.log(obj);
  }
}

function decDuration(item, index) {
  item.duration -= 1;
  if (item.duration == 0) {
    processCommand(item.command_executing_in_future);
  }
}

class Processor {
  constructor(queueName) {
    this.rabbitMQ = new rabbitmq.RabbitMQ(queueName);
  }

  receive() {
    this.rabbitMQ.receive(processCommand);
  }

  setFlag(s) {
    if (s == "verbose") {
      verboseFlag = true;
    }
    if (s == "raw") {
      rawFlag = true;
    }
    if (s == "dq") {
      dqFlag = true;
    }
    if (s == "group") {
      groupFlag = true;
    }
    if (s == "verify") {
      verifyFlag = true;
    }
    if (s == "set") {
      setFlag = true;
    }
  }
}

module.exports = { Processor }
