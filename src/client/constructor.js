import _ from 'highland'
import logger from '../stream-utils/logger'
import duplex from 'duplexer'

let constructor = (net, path) => {
  let host = path.split(':')[0]
  let port = parseInt(path.split(':')[1], 10)
  let connection = net.connect(port, host);
  connection.on('connect', logger('Cannonville client connected'))

  let write = _()
  let read = _()
  let api = duplex(write, read)
  write
    .map((cmd) => JSON.stringify({
      event: cmd
    }))
    .pipe(connection)

  _(connection)
    .map(JSON.parse)
    .each(function(resp) {
      var error = new Error(resp.error.message)
      error.code = resp.error.code
      read.emit('error', error);
    })

  return api
}

export default constructor
