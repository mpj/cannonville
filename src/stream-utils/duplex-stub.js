import stream from 'stream'
import some from 'mout/array/some'
import util from 'util'
import deepMatches from 'mout/object/deepMatches'

let DuplexStub = function() {
  this._receivedValues = [];
  stream.Duplex.call(this, {
    objectMode: true
  })
}

util.inherits(DuplexStub, stream.Duplex)

DuplexStub.prototype._read = function () {}

DuplexStub.prototype._write = function(obj, _, cb) {
  this._receivedValues.push(obj)
  cb()
}

DuplexStub.prototype.queue = function (val) {
  this.push(val)
}

DuplexStub.prototype.received = function(pattern) {
  return some(this._receivedValues, (x) => deepMatches(x, pattern))
}

export default () => new DuplexStub()
