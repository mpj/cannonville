import tape from 'tape'
import report from 'browserify-tape-spec'
tape.createStream().pipe(report('out'))

import client from './client/test'
import server from './server/test'
client(tape)
server(tape)
