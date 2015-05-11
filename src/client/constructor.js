import _ from 'highland'
import logger from '../stream-utils/logger'

let constructor = (net, path) => {
  let host = path.split(':')[0]
  let port = parseInt(path.split(':')[1], 10)
  let connection = net.connect(port, host);
  connection.on('connect', logger('Cannonville client connected'))

  let api = _()
  api
    .map((cmd) => JSON.stringify({
      event: cmd
    }))
    .pipe(connection)

  return api
}

export default constructor
