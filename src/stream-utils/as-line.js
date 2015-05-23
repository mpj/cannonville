import isString from 'mout/lang/isString'
export default (x) => (isString(x) ? x : JSON.stringify(x)) + '\n'
