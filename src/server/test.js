import _ from 'highland'
import constructor from './constructor'
import sinon from 'sinon'
import assert from 'assert'
import logger from '../stream-utils/logger'
import duplexStub from '../stream-utils/duplex-stub'

export default (tape) => {
  tape('connects to bb', (t) => {
    t.plan(3)
    let world = makeWorld()
    constructor(
      world.stubs.net, world.stubs.guid, '192.168.0.1:1234', 4567)
    t.ok(world.stubs.server.listen.calledWith(4567))
    t.ok(world.stubs.net.connect.calledWith(1234, '192.168.0.1'))
    world.simulate.clientSendingObject({
      event: {
        topic: "myTopic",
        body: {
          hello: 123
        }
      }
    })
    setTimeout(function() {
      t.ok(world.check.boilerBayReceivedString(
        'send myTopic ' + world.state.generatedGuid + ' {"hello":123}\n'),
        'did not bla bla')
      t.end()
    },10)
  })


  tape('converts bb errors to cv errors', (t) => {
    t.plan(1)
    let world = makeWorld()
    constructor(world.stubs.net, world.stubs.guid, '192.168.0.1:1234', 4567)
    world.simulate.boilerBaySendingLine('error some-code oh my god')
    setTimeout(function() {
      t.ok(world.check.clientReceivedObject({
        error: {
          code: 'some-code',
          message: 'oh my god'
        }
      }), 'Sent error along to client')
    },10)

  })

  tape('consume', (t) => {
    t.plan(1)
    let world = makeWorld()
    constructor(world.stubs.net, world.stubs.guid, '192.168.0.1:1234', 4567)
    world.simulate.clientSendingObject({
      consume: {
        offsetReset: 'smallest',
        topic: 'my_fine_topic'
        // leaving group undefined
      },
    })
    setTimeout(function() {
      t.ok(world.check.boilerBayReceivedString(
        'consume my_fine_topic ' + world.state.generatedGuid +' smallest\n'))
    },10)
  })

  tape('next', (t) => {
    t.plan(1)
    let world = makeWorld()
    constructor(world.stubs.net, world.stubs.guid, '192.168.0.1:1234', 4567)
    world.simulate.clientSendingObject({
      next: true
    })
    t.ok(world.check.boilerBayReceivedString('next\n'))
  })

  tape('handles two messages in one push', (t) => {
    t.plan(1)
    let world = makeWorld()
    constructor(world.stubs.net, world.stubs.guid, '192.168.0.1:1234', 4567)
    world.simulate.clientSendingString(
      JSON.stringify({ next: true }) + '\n' +
      JSON.stringify({ next: true }) + '\n'
    )
    setTimeout(() =>
      t.equal(world.check.boilerBayReceivedLine('next'), 2)
    , 10)
  })

  tape('commit', (t) => {
    t.plan(1)
    let world = makeWorld()
    constructor(world.stubs.net, world.stubs.guid, '192.168.0.1:1234', 4567)
    world.simulate.clientSendingObject({
      commit: true
    })
    t.ok(world.check.boilerBayReceivedLine('commit'))
  })

  tape('msg', (t) => {
    t.plan(2)
    let world = makeWorld()
    constructor(world.stubs.net, world.stubs.guid, '192.168.0.1:1234', 4567)
    world.simulate.boilerBaySendingLine('ready')
    world.simulate.boilerBaySendingLine(
      'msg ' +
      JSON.stringify({
        hello: 123
      }))
    setTimeout(() => {
      t.ok(world.check.clientReceivedObject({
        message: {
          hello: 123
        }
      }))
      t.notOk(world.stubs.clientSocket.received(undefined))
    },10)
  })

  tape('consume-started', (t) => {
    t.plan(1)
    let world = makeWorld()
    constructor(world.stubs.net, world.stubs.guid, '192.168.0.1:1234', 4567)
    world.simulate.boilerBaySendingLine('consume-started')
    setTimeout(() => {
      t.ok(world.check.clientReceivedObject({
        consumeStarted :true }
      ))
    },10)
  })

  tape('commit-ok', (t) => {
    t.plan(1)
    let world = makeWorld()
    constructor(world.stubs.net, world.stubs.guid, '192.168.0.1:1234', 4567)
    world.simulate.boilerBaySendingLine('commit-ok')
    setTimeout(() => {
      t.ok(world.check.clientReceivedObject({
        commitOK: true
      }))
    },10)
  })

  let makeWorld = () => {

    let state = {
      generatedGuid: 'abc1234'
    }

    let boilerBaySocketStub = duplexStub()
    let clientSocketStub    = duplexStub()
    let serverStub          = {
      listen: sinon.stub()
    }

    let netStub = {
      connect: sinon.spy(() => boilerBaySocketStub),
      createServer: (callback) => {
        callback(clientSocketStub)
        return serverStub
      },
    }
    let guidStub = () => state.generatedGuid

    let api = {
      state,
      stubs: {
        net: netStub,
        guid: guidStub,
        server: serverStub,
        clientSocket: clientSocketStub
      },
      simulate: {
        clientSendingObject: (obj) =>
          api.simulate.clientSendingLine(JSON.stringify(obj)),
        clientSendingLine: (str) =>
          api.simulate.clientSendingString(str + '\n'),
        clientSendingString: (str) =>
          clientSocketStub.push(str),

        boilerBaySendingLine: (str) =>
          api.simulate.boilerBaySendingString(str + '\n'),
        boilerBaySendingString: (str) =>
          boilerBaySocketStub.push({ toString: () => str})
      },
      check: {
        clientReceivedObject: (obj) =>
          clientSocketStub.received(JSON.stringify(obj) + '\n'),

        boilerBayReceivedLine: (line) =>
          api.check.boilerBayReceivedString(line + '\n'),
        boilerBayReceivedString: (str) =>
          boilerBaySocketStub.received(str)
      }
    }
    return api

  }

}
