var Processor = require('../qprocessor/data_state_event_processor')

var p = new Processor.Processor("testQueue");
if (process.argv.length > 2) {
  for (var i = 2; i < process.argv.length; i++) {
    p.setFlag(process.argv[i])
  }
}

p.receive();
