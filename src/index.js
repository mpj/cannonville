import _ from 'highland'

let constructor = (net, guid, path) => {
  let host = path.split(':')[0]
  let port = path.split(':')[1]
  let netConnection = net.connect(port, host)

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
    }
  }
  return connection
}

export default constructor
