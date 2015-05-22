import _ from 'highland'
import logger from '../stream-utils/logger'
import duplex from 'duplexer'

let constructor = (net, path) => {
  let host = path.split(':')[0]
  let port = parseInt(path.split(':')[1], 10)
  let connection = net.connect(port, host);
  connection.on('connect', logger('Cannonville client connected'))

  let currentConsumerCallback;

  let write = _()
  let read = _()
  let api = duplex(write, read)
  write
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

  api.replay = (topic, callback) => {
    currentConsumerCallback = callback
    connection.write(JSON.stringify({
      consume: {
        topic,
        offsetReset: 'smallest'
      }
    })+'\n')

  }

  return api
}

export default constructor
