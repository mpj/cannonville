import constructor from './constructor'
import _ from 'highland'
import duplexStub from '../stream-utils/duplex-stub'
import logger from '../stream-utils/logger'
import asLine from '../stream-utils/as-line'
import merge from 'mout/object/merge'

export default (tape) => {

  tape('when event written to api', (t) => {
    t.plan(1);
    t.timeoutAfter(100)
    let { api, connection } = simulation({
      connectionURI: 'my-host:666/mysuperapp'
    })
    api.write({
      body: {
        hello: 123
      }
    })
    connection.await(asLine({
      "event": {
        "body": {
          "hello": 123
        },
        "topic": "mysuperapp"
      }
    }), () => t.pass('it sends event message data on socket'))
  })

  tape('when we connect using a given uri, and write to api', (t) => {
    t.plan(1);
    t.timeoutAfter(100)
    let { api, connection } = simulation({
      connectionURI: 'my-host:666/my-fine-app'
    })
    api.write({
      body: {
        hello: 123
      }
    })
    connection.await(asLine({
      "event": {
        "body": {
          "hello": 123
        },
        "topic": "my-fine-app"
      }
    }), () => t.pass('is sends uri part as topic'))
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
    let { api, connection } = simulation({
      connectionURI: 'my-host:666/ninja-app'
    })
    connection.await(asLine({
      consume: {
        topic: 'ninja-app',
        offsetReset: 'smallest'
      }
    }), () => t.pass('it sends consume message data on socket'))
    api.replay(() => {})
  })

  tape('when replay called with group on api', (t) => {
    t.plan(1)
    t.timeoutAfter(100)
    let { api, connection } = simulation({
      connectionURI: 'my-host:666/fancyApp'
    })
    connection.await(asLine({
      consume: {
        topic: 'fancyApp',
        group: 'group123',
        offsetReset: 'smallest'
      }
    }), () => t.pass('it forwards group in consume message data'))
    api.replay('group123', () => {})
  })

  tape('when play called on the api', (t) => {
    t.plan(1)
    t.timeoutAfter(100)
    let { api, connection } = simulation({
      connectionURI: 'my-host:666/mystore'
    })
    connection.await(asLine({
      consume: {
        topic: 'mystore',
        offsetReset: 'largest'
      }
    }), () => t.pass('it sends consume message data on socket with offsetReset "largest"'))
    api.play((event, ack) => {})
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

  let simulation = (opts) => {
    opts = merge({
      connectionURI: 'localhost:1234'
    }, opts)
    let simulation = {
      connection: duplexStub(),
      net: {
        connect: () => simulation.connection
      }
    }
    simulation.api = constructor(simulation.net, opts.connectionURI)
    return simulation;
  }
}
