import _ from 'highland'
import constructor from './constructor'
import sinon from 'sinon'
import assert from 'assert'
import logger from '../stream-utils/logger'
import duplexStub from '../stream-utils/duplex-stub'

export default (tape) => {
  tape('connects to bb', (t) => {
    t.plan(1)

    let world = {
      state: {}
    }

    world.state.mockBoilerBaySocket = duplexStub()
    world.state.mockClientSocket = duplexStub()

    let net = {
      connect: sinon.spy(() =>
        world.state.mockBoilerBaySocket),
      createServer: (callback) => {
        world.state.mockClientSocket
        callback(world.state.mockClientSocket)
        return world.state.mockServer = {
          listen: sinon.stub()
        }
      },
    }
    let guid = () => 'a389d8de-87c5-43cf-bf93-8b155b5fe263'

    constructor(net, guid, '192.168.0.1:1234', 4567)

    assert(world.state.mockServer.listen.calledWith(4567))
    assert(net.connect.calledWith(1234, '192.168.0.1'))

    world.state.mockClientSocket.queue(JSON.stringify({
      event: {
        topic: "myTopic",
        body: {
          hello: 123
        }
      }
    }))
    setTimeout(function() {
      t.ok(world.state.mockBoilerBaySocket.received(
        'send myTopic a389d8de87c543cfbf938b155b5fe263 {"hello":123}\n'),
        'wat')
      t.end()
    },10)

  })


  tape('converts bb errors to cv errors', (t) => {
    t.plan(1)

    let world = {
      state: {}
    }

    world.state.mockBoilerBaySocket = duplexStub()
    world.state.mockClientSocket = duplexStub()
    let net = {
      connect: sinon.spy(() =>
        world.state.mockBoilerBaySocket),
      createServer: (callback) => {

        callback(world.state.mockClientSocket)
        return world.state.mockServer = {
          listen: sinon.stub()
        }
      },
    }
    let guid = () => {}

    constructor(net, guid, '192.168.0.1:1234', 4567)

    world.state.mockBoilerBaySocket.queue('error some-code some-message')
    setTimeout(function() {
      t.ok(world.state.mockClientSocket.received(JSON.stringify({
        error: {
          code: 'some-code',
          message: 'some-message'
        }
      })), 'Sent error along to client')
    },10)


  })
}
