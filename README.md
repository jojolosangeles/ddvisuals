# ddvisuals

Creating a concise description of distributed database issues, using that to generate
event stream that demonstrates issue, and visualizes it.

Scenarios from [Designing Data-Intensive Applications](https://www.amazon.com/Designing-Data-Intensive-Applications-Reliable-Maintainable/dp/1449373321/ref=sr_1_1?ie=UTF8&qid=1519705572&sr=8-1&keywords=designing+data+intensive+applications&dpID=51Jc%252BuREF8L&preST=_SX218_BO1,204,203,200_QL40_&dpSrc=srch)

## Scenarios in "tests" folder

First, start rabbitmq:  rabbitmq-server

On OSX, its installed in /usr/local/sbin, so you need this in your path: PATH=$PATH:/usr/local/sbin

Once its started, these scripts run sender/receiver.

The test scripts:  doengine, dodetail, dominimal

These take activity description, create events send to rabbitmq, separate program
reads these events.

Makes more sense to see.  Visual on beta.observablehq.com see book for original.
