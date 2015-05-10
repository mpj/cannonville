import _ from 'highland'
import sourceMaps from 'source-map-support'
import constructor from './constructor'
import sinon from 'sinon'
import assert from 'assert'

process.setMaxListeners(100);
sourceMaps.install();


it('connects', (done) => {
  let world = {
    state: {}
  }

  let net = {
    connect: sinon.spy(() =>
      world.state.mockBoilerBaySocket = _()),
    createServer: (callback) => {
      world.state.mockClientSocket = _()
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
  _(world.state.mockBoilerBaySocket).each((x) => {
    assert.equal(x, 'send myTopic a389d8de87c543cfbf938b155b5fe263 {"hello":123}\n')
    done()
  })
  _([
    JSON.stringify({
      event: {
        topic: "myTopic",
        body: {
          hello: 123
        }
      }
    })
  ])
  .pipe(world.state.mockClientSocket)

})
