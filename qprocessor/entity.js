var clock = require('./clock')

Array.prototype.removeIf = function(callback) {
  var i = 0;
  while (i < this.length) {
    if (callback(this[i], i)) {
      this.splice(i, 1);
    }
    else {
      ++i;
    }
  }
};

//
// Entities have a key-value store and an optional concept of time
//
class Entity {

  constructor(entityType, name) {
    this.entityType = entityType;
    this.name = name;
    this.kvStore = {};
    this.history = [];
    this.futureCommands = [];
    this.kvStore["replication"] = this.futureCommands.length;
  }

  addFutureCommand(delayCommand) {
    this.futureCommands.push(delayCommand);
    this.kvStore["replication"] = this.futureCommands.length;
  }

  tick(callback) {
    this.futureCommands.forEach( cmd => cmd.duration -= 1)
    this.futureCommands.forEach( cmd => { if (cmd.duration == 0) callback(cmd.command_executing_in_future); });
    this.futureCommands.removeIf( cmd => cmd.duration == 0);
    this.kvStore["replication"] = this.futureCommands.length;
  }

  getDisplayName() {
    return this.entityType + " " + this.name;
  }

  set(k, v) {
    this.kvStore[k] = v;
  }

  get(k) {
    return this.kvStore[k]
  }

  record(message) {
    this.history.push(message);
  }

  time() {
    return this.get(clock.ClockTimeKey);
  }

  toString() {
    return `${this.entityType}(${this.name})`
  }
}

module.exports = { Entity }
