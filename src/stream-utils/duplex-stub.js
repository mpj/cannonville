import stream from 'stream'
import some from 'mout/array/some'
import remove from 'mout/array/remove'
import util from 'util'
import deepMatches from 'mout/object/deepMatches'
import contains from 'mout/array/contains'
import isFunction from 'mout/lang/isFunction'

import _ from 'highland'

let DuplexStub = function() {
  this._probeOut = _()

  this._receivedValues = []
  this._stubs = []
  this._awaits = []

  stream.Duplex.call(this, {
    objectMode: true
  })
}

util.inherits(DuplexStub, stream.Duplex)

DuplexStub.prototype._read = function () {}

DuplexStub.prototype._write = function(obj, _, cb) {

  this._probeOut.write(obj)

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

  this._checkAwaits()
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

DuplexStub.prototype._checkAwaits = function() {
  let clean = []
  this._awaits.forEach((await) => {
    let patternSequence = await.patternSequence || [await.pattern]
    let sequenceMatches = this._receivedValues.reduce((matches, cur) => {
      if (!patternSequence[matches]) return matches;
      return deepMatches(cur, patternSequence[matches]) ? matches + 1 : 0
    }, 0)
    let isMatch = sequenceMatches === patternSequence.length
    if(isMatch) {
      clean.push(await)
      await.callback()
    }
  })
  clean.forEach((x) => remove(this._awaits, x))
}

DuplexStub.prototype.await = function(times, pattern, callback) {
  if (arguments.length === 2) {
    callback = pattern
    pattern = times
    times = 1
  }
  if (!isFunction(callback))
    throw new Error('Must provide callback')

  let handle = setTimeout(() => {
    throw new Error(
      'Duplex Stub timed out.\n' +
      'Awaited this pattern '+times+' time(s):\n' +
      JSON.stringify(pattern, null, 2) + '\n\n' +
      'The following values were written to the stub:\n' +
      this._receivedValues.map((x) => JSON.stringify(x, null, 2)).join('\n')
    )
  }, 100)
  this._awaits.push({
    times,
    pattern,
    callback: () => {
      clearTimeout(handle)
      callback()
    }
  })
  this._checkAwaits()
}

DuplexStub.prototype.awaitSequence = function(patternSequence, callback) {
  if (!isFunction(callback))
    throw new Error('Must provide callback')

  let handle = setTimeout(() => {
    throw new Error(
      'Duplex Stub timed out.\n' +
      'Awaited this pattern sequence:\n' +
      JSON.stringify(patternSequence, null, 2) + '\n\n' +
      'The following values were written to the stub:\n' +
      this._receivedValues.map((x) => JSON.stringify(x, null, 2)).join('\n')

    )
  }, 100)
  this._awaits.push({
    patternSequence,
    callback: () => {
      clearTimeout(handle)
      callback()
    }
  })
  this._checkAwaits()
}



DuplexStub.prototype.awaitNot = function(pattern, callback) {
  if (!isFunction(callback))
    throw new Error('Must provide callback')

  let handle = setTimeout(() => callback(), 50)
  this._awaits.push({
    times: 1,
    pattern,
    callback: () => {
      clearTimeout(handle)
      throw new Error(
        'Duplex Stub not-awaited this pattern:\n' +
        JSON.stringify(pattern, null, 2) + '\n\n' +
        'However, it matched one of these values written to the stub:\n' +
        JSON.stringify(this._receivedValues, null, 2)
      )
    }
  })

  this._checkAwaits()
}

DuplexStub.prototype.probe = function() {
  _(this._probeOut).each((x) => {
    console.log('[PROBE]')
    console.log(JSON.stringify(x, null,2))
    window.pv = JSON.stringify(x, null,2);
    window.pvr = x; // raw
    try { window.pvp = JSON.parse(x); } catch(_) {} // parsed
  })
}



export default () => new DuplexStub()
