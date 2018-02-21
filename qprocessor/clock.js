
class Clock {

  constructor(tickDuration) {
    this.baseTime = 0;
    this.tickDuration = tickDuration;
    var data = tickDuration.toString().split(".")
    if (data.length == 1) {
      this.resolution = 0;
    } else {
      this.resolution = data[1].length;
    }
    this.timeAware = new Array();
  }

  register(node, startTime) {
    this.timeAware.push(node);
    node.set(ClockTimeKey, startTime)
  }

  tick() {
    this.baseTime += 1;
    for (var i = 0; i < this.timeAware.length; i++) {
      var node = this.timeAware[i];
      var newTime = node.time() + this.tickDuration;
      node.set(ClockTimeKey, +(newTime.toFixed(this.resolution)));
    }
  }

  toString() {
    return this.timeAware.length + " nodes, " + this.baseTime + " ticks, resolution=" + this.resolution + ", tickDuration=" + this.tickDuration;
  }
}

const ClockTimeKey = "time";

module.exports = { Clock, ClockTimeKey };
