import _ from 'highland'
import sourceMaps from 'source-map-support'
import constructor from './index'
import sinon from 'sinon'
import assert from 'assert'
/*
import stubStream from './utils/stub-stream'
import inspector from './utils/inspector-stream'
import mapEnd from './utils/map-end'
import fi from './utils/fi'
import constant from 'mout/function/constant'
import {checkStream, ONLYcheckStream} from './utils/stream-checker'
import deepMatches from 'mout/object/deepMatches'*/

process.setMaxListeners(100);
sourceMaps.install();


it('connects', (done) => {
  let world = {
    state: {}
  }

  let net = {
    connect: sinon.spy(() =>
      world.state.mockBoilerBayConnection = _()),
    createServer: (callback) => {
      world.state.mockClientConnection = _()
      callback(world.state.mockClientConnection)
      return world.state.mockServer = {
        listen: sinon.stub()
      }
    },
  }
  let guid = () => 'random123'
  constructor(net, guid, '192.168.0.1:1234', 4567)

  assert(world.state.mockServer.listen.calledWith(4567))
  assert(net.connect.calledWith(1234, '192.168.0.1'))
  _(world.state.mockBoilerBayConnection).each((x) => {
    assert.equal(x, 'send myTopic random123 {"hello":123}')
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
  .pipe(
    world.state.mockClientConnection)

})

xdescribe('when we have an instance', function () {



  xit('bla bha', (done) => {

    let netConnection = _()
    netConnection.on = sinon.stub()

    let guid = () => 'unique123'

    let net = {
      connect: (port, host) => {
        assert.equal(port, 4444)
        assert.equal(host, '192.168.99.100')
        return netConnection;
      },
      createServer: (callback) => {

      }
    }

    let connection = constructor(net, guid, '192.168.99.100:4444')
    _([{
      body: {
        hello: 'world'
      }
    }]).pipe(connection.topic('test-topic'))

    netConnection.each(function(x) {
      assert.equal(x, 'send test-topic unique123 {"hello":"world"}')
      done()
    })

  })
})
