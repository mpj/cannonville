import _ from 'highland'
import partial from 'mout/function/partial'
import logger from '../stream-utils/logger'
import duplex from 'duplexer'

let constructor = (net, uri) => {

  let parts = uri.match(/(.+):(\d+)(?:\/(.+))?/)
  let host = parts[1]
  let port = parseInt(parts[2], 10)
  let book = parts[3]

  let connection = net.connect(port, host);
  connection.on('connect', logger('Cannonville client connected'))

  let currentConsumerCallback;

  let write = _()
  let read = _()
  let api = duplex(write, read)
  write
    .doto((cmd) => cmd.topic = cmd.topic || book)
    .map((cmd) => JSON.stringify({
      event: cmd
    })+'\n')
    .pipe(connection)

  let writeNext = () => connection.write(JSON.stringify({
    next: true
  })+'\n')

  _(connection)
    .fork()
    .map(JSON.parse)
    .each(function(resp) {
      if (resp.consumeStarted || resp.commitOK) {
        writeNext()
      } else if(resp.message) {
        let ack = () => {
          connection.write(JSON.stringify({
            commit: true
          })+'\n')
        }
        currentConsumerCallback(resp.message, ack)
      }
      else {
        var error = new Error(resp.error.message)
        error.code = resp.error.code
        read.emit('error', error);
      }

    })

  let consume = (offsetReset, topic, group, callback) => {
    if (!callback) callback = group
    currentConsumerCallback = callback
    connection.write(JSON.stringify({
      consume: {
        topic,
        group,
        offsetReset
      }
    })+'\n')
  }
  api.replay = partial(consume, 'smallest')
  api.play   = partial(consume, 'largest')

  return api
}

export default constructor
