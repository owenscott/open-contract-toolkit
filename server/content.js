var logger = require('./logger.js');
var routes = [];
var mongodb = require('mongodb').MongoClient;
var mongoObjectId = require('mongodb').ObjectId;
var fs = require('fs');
var async = require('async');

var conf = JSON.parse(fs.readFileSync('./conf.json').toString());
var dbUrl = 'mongodb://' + conf.mongoHost + ':' + conf.mongoPort + '/' + conf.dbName;


routes.push({
	path: '/admin',
	method: 'GET',
	handler: {
		file: {
			path: './pages/admin.html'
		}
	}
})


routes.push({
	path: '/coding',
	method: 'GET',
	handler: {
		file: {
			path: './pages/coder-landing.html'
		}
	}
})

routes.push({
	path: '/coding/{coderId}',
	method: 'GET',
	handler: {
		file: {
			path: './pages/coder-interface.html'
		}
	}
})


routes.push({
	path: '/',
	method: 'GET',
	handler: function (request, reply) {
		reply('<h1>Welcome page</h1><div><a href="admin">Admin</a></div><div><a href="coding">Coding</a></div>');
	}
})

routes.push({
	path: '/{resource}',
	method: 'GET',
	handler: function(request, reply) {
		reply.file('./static/' + request.params.resource)
	}
})

routes.push({
	path: '/src/{dir}/{resource}',
	method: 'GET',
	handler: function(request, reply) {
		reply.file('./' + 'src/' + request.params.dir + '/' + request.params.resource);
	}
})

routes.push({
	path: '/contracts', 
	method: 'GET',
	handler: function(request, reply) {
		var replyText = '<html><head><link rel="stylesheet" href="bootstrap.min.css"></head><body><div class="container"><h1>All the Contracts</h1>'
		replyText = replyText + '<p>This isn\'t meant as a functional page, but rather just a place to check if any of the contracts are being assigned twice to the same coder, or look for any other issues</p>';
		replyText = replyText + '<p><strong>Back to <a href="admin">admin</a></strong></p>'
		replyText = replyText + '<table class="table table-striped"><thead><tr><th>Title</th><th>Coder 1</th><th>Coder 2</th><th>Fully Assigned</th></tr></thead><tbody>'
		mongodb.connect(dbUrl, function(err, db) {
			if (err) logger.error(err);
			db.collection('contracts').find({}).toArray(function(err, contracts) {
				
				var t = ''
				async.eachSeries(contracts, function(contract, callback) {
					var coders = [];
					async.eachSeries(contract.assigned, function(coderId, callback) {
						db.collection('coders').find({_id: mongoObjectId(coderId)}).toArray(function(err, coder) {
							coders.push(coder[0].name);
							callback();
						})
					},
					function(err) {
						var row = '<tr><td>' + contract.title + '</td><td>' + (coders[0] || '') + '</td><td>' + (coders[1] || '') + '</td><td>' + contract.fullyAssigned + '</td></tr>'
						replyText = replyText + row;
						callback()
					})
					
				}, 
				function(err) {
					replyText = replyText + '</tbody></table></div></body></html>'
					db.close();
					reply(replyText);
				})
			
			})
		})
	}
})

module.exports = routes;