import _ from 'highland'
import constructor from './constructor'
import sinon from 'sinon'
import assert from 'assert'
import isString from 'mout/lang/isString'
import logger from '../stream-utils/logger'
import duplexStub from '../stream-utils/duplex-stub'

export default (tape) => {

  tape('connects to bb', { timeout: 1000}, (t) => {
    t.plan(3)

    let world = makeWorld()

    constructor(
      world.stubs.net, world.stubs.guid, '192.168.0.1:1234', 4567)
    t.ok(world.stubs.server.listen.calledWith(4567))
    t.ok(world.stubs.net.connect.calledWith(1234, '192.168.0.1'))
    world.stubs.clientSocket.push(asLine({
      event: {
        topic: "myTopic",
        body: {
          hello: 123
        }
      }
    }))
    world.stubs
      .boilerBaySocket
      .await(1,
        'send myTopic ' + world.state.guidToGenerate + ' {"hello":123}\n',
        t.pass)
  })


  tape('converts bb errors to cv errors', { timeout: 1000 }, (t) => {
    t.plan(1)
    let world = makeWorld()
    constructor(world.stubs.net, world.stubs.guid, '192.168.0.1:1234', 4567)
    world.stubs.boilerBaySocket.push(asLine('error some-code oh my god'))
    world.stubs.clientSocket
      .await(
        "{\"error\":{\"code\":\"some-code\",\"message\":\"oh my god\"}}\n",
        t.pass)
  })

  tape('consume', { timeout:1000 }, (t) => {
    t.plan(1)
    let world = makeWorld()
    constructor(world.stubs.net, world.stubs.guid, '192.168.0.1:1234', 4567)
    world.stubs.clientSocket.push(asLine({
      consume: {
        offsetReset: 'smallest',
        topic: 'my_fine_topic'
        // leaving group undefined
      },
    }))
    world.stubs.boilerBaySocket
      .await("consume my_fine_topic " +
        world.state.guidToGenerate + " smallest\n", t.pass)

  })

  tape('next', {timeout:1000}, (t) => {
    t.plan(1)
    let world = makeWorld()
    constructor(world.stubs.net, world.stubs.guid, '192.168.0.1:1234', 4567)
    world.stubs.clientSocket.push(asLine({
      next: true
    }))
    world.stubs.boilerBaySocket.await("next\n", t.pass)
  })

  tape('handles two messages in one push', {timeout: 1000}, (t) => {
    t.plan(1)
    let world = makeWorld()
    constructor(world.stubs.net, world.stubs.guid, '192.168.0.1:1234', 4567)
    world.stubs.clientSocket.push(
      asLine({ next: true }) + asLine({ next: true }))
    world.stubs.boilerBaySocket.await(2, "next\n", t.pass)
  })

  tape('commit', {timeout:1000}, (t) => {
    t.plan(1)
    let world = makeWorld()
    constructor(world.stubs.net, world.stubs.guid, '192.168.0.1:1234', 4567)
    world.stubs.clientSocket.push(asLine({
      commit: true
    }))
    world.stubs.boilerBaySocket.await("commit\n", t.pass)

  })

  tape('msg', {timeout: 1000}, (t) => {
    t.plan(2)
    let world = makeWorld()
    constructor(world.stubs.net, world.stubs.guid, '192.168.0.1:1234', 4567)
    world.stubs.boilerBaySocket.push(asLine('ready'))
    world.stubs.boilerBaySocket.push('msg ' + asLine({ hello: 123 }))
    world.stubs.clientSocket.await(
      "{\"message\":{\"hello\":123}}\n", t.pass)
    world.stubs.clientSocket.awaitNot("undefined\n", t.pass)
  })

  tape('consume-started', (t) => {
    t.plan(1)
    let world = makeWorld()
    constructor(world.stubs.net, world.stubs.guid, '192.168.0.1:1234', 4567)
    world.stubs.boilerBaySocket.push('consume-started\n')
    world.stubs.clientSocket.await(
      "{\"consumeStarted\":true}\n",
      t.pass
    )
  })

  tape('commit-ok', {timeout:1000}, (t) => {
    t.plan(1)
    let world = makeWorld()
    constructor(world.stubs.net, world.stubs.guid, '192.168.0.1:1234', 4567)
    world.stubs.boilerBaySocket.push('commit-ok\n')
    world.stubs.clientSocket.await("{\"commitOK\":true}\n", t.pass)
  })

  let asLine = (x) => (isString(x) ? x : JSON.stringify(x)) + '\n'

  let makeWorld = () => {

    let state = {
      guidToGenerate: Math.floor(Math.random()*10000000).toString()
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
    let guidStub = () => state.guidToGenerate

    let api = {
      state,
      stubs: {
        net: netStub,
        guid: guidStub,
        server: serverStub,
        clientSocket: clientSocketStub,
        boilerBaySocket: boilerBaySocketStub
      }
    }
    return api

  }

}
