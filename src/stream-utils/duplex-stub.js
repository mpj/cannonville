import stream from 'stream'
import some from 'mout/array/some'
import util from 'util'
import deepMatches from 'mout/object/deepMatches'
import contains from 'mout/array/contains'

let DuplexStub = function() {
  this._receivedValues = []
  this._stubs = []
  stream.Duplex.call(this, {
    objectMode: true
  })
}

util.inherits(DuplexStub, stream.Duplex)

DuplexStub.prototype._read = function () {}

DuplexStub.prototype._write = function(obj, _, cb) {
  this._receivedValues.push(obj)
  this.penultimateWrite = this.lastWrite
  this.lastWrite = obj

  this._stubs.forEach((stub) => {
    if (deepMatches(stub.inputPattern, obj)) {
      stub.matches++
      if (contains(stub.triggerOrdinals, stub.matches))
        this.push(stub.outputValue)
    }

  })
  cb()
}

DuplexStub.prototype.queue = function (val) {
  this.push(val)
}

DuplexStub.prototype.onFirst = function (inputPattern, outputValue) {
  this._stubs.push({
    matches: 0,
    triggerOrdinals: [1],
    inputPattern,
    outputValue
  })
}

DuplexStub.prototype.received = function(pattern) {
  return this._receivedValues.filter((x) => deepMatches(x, pattern)).length
}

export default () => new DuplexStub()
