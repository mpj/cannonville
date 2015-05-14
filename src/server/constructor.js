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
        if (command.event) {
          return 'send ' +
            command.event.topic + ' ' +
            (guid().replace(/-/g,'')) + ' ' +
            JSON.stringify(command.event.body) +
            '\n'
        } else if(command.consume) {
          return 'consume ' +
            command.consume.topic + ' ' +
            command.consume.group + ' ' +
            command.consume.offsetReset +
            '\n'
        } else if (command.next) {
          return 'next\n'
        }
      })
      .pipe(boilerBayConnection)
    _(boilerBayConnection)
      .fork()
      .map((body) => {
        if (body.match(/msg/))
          return {
            message: JSON.parse(body.match(/msg\s(.+)/)[1])
          }
        else
        return {
          error: {
            code: body.split(' ')[1],
            message: body.split(' ')[2]
          }
        }
      })
      .map(JSON.stringify)
      .each((x) => cannonvilleConnection.write(x) )
  })
  server.listen(serverPort)
}

export default constructor
