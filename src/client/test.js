import constructor from './constructor'
import _ from 'highland'
import duplexStub from '../stream-utils/duplex-stub'
import logger from '../stream-utils/logger'
import asLine from '../stream-utils/as-line'


export default (tape) => {

  tape('opens connection an writes to it', (t) => {
    t.plan(1);
    t.timeoutAfter(100)
    let sim = makeSimulation();
    let api = constructor(sim.net, 'localhost:1234')
    api.write({
      topic: 'mytopic',
      body: {
        hello: 123
      }
    })
    sim.connection.await(asLine({
      "event": {
        "topic": "mytopic",
        "body": {
          "hello": 123
        }
      }
    }), t.pass)
  })

  tape('coerces errors to node errors', (t) => {
    t.plan(2)
    t.timeoutAfter(100)
    let sim = makeSimulation()
    let api = constructor(sim.net, 'localhost:1234')
    _(api)
      .errors((e) => {
        t.equal(e.code, 'some-error')
        t.equal(e.message, 'Everything broke!')
      })
      .each(logger('hmm'))

    sim.connection.push(asLine({
      error: {
        code: 'some-error',
        message: 'Everything broke!'
      }
    }))
  })

  tape('sends consume (smallest) when replaying', (t) => {
    t.plan(1)
    t.timeoutAfter(100)
    let sim = makeSimulation()
    let api = constructor(sim.net, 'localhost:1234')
    sim.connection.await(asLine({
      consume: {
        topic: 'the_topic',
        offsetReset: 'smallest'
      }
    }), t.pass)
    api.replay('the_topic', () => {})
  })

  tape('sends group when replaying', (t) => {
    t.plan(1)
    t.timeoutAfter(100)
    let sim = makeSimulation()
    let api = constructor(sim.net, 'localhost:1234')
    sim.connection.await(asLine({
      consume: {
        topic: 'the_topic',
        group: 'group123',
        offsetReset: 'smallest'
      }
    }), t.pass)
    api.replay('the_topic', 'group123', () => {})
  })

  tape('sends consume (largest) when playing', (t) => {
    t.plan(1)
    t.timeoutAfter(100)
    let sim = makeSimulation()
    let api = constructor(sim.net, 'localhost:1234')
    sim.connection.await(asLine({
      consume: {
        topic: 'the_topic',
        offsetReset: 'largest'
      }
    }), t.pass)
    api.play('the_topic', (event, ack) => {})
  })

  tape('sends next once consume-started', (t) => {
    t.plan(1)
    t.timeoutAfter(100)
    let sim = makeSimulation()
    let api = constructor(sim.net, 'localhost:1234')
    sim.connection.push(asLine({
      consumeStarted: true
    }))
    sim.connection.await(asLine({
      "next": true
    }), t.pass)
  })

  tape('sends commit on ack', (t) => {
    t.plan(1)
    t.timeoutAfter(100)
    let sim = makeSimulation()
    let api = constructor(sim.net, 'localhost:1234')
    api.replay('the_topic', (event, ack) => {
      ack()
    })
    sim.connection.push(asLine({
      message: {
        hello: 123
      }
    }))
    sim.connection.await(asLine({
      commit: true
    }), t.pass)
  })

  tape('sends next on commit-ack', (t) => {
    t.plan(1)
    t.timeoutAfter(100)
    let sim = makeSimulation()
    let api = constructor(sim.net, 'localhost:1234')
    sim.connection.push(asLine({
      commitOK: true
    }))
    sim.connection.await(asLine({
      "next": true
    }), t.pass)
  })

  let makeSimulation = () => {
    let simulation = {
      connection: duplexStub(),
      net: {
        connect: () => simulation.connection
      }
    }
    return simulation;
  }
}
