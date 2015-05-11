import _ from 'highland'
import logger from '../stream-utils/logger'

let constructor = (net, guid, boilerBayPath, serverPort) => {
  let boilerBayHost = boilerBayPath.split(':')[0]
  let boilerBayPort = parseInt(boilerBayPath.split(':')[1], 10)

  let server = net.createServer((cannonvilleConnection) => {
    let boilerBayConnection = net.connect(boilerBayPort, boilerBayHost)
    _(cannonvilleConnection)
      .map(JSON.parse)
      .map((command) => {
        return 'send ' +
          command.event.topic + ' ' +
          (guid().replace(/-/g,'')) + ' ' +
          JSON.stringify(command.event.body) +
          '\n'
      })
      .pipe(boilerBayConnection)

    _(boilerBayConnection).each(logger('Boiler Bay Data'))
  })
  server.listen(serverPort)
}

export default constructor
