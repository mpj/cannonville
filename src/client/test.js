import test from 'tape'
import constructor from './constructor'
import _ from 'highland'

test('opens connection an writes to it', (t) => {
  t.plan(1);

  let connection = _();
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

  connection.each((x) => t.equal(x, JSON.stringify({
    event: {
      topic: 'mytopic',
      body: {
        hello: 123
      }
    }
  })))
})
