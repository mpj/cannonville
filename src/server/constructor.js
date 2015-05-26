import _ from 'highland'
import logger from '../stream-utils/logger'

let constructor = (net, guid, boilerBayPath, serverPort) => {
  let boilerBayHost = boilerBayPath.split(':')[0]
  let boilerBayPort = parseInt(boilerBayPath.split(':')[1], 10)

  let server = net.createServer((cannonvilleConnection) => {
    let boilerBayConnection = net.connect(boilerBayPort, boilerBayHost)
    _(cannonvilleConnection)
      .split()
      .compact()
      .map((x) => JSON.parse(x))
      .map((command) => {
        if (command.event) {
          return 'send ' +
            command.event.book + ' ' +
            (guid().replace(/-/g,'')) + ' ' +
            JSON.stringify(command.event.body) +
            '\n'
        } else if(command.consume) {
          return 'consume ' +
            command.consume.book + ' ' +
            (command.consume.group || guid()) + ' ' +
            command.consume.offsetReset +
            '\n'
        } else if (command.next) {
          return 'next\n'
        } else if (command.commit) {
          return 'commit\n'
        }
      })
      .pipe(boilerBayConnection)
    _(boilerBayConnection)
      .fork()
      .map((buffer) => {
        let body = buffer.toString()
        if (body.match(/msg/)) {
          return {
            event: JSON.parse(body.match(/msg\s(.+)/)[1])
          }
        } else if (body.match(/consume\-started/)) {
          return {
            consumeStarted: true
          }
        } else if (body.match(/commit\-ok/)) {
          return {
            commitOK: true
          }
        } else if (body.match(/^error/)){
          var parts = body.match(/error\s(\S+)\s(.+)/)
          return {
            error: {
              code: parts[1],
              message: parts[2]
            }
          }
        }
      })
      .compact()
      .errors(({code, message}, push) =>
        push(null, { error: {
          code,
          message: 'Boiler Bay emitted an error with message: ' + message
        }}))
      .map((x) => JSON.stringify(x) + '\n')
      .pipe(cannonvilleConnection)
  })
  server.listen(serverPort)
}

export default constructor
