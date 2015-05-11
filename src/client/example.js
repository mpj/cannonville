import client from './index'

let conn = client('localhost:1234')

setInterval(() =>
  conn.write({
    topic: 'mytopic',
    body: {
      hello: Math.floor(Math.random()*10000)
    }
  })
,250)
