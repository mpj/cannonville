import constructor from './constructor'
import _ from 'highland'
import duplexStub from '../stream-utils/duplex-stub'
import logger from '../stream-utils/logger'
import asLine from '../stream-utils/as-line'


export default (tape) => {

  tape('opens connection an writes to it', (t) => {
    t.plan(1);
    t.timeoutAfter(100)
    let { api, connection } = simulation()
    api.write({
      topic: 'mytopic',
      body: {
        hello: 123
      }
    })
    connection.await(asLine({
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
    let { api, connection } = simulation()
    _(api)
      .errors((e) => {
        t.equal(e.code, 'some-error')
        t.equal(e.message, 'Everything broke!')
      })
      .each(logger('hmm'))

    connection.push(asLine({
      error: {
        code: 'some-error',
        message: 'Everything broke!'
      }
    }))
  })

  tape('sends consume (smallest) when replaying', (t) => {
    t.plan(1)
    t.timeoutAfter(100)
    let { api, connection } = simulation()
    connection.await(asLine({
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
    let { api, connection } = simulation()
    connection.await(asLine({
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
    let { api, connection } = simulation()
    connection.await(asLine({
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
    let { api, connection } = simulation()
    connection.push(asLine({
      consumeStarted: true
    }))
    connection.await(asLine({
      "next": true
    }), t.pass)
  })

  tape('gets message', (t) => {
    t.plan(2)
    t.timeoutAfter(100)
    let { api, connection } = simulation()
    api.replay('the_topic', (event, ack) => {
      t.deepEqual(event,{
        hello: 123
      })
    })
    connection.push(asLine({
      message: {
        hello: 123
      }
    }))
    connection.awaitNot(asLine({
      commit: true
    }), () => t.pass('did not send commit without ack'))
  })

  tape('sends commit on ack', (t) => {
    t.plan(1)
    t.timeoutAfter(100)
    let { api, connection } = simulation()
    api.replay('the_topic', (event, ack) => {
      ack()
    })
    connection.push(asLine({
      message: {
        hello: 123
      }
    }))
    connection.await(asLine({
      commit: true
    }), t.pass)
  })

  tape('sends next on commit-ack', (t) => {
    t.plan(1)
    t.timeoutAfter(100)
    let { connection } = simulation()

    connection.push(asLine({
      commitOK: true
    }))
    connection.await(asLine({
      "next": true
    }), t.pass)
  })

  let simulation = () => {
    let simulation = {
      connection: duplexStub(),
      net: {
        connect: () => simulation.connection
      }
    }
    simulation.api = constructor(simulation.net, 'localhost:1234')
    return simulation;
  }
}
