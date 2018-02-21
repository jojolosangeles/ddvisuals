
class Event {

    constructor(name, param) {
      this.name = name;
      this.param = param
    }

    toString() {
      return `${this.name}(${this.param})`
    }

    print() {
      console.log(this.toString());
    }
}

class TestState {

  constructor() {
    this.total = 0;
    this.verified = 0;
    this.failed = 0;
  }

  step(message) {
    console.log(message);
  }

  verify(message, result) {
    this.total += 1;
    if (result) {
      this.verified += 1;
    } else {
      this.failed += 1;
      console.log("  FAILED: " + message);
    }
  }

  toString() {
    return `${this.total} total, ${this.verified} verified, ${this.failed} failed`
  }
}

module.exports = { TestState, Event }
