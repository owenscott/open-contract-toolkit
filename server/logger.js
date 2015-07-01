var winston = require('winston');

winston.loggers.add('console', {
	console: {
	  colorize: true
	}
})

module.exports = winston.loggers.get('console');