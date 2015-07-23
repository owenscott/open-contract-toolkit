var Hapi = require('hapi');
var apiRoutes = require('./api.js');
var contentRoutes = require('./content.js');
var server = new Hapi.Server({})
var fs = require('fs');
var conf = JSON.parse(fs.readFileSync('./conf.json').toString());
var logger = require('./logger.js');

var api = server.connection({
	port: conf.apiPort,
	host: conf.apiHost,
	labels: ['api']
})

var content = server.connection({
	port: conf.contentPort,
	host: conf.contentHost,
	labels: ['content']
})

api.route(apiRoutes);
content.route(contentRoutes);

server.start(function(err) {
	if (err) {logger.error(err.code)}
	logger.info('server started');
})