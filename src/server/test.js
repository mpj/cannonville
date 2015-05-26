import _ from 'highland'
import constructor from './constructor'
import sinon from 'sinon'
import assert from 'assert'

import logger from '../stream-utils/logger'
import duplexStub from '../stream-utils/duplex-stub'
import asLine from '../stream-utils/as-line'

export default (tape) => {

  tape('when calling constructor with arguments', (t) => {
    t.plan(2)
    t.timeoutAfter(1000)
    let sim = simulation()
    constructor(
      sim.net, sim.guid, '192.168.0.1:1234', 4567)

    t.ok(sim.server.listen.calledWith(4567),
      'it listens for the client on the port we specified')
    t.ok(sim.net.connect.calledWith(1234, '192.168.0.1'),
      'it connects to boiler bay using the uri we specified ')
  })

  tape('when receiving event message data on client socket', (t) => {
    t.plan(1)
    t.timeoutAfter(1000)
    let sim = simulation()
    constructor(
      sim.net, sim.guid, '192.168.0.1:1234', 4567)

    sim.clientSocket.push(asLine({
      event: {
        book: "myTopic",
        body: {
          hello: 123
        }
      }
    }))

    sim.boilerBaySocket.emit('connect')

    sim
      .boilerBaySocket
      .await(1,
        'send myTopic ' + sim.guidToGenerate + ' {"hello":123}\n',
        () => t.pass('it coerces that to a boiler bay send message'))

  })

  tape('when receiving event message data on client socket if connect event NOT emitted by Boiler Bay socket', (t) => {
    t.plan(1)
    t.timeoutAfter(1000)
    let sim = simulation()
    constructor(
      sim.net, sim.guid, '192.168.0.1:1234', 4567)

    sim.clientSocket.push(asLine({
      event: {
        book: "myTopic",
        body: {
          hello: 123
        }
      }
    }))


    sim
      .boilerBaySocket
      .awaitNot(
        'send myTopic ' + sim.guidToGenerate + ' {"hello":123}\n',
        () => t.pass('it coerces that to a boiler bay send message'))

  })

  tape('when receiving error message data on boiler bay socket', (t) => {
    t.plan(1)
    t.timeoutAfter(1000)
    let sim = simulation()
    constructor(sim.net, sim.guid, '192.168.0.1:1234', 4567)
    sim.boilerBaySocket.emit('connect')
    sim.boilerBaySocket.push(asLine('error some-code oh my god'))
    sim.clientSocket
      .await(
        "{\"error\":{\"code\":\"some-code\",\"message\":\"oh my god\"}}\n",
        () => t.pass('it coerces that into a Cannonville error'))
  })

  tape('when boiler bay socket emit an error', (t) => {
    t.plan(1)
    t.timeoutAfter(1000)
    let sim = simulation()
    constructor(sim.net, sim.guid, '192.168.0.1:1234', 4567)
    sim.boilerBaySocket.emit('error', {code: 'ECONNREFUSED', message: 'oh no' })
    sim.clientSocket.await(asLine({
      "error": {
        "code": "ECONNREFUSED",
        "message": "Boiler Bay emitted an error with message: oh no"
      }
    }), () => t.pass('it writes to client socket as error json message'))
  })

  tape('when receiving consume message data on client socket', (t) => {
    t.plan(1)
    t.timeoutAfter(1000)
    let sim = simulation()
    constructor(sim.net, sim.guid, '192.168.0.1:1234', 4567)
    sim.boilerBaySocket.emit('connect')
    sim.clientSocket.push(asLine({
      consume: {
        offsetReset: 'smallest',
        book: 'my_fine_topic',
        group: 'grp1234bca'
      },
    }))
    sim.boilerBaySocket
      .await("consume my_fine_topic " +
      'grp1234bca' + " smallest\n",
      () => t.pass('it coerces that into a boiler bay consume message'))
  })

  tape('when omitting group in consume message', (t) => {
    t.plan(1)
    t.timeoutAfter(1000)
    let sim = simulation()
    constructor(sim.net, sim.guid, '192.168.0.1:1234', 4567)
    sim.boilerBaySocket.emit('connect')
    sim.clientSocket.push(asLine({
      consume: {
        offsetReset: 'smallest',
        book: 'my_fine_topic'
        // leaving group undefined
      },
    }))
    sim.boilerBaySocket
      .await("consume my_fine_topic " +
        sim.guidToGenerate + " smallest\n",
        () => t.pass('it generates consumer group itself'))
  })

  tape('consume (largest)', (t) => {
    t.plan(1)
    t.timeoutAfter(1000)
    let sim = simulation()
    constructor(sim.net, sim.guid, '192.168.0.1:1234', 4567)
    sim.boilerBaySocket.emit('connect')
    sim.clientSocket.push(asLine({
      consume: {
        offsetReset: 'largest',
        book: 'my_fine_topic'
        // leaving group undefined
      },
    }))
    sim.boilerBaySocket
      .await("consume my_fine_topic " +
        sim.guidToGenerate + " largest\n", t.pass)
  })

  tape('when receiving next message data on client socket', (t) => {
    t.plan(1)
    t.timeoutAfter(1000)
    let sim = simulation()
    constructor(sim.net, sim.guid, '192.168.0.1:1234', 4567)
    sim.boilerBaySocket.emit('connect')
    sim.clientSocket.push(asLine({
      next: true
    }))
    sim.boilerBaySocket.await("next\n", () =>
      t.pass('it coerces it into a boiler bay next message'))
  })

  tape('when two lines are written simultaneously on the client socket', (t) => {
    t.plan(1)
    t.timeoutAfter(1000)
    let sim = simulation()
    constructor(sim.net, sim.guid, '192.168.0.1:1234', 4567)
    sim.boilerBaySocket.emit('connect')
    sim.clientSocket.push(
      asLine({ next: true }) + asLine({ next: true }))
    sim.boilerBaySocket.await(2, "next\n",
      () => t.pass('it handles them as two separate messages'))
  })

  tape('when commit message data is received on the client socket', (t) => {
    t.plan(1)
    t.timeoutAfter(1000)
    let sim = simulation()
    constructor(sim.net, sim.guid, '192.168.0.1:1234', 4567)
    sim.boilerBaySocket.emit('connect')
    sim.clientSocket.push(asLine({
      commit: true
    }))
    sim.boilerBaySocket.await("commit\n",
      () => t.pass('it coerces it to a boiler bay commit message'))
  })

  tape('when msg message data is received on boiler bay socket', (t) => {
    t.plan(2)
    t.timeoutAfter(1000)
    let sim = simulation()
    constructor(sim.net, sim.guid, '192.168.0.1:1234', 4567)
    sim.boilerBaySocket.emit('connect')
    sim.boilerBaySocket.push(asLine('ready'))
    sim.boilerBaySocket.push('msg ' + asLine({ hello: 123 }))
    sim.clientSocket.await(
      "{\"event\":{\"hello\":123}}\n", t.pass)
    sim.clientSocket.awaitNot("undefined\n",
      () => t.pass('it writes that to the client socket as a event JSON message'))
  })

  tape('when consume-started message data is received on boiler bay socket', (t) => {
    t.plan(1)
    t.timeoutAfter(1000)
    let sim = simulation()
    constructor(sim.net, sim.guid, '192.168.0.1:1234', 4567)
    sim.boilerBaySocket.emit('connect')
    sim.boilerBaySocket.push('consume-started\n')
    sim.clientSocket.await(
      "{\"consumeStarted\":true}\n",
      () => t.pass('it writes that to the client socket as a consumeStarted JSON message')
    )
  })

  tape('when commit-ok message data is receved on boiler bay socket', (t) => {
    t.plan(1)
    t.timeoutAfter(1000)
    let sim = simulation()
    constructor(sim.net, sim.guid, '192.168.0.1:1234', 4567)
    sim.boilerBaySocket.emit('connect')
    sim.boilerBaySocket.push('commit-ok\n')
    sim.clientSocket.await("{\"commitOK\":true}\n",
      () => t.pass('it writes that to the client socket as a commitOK JSON message'))
  })

  let simulation = () => {

    let simulation = {
      guidToGenerate: Math.floor(Math.random()*10000000).toString(),
      net: {
        connect: sinon.spy(() => simulation.boilerBaySocket),
        createServer: (callback) => {
          callback(simulation.clientSocket)
          return simulation.server
        },
      },
      guid: () => simulation.guidToGenerate,
      server: {
        listen: sinon.stub()
      },
      clientSocket: duplexStub(),
      boilerBaySocket: duplexStub()
    }

    return simulation
  }

}
