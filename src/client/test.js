import test from 'tape'
import constructor from './constructor'
import _ from 'highland'
import duplexStub from '../stream-utils/duplex-stub'
import logger from '../stream-utils/logger'

test('opens connection an writes to it', (t) => {
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


test('coerces errors to node errors', (t) => {
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
