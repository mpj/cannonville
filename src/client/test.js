import constructor from './constructor'
import _ from 'highland'
import duplexStub from '../stream-utils/duplex-stub'
import logger from '../stream-utils/logger'

export default (tape) => {
  tape('opens connection an writes to it', (t) => {
    t.plan(1);

    let connection = duplexStub()
    let net = {
      connect: () => connection
    }

    let api = constructor(net, 'localhost:1234')
    _([{
      topic: 'mytopic',
      body: {
        hello: 123
      }
    }]).pipe(api)

    t.ok(connection.received(JSON.stringify({
      event: {
        topic: 'mytopic',
        body: {
          hello: 123
        }
      }
    })))
  })

  tape('coerces errors to node errors', (t) => {
    t.plan(2)

    let connection = _();
    let net = {
      connect: () => connection
    }

    let api = constructor(net, 'localhost:1234')

    _(api)
      .errors((e) => {
        t.equal(e.code, 'some-error')
        t.equal(e.message, 'Everything broke!')
      })
      .each(logger('hmm'))

    connection.write(JSON.stringify({
      error: {
        code: 'some-error',
        message: 'Everything broke!'
      }
    }))

  })


  tape('sends consume when replaying', (t) => {
    t.plan(2)
    t.timeoutAfter(100)

    let connection = duplexStub();
    let net = {
      connect: () => connection
    }

    let api = constructor(net, 'localhost:1234')

    connection.onFirst(JSON.stringify({
      consume: {
        topic: 'the_topic',
        offsetReset: 'smallest'
      }
    }), JSON.stringify({
      consumeStarted: true
    }))

    connection.onFirst(JSON.stringify({
      next: true
    }), JSON.stringify({
      message: {
        hello: 123
      }
    }))

    connection.onFirst(JSON.stringify({
      commit: true
    }), JSON.stringify({
      commitOK: true
    }))
    setTimeout(() => {
      t.deepEqual(connection.lastWrite, JSON.stringify({
        next: true
      }), 'sent a final next')
    },10)

    api.replay('the_topic', (event, ack) => {
      t.deepEqual(event, {
        hello: 123
      }, 'callback got event')
      ack()
    })

  })
}
