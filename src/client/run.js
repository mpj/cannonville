import client from './index'
import _ from 'highland'
import logger from '../stream-utils/logger'

let conn = client('localhost:1234')

setInterval(() =>
  conn.write({
    topic: 'mytopic',
    body: {
      helloc: Math.floor(Math.random()*10000)
    }
  })
,250)


conn.replay('mytopic', () => {
  console.log("arguments", arguments)
})
