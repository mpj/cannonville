import client from './index'
import _ from 'highland'
import logger from '../stream-utils/logger'

let conn1 = client('localhost:1234')

setInterval(() =>
  conn1.write({
    topic: 'mytopicz',
    body: {
      hellod: Math.floor(Math.random()*10000)
    }
  })
,250)

let conn2 = client('localhost:1234')

conn2.play('mytopicz', (x, ack) => {
  console.log("got", x)
  ack()
})
