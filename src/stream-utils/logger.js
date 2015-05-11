export default (name) =>
  console.log.bind(console, '[LOGGER]', (name || 'unnamed'))
