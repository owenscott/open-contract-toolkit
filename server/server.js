var Hapi = require('hapi');
var fs = require('fs');
var _ = require('underscore');
var async = require('async');

var server = new Hapi.Server({})

var mongodb = require('mongodb').MongoClient;
var mongoObjectId = require('mongodb').ObjectId;
var winston = require('winston');

var conf = JSON.parse(fs.readFileSync('./conf.json').toString());

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


var dbUrl = 'mongodb://' + conf.mongoHost + ':' + conf.mongoPort + '/' + conf.dbName;


winston.loggers.add('console', {
	console: {
	  colorize: true
	}
})


var logger = winston.loggers.get('console');


// terrible O(n^2) algorithm to brute-force update the entire DB to be internally consistent
function updateDb(callback) {

	mongodb.connect(dbUrl, function(err, db) {

		if (err) console.log(err);

		db.collection('contracts').find({}).toArray(function(err, contracts) {

			db.collection('coders').find({}).toArray(function(err, coders) {

				async.each(coders, function(coder, callback) {

					var queryObj = _.pick(coder, '_id');
					queryObj['_id'] = mongoObjectId(queryObj['_id']);
					coder.eligibleContracts = 0;
					db.collection('contracts').find({assigned:{$ne: coder['_id']}, fullyAssigned: false}).toArray(function(err, contracts) {
						coder.eligibleContracts = (contracts && contracts.length) || 0;
						coder.assignedContracts = coder.assigned.length;
						db.collection('coders').update(queryObj, coder, function(err, done) {
							err && console.log(err);
							callback();
						})
					})
					
				},
				function() {
					db.close();
					process.nextTick(function() {
						callback();
					})
				})

			})

		})

	})

}


content.route({
	path: '/admin',
	method: 'GET',
	handler: {
		file: {
			path: './admin.html'
		}
	}
})


content.route({
	path: '/coding',
	method: 'GET',
	handler: {
		file: {
			path: './coder-landing.html'
		}
	}
})

content.route({
	path: '/coding/{coderId}',
	method: 'GET',
	handler: {
		file: {
			path: './coder-interface.html'
		}
	}
})


content.route({
	path: '/',
	method: 'GET',
	handler: function (request, reply) {
		reply('<h1>Welcome page</h1><div><a href="admin">Admin</a></div><div><a href="coding">Coding</a></div>');
	}
})

content.route({
	path: '/{resource}',
	method: 'GET',
	handler: function(request, reply) {
		reply.file('./static/' + request.params.resource)
	}
})

content.route({
	path: '/src/{dir}/{resource}',
	method: 'GET',
	handler: function(request, reply) {
		reply.file('./' + 'src/' + request.params.dir + '/' + request.params.resource);
	}
})

api.route({
	path: '/coders',
	method: 'GET',
	config: {
		cors: true
	},
	handler: function(request, reply) {

		updateDb(function() {

			mongodb.connect(dbUrl, function(err, db) {

				db.collection('coders').find({}).toArray(function(err, coders) {
					reply(coders);
					db.close();
				})

			})

		})

	}
})

api.route({
	path: '/coders/{coderId}',
	method: 'GET',
	config: {
		cors: true
	},
	handler: function(request, reply) {

		var queryObj = {
			_id: mongoObjectId(request.params.coderId)
		}

		mongodb.connect(dbUrl, function(err, db) {

			db.collection('coders').find(queryObj).toArray(function(err, coders) {
				if (coders.length > 1) console.log('ERROR: too many coders');
				reply(coders[0]);
			})

		})

	}
})

api.route({
	path: '/coders/{_id}',
	method: 'PUT',
	config: {
		cors: true
	},
	handler: function(request, reply) {

		var searchObj = _.pick(request.params, '_id');
		var updateObj = request.payload;
		searchObj['_id'] = mongoObjectId(searchObj['_id']);
		updateObj['_id'] = searchObj['_id'];

		updateDb(function() {

			var newNumAssigned = updateObj.assignedContracts;
			var contractsToAssign = 0;

			mongodb.connect(dbUrl, function(err, db) {
				db.collection('coders').find(searchObj).toArray(function(err, coders) {

					err && console.log(err);
					var oldNumAssigned = coders[0].assignedContracts;
					var coderId = coders[0]['_id'];
					var coder = coders[0];

					if (newNumAssigned > oldNumAssigned) {
						contractsToAssign = Math.min(newNumAssigned - oldNumAssigned, coders[0].eligibleContracts);
						db.collection('contracts').find({
							fullyAssigned: false,
							assigned: {
								$ne: coderId
							}
						})
						.limit(contractsToAssign)
						.toArray(function(err, contracts) {
		
							async.each(contracts, function(contract, callback) {
								contract.assigned.push(coderId);
								if (contract.assigned.length === 2) {
									contract.fullyAssigned = true
								}
								else if (contract.assigned.length > 2) {
									logger.error('ERROR: too many coders assigned to contract')
								}
								else {
									contract.fullyAssigned = false;
								}
								coder.assigned.push(contract['_id']);
								db.collection('contracts').update({'_id': mongoObjectId(contract['_id'])}, contract, function(err, something) {
									callback();
								})	
							},
							function() {
								logger.info('updating', coder);
								db.collection('coders').update({'_id': mongoObjectId(coder['_id'])}, coder, function(err, something) {
									err && logger.error(err);
									updateDb(function() {
										db.collection('coders').find({'_id': mongoObjectId(coder['_id'])}).toArray(function(err, coders) {
											reply(coders[0]);
											db.close();
										})
									})
								})
							})

						})
					}
					else {
						reply(coders[0])
					}

				})
			})


		})


		// assign contracts and update


	}
})

api.route({
	path: '/coders',
	method: 'POST',
	config: {
		cors: true
	},
	handler: function(request, reply) {

		mongodb.connect(dbUrl, function(err, db) {
			db.collection('coders').insert(request.payload, function(err, something) {

				// assign contracts and update

				reply(true);
				db.close();
			})
		})

	}
})


api.route({
	path: '/contract-stats',
	method: 'GET',
	config: {
		cors: true
	},
	handler: function(request, reply) {
		mongodb.connect(dbUrl, function(err, db) {
			var stats = {}
			db.collection('contracts').find({}).toArray(function(err, arr) {
				stats.count = arr.length;
				reply(stats);
				db.close();
			})
		})
	}
})


api.route({
	path: '/contract-assign',
	method: 'POST',
	config: {
		cors: true
	},
	handler: function(request, reply) {
		// mongo
		reply({success: true});
	}
})



api.route( {
	path: '/coders/{coderId}/contracts',
	method: 'GET',
	config: {
		cors: true
	},
	handler: function(request, reply) {

		var page = parseInt(request.query.page) - 1,
				perPage = parseInt(request.query.per_page);

		var queryObj = {
			assigned: mongoObjectId(request.params.coderId)
		}

		mongodb.connect(dbUrl, function(err, db) {
			db.collection('contracts').find(queryObj).toArray(function(err, contracts) {

				if (!contracts.slice(page*perPage, (page*perPage) + perPage).length) {
					logger.warn('Request for contracts that returned nothing');
				}

				if ((page === 0 || page) && perPage) {
					reply({
						items: contracts.slice(page*perPage, (page*perPage) + perPage),
						total_count: contracts.length
					})
				}
				else {
					logger.error('Paginated request for contracts was incorrect')
					reply('Bad request')
				}
				db.close()
			})
		})

	}
})

server.start(function() {
	console.log('server started');
})