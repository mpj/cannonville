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


describe('when we have an instance', function () {

  it('bla bha', (done) => {

    let netConnection = _()
    netConnection.on = sinon.stub()

    let guid = () => 'unique123'


    let net = {
      connect: (port, host) => {
        assert.equal(port, 4444)
        assert.equal(host, '192.168.99.100')
        return netConnection;
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
