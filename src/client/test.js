import constructor from './constructor'
import _ from 'highland'
import duplexStub from '../stream-utils/duplex-stub'
import logger from '../stream-utils/logger'
import asLine from '../stream-utils/as-line'


export default (tape) => {

  tape('when event written to api', (t) => {
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
    }), () => t.pass('it sends event message data on socket'))
  })

  tape('when error message data received on socket', (t) => {
    t.plan(3)
    t.timeoutAfter(100)
    let { api, connection } = simulation()
    _(api)
      .errors((e) => {
        t.equal(Object.getPrototypeOf(e).name, 'Error', 'it coerces data to error object')
        t.equal(e.code, 'some-error', 'it transfers code property from data')
        t.equal(e.message, 'Everything broke!', 'it transfers message property from data')
      })
      .each(()=>{})

    connection.push(asLine({
      error: {
        code: 'some-error',
        message: 'Everything broke!'
      }
    }))
  })

  tape('when replay called on api', (t) => {
    t.plan(1)
    t.timeoutAfter(100)
    let { api, connection } = simulation()
    connection.await(asLine({
      consume: {
        topic: 'the_topic',
        offsetReset: 'smallest'
      }
    }), () => t.pass('it sends consume message data on socket'))
    api.replay('the_topic', () => {})
  })

  tape('when replay called with group on api', (t) => {
    t.plan(1)
    t.timeoutAfter(100)
    let { api, connection } = simulation()
    connection.await(asLine({
      consume: {
        topic: 'the_topic',
        group: 'group123',
        offsetReset: 'smallest'
      }
    }), () => t.pass('it forwards group in consume message data'))
    api.replay('the_topic', 'group123', () => {})
  })

  tape('when play called on the api', (t) => {
    t.plan(1)
    t.timeoutAfter(100)
    let { api, connection } = simulation()
    connection.await(asLine({
      consume: {
        topic: 'the_topic',
        offsetReset: 'largest'
      }
    }), () => t.pass('it sends consume message data on socket with offsetReset "largest"'))
    api.play('the_topic', (event, ack) => {})
  })

  tape('when consumeStarted message data received on socket', (t) => {
    t.plan(1)
    t.timeoutAfter(100)
    let { api, connection } = simulation()
    connection.push(asLine({
      consumeStarted: true
    }))
    connection.await(asLine({
      "next": true
    }), () => t.pass('it sends next message data on socket'))
  })

  tape('when message message data received on socket and replay called', (t) => {
    t.plan(2)
    t.timeoutAfter(100)
    let { api, connection } = simulation()
    api.replay('the_topic', (event, ack) => {
      t.deepEqual(event, {
        hello: 123
      }, 'it coerces the message messsage data to a javascript object that ' +
         'is passed as the first argument to the replay callback')
    })
    connection.push(asLine({
      message: {
        hello: 123
      }
    }))
    connection.awaitNot(asLine({
      commit: true
    }), () => t.pass('does NOT send commit message data on the server socket '+
                     '(as replay did not call ack())'))
  })

  tape('when message message data received and ack is called in replay callback', (t) => {
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
    }), () => t.pass('it does send commit command to server'))
  })

  tape('when commitOK message data is received on the socket', (t) => {
    t.plan(1)
    t.timeoutAfter(100)
    let { connection } = simulation()

    connection.push(asLine({
      commitOK: true
    }))
    connection.await(asLine({
      "next": true
    }), () => t.pass('it sends next to server'))
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
