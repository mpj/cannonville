import constructor from './constructor'
import partial from 'mout/function/partial'
import net from 'net'
import uuid from 'uuid'

export default partial(constructor, net, uuid)
