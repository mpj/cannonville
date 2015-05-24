import client from './index'
import _ from 'highland'
import logger from '../stream-utils/logger'

let conn1 = client('localhost:1234/mytopicz')

setInterval(() =>
  conn1.write({
    body: {
      hellod: Math.floor(Math.random()*10000)
    }
  })
,250)

let conn2 = client('localhost:1234/mytopicz')

conn2.play((x, ack) => {
  console.log("got", x)
  ack()
})
