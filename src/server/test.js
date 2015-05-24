import _ from 'highland'
import constructor from './constructor'
import sinon from 'sinon'
import assert from 'assert'

import logger from '../stream-utils/logger'
import duplexStub from '../stream-utils/duplex-stub'
import asLine from '../stream-utils/as-line'

export default (tape) => {

  tape('connects to bb', { timeout: 1000}, (t) => {
    t.plan(3)

    let sim = simulation()

    constructor(
      sim.net, sim.guid, '192.168.0.1:1234', 4567)
    t.ok(sim.server.listen.calledWith(4567))
    t.ok(sim.net.connect.calledWith(1234, '192.168.0.1'))
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
      .await(1,
        'send myTopic ' + sim.guidToGenerate + ' {"hello":123}\n',
        t.pass)
  })


  tape('converts bb errors to cv errors', { timeout: 1000 }, (t) => {
    t.plan(1)
    let sim = simulation()
    constructor(sim.net, sim.guid, '192.168.0.1:1234', 4567)
    sim.boilerBaySocket.push(asLine('error some-code oh my god'))
    sim.clientSocket
      .await(
        "{\"error\":{\"code\":\"some-code\",\"message\":\"oh my god\"}}\n",
        t.pass)
  })

  tape('consume (smallest)', { timeout:1000 }, (t) => {
    t.plan(1)
    let sim = simulation()
    constructor(sim.net, sim.guid, '192.168.0.1:1234', 4567)
    sim.clientSocket.push(asLine({
      consume: {
        offsetReset: 'smallest',
        book: 'my_fine_topic'
        // leaving group undefined
      },
    }))
    sim.boilerBaySocket
      .await("consume my_fine_topic " +
        sim.guidToGenerate + " smallest\n", t.pass)

  })

  tape('consume (smallest, group specified)', { timeout:1000 }, (t) => {
    t.plan(1)
    let sim = simulation()
    constructor(sim.net, sim.guid, '192.168.0.1:1234', 4567)
    sim.clientSocket.push(asLine({
      consume: {
        offsetReset: 'smallest',
        book: 'my_fine_topic',
        group: 'grp1234bca'
      },
    }))
    sim.boilerBaySocket
      .await("consume my_fine_topic " +
      'grp1234bca' + " smallest\n", t.pass)
  })

  tape('consume (largest)', { timeout:1000 }, (t) => {
    t.plan(1)
    let sim = simulation()
    constructor(sim.net, sim.guid, '192.168.0.1:1234', 4567)
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

  tape('next', {timeout:1000}, (t) => {
    t.plan(1)
    let sim = simulation()
    constructor(sim.net, sim.guid, '192.168.0.1:1234', 4567)
    sim.clientSocket.push(asLine({
      next: true
    }))
    sim.boilerBaySocket.await("next\n", t.pass)
  })

  tape('handles two messages in one push', {timeout: 1000}, (t) => {
    t.plan(1)
    let sim = simulation()
    constructor(sim.net, sim.guid, '192.168.0.1:1234', 4567)
    sim.clientSocket.push(
      asLine({ next: true }) + asLine({ next: true }))
    sim.boilerBaySocket.await(2, "next\n", t.pass)
  })

  tape('commit', {timeout:1000}, (t) => {
    t.plan(1)
    let sim = simulation()
    constructor(sim.net, sim.guid, '192.168.0.1:1234', 4567)
    sim.clientSocket.push(asLine({
      commit: true
    }))
    sim.boilerBaySocket.await("commit\n", t.pass)

  })

  tape('msg', {timeout: 1000}, (t) => {
    t.plan(2)
    let sim = simulation()
    constructor(sim.net, sim.guid, '192.168.0.1:1234', 4567)
    sim.boilerBaySocket.push(asLine('ready'))
    sim.boilerBaySocket.push('msg ' + asLine({ hello: 123 }))
    sim.clientSocket.await(
      "{\"event\":{\"hello\":123}}\n", t.pass)
    sim.clientSocket.awaitNot("undefined\n", t.pass)
  })

  tape('consume-started', (t) => {
    t.plan(1)
    let sim = simulation()
    constructor(sim.net, sim.guid, '192.168.0.1:1234', 4567)
    sim.boilerBaySocket.push('consume-started\n')
    sim.clientSocket.await(
      "{\"consumeStarted\":true}\n",
      t.pass
    )
  })

  tape('commit-ok', {timeout:1000}, (t) => {
    t.plan(1)
    let sim = simulation()
    constructor(sim.net, sim.guid, '192.168.0.1:1234', 4567)
    sim.boilerBaySocket.push('commit-ok\n')
    sim.clientSocket.await("{\"commitOK\":true}\n", t.pass)
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
