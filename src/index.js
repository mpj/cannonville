import _ from 'highland'

let constructor = (net, guid, boilerBayPath, serverPort) => {
  let boilerBayHost = boilerBayPath.split(':')[0]
  let boilerBayPort = parseInt(boilerBayPath.split(':')[1], 10)

  let server = net.createServer((cannonvilleConnection) => {

    let boilerBayConnection = net.connect(boilerBayPort, boilerBayHost)

    _(cannonvilleConnection)
      .map(JSON.parse)
      .map((command) => {
        /*
        {
          type: 'write',
          event: {
            topic: topic,
            body: { hello: 123 }
          }
        }
        */
        return 'send ' +
        command.event.topic + ' ' +
        guid() + ' ' +
        JSON.stringify(command.event.body)
      })
      .pipe(boilerBayConnection)

    cannonvilleConnection.on('end', () => {
      // client disconnected, keeping for reference
    })
  })
  server.listen(serverPort)
}


export default constructor

/*

  let connection = {
    topic: (topicName) => {
      let inp = _()
      inp.map((event) => ({
        body: event.body,
        saga: guid(),
      }))
      .map((event) =>
        'send ' +
        topicName + ' ' +
        event.saga + ' ' +
        JSON.stringify(event.body)
      ).pipe(netConnection)
      return inp
    }*/
