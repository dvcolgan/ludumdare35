Deodorant = require('deodorant')

types = new Deodorant('debug')

types.addFilter 'isInteger', (value) -> value % 1 == 0

types.addAlias 'Integer', 'Number|isInteger'

types.addAlias 'Point', ['Number', 'Number']

module.exports = types
