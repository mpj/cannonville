import constructor from './constructor'
import _ from 'highland'
import duplexStub from '../stream-utils/duplex-stub'
import logger from '../stream-utils/logger'
import asLine from '../stream-utils/as-line'


export default (tape) => {
  tape('opens connection an writes to it', (t) => {
    t.plan(1);

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

  tape('sends consume when replaying', (t) => {
    t.plan(2)
    t.timeoutAfter(100)

    let sim = makeSimulation()

    let api = constructor(sim.net, 'localhost:1234')

    sim.connection.onFirst(asLine({
      consume: {
        topic: 'the_topic',
        offsetReset: 'smallest'
      }
    }), asLine({
      consumeStarted: true
    }))

    sim.connection.onFirst(asLine({
      next: true
    }), JSON.stringify({
      message: {
        hello: 123
      }
    }))

    sim.connection.onFirst(asLine({
      commit: true
    }), asLine({
      commitOK: true
    }))
    setTimeout(() => {
      t.deepEqual(sim.connection.lastWrite, asLine({
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
