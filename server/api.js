var logger = require('./logger.js');
var fs = require('fs');
var mongodb = require('mongodb').MongoClient;
var routes = [];
var _ = require('underscore');
var async = require('async');
var mongoObjectId = require('mongodb').ObjectId;

var conf = JSON.parse(fs.readFileSync('./conf.json').toString());
var dbUrl = 'mongodb://' + conf.mongoHost + ':' + conf.mongoPort + '/' + conf.dbName;


function getEligible(coderId, callback) {

	var queryObj = {}
	var eligibleContracts = 0;

	coderId = mongoObjectId(coderId);
	
	mongodb.connect(dbUrl, function(err, db) {
		db.collection('contracts').find({assigned: {$ne: coderId}, fullyAssigned: false}).toArray(function(err, contracts) {

			callback(err, (contracts && contracts.length) || 0);

		})	
	})
}

// terrible O(n^2) algorithm to brute-force update the entire DB to be internally consistent
function updateDb(callback) {

	mongodb.connect(dbUrl, function(err, db) {

		if (err) console.log(err);

		db.collection('contracts').find({}).toArray(function(err, contracts) {
			if (err) logger.error(err);
			db.collection('coders').find({}).toArray(function(err, coders) {
				if (err) logger.error(err);
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



routes.push({
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

routes.push({
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
				
				var coder = coders[0];
				coder.assignedContracts = coder.assigned.length;
				getEligible(coder._id, function(err, numEligible) {
					coder.eligibleContracts = numEligible;
					db.collection('coders').update(queryObj, coder, function(err, results) {
						reply(coder);
						db.close();
					})
				})

			})

		})

	}
})

routes.push({
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

routes.push({
	path: '/coders',
	method: 'POST',
	config: {
		cors: true
	},
	handler: function(request, reply) {

		mongodb.connect(dbUrl, function(err, db) {
			db.collection('coders').insert(request.payload, function(err, result) {
				// result.ops[0].eligibleContracts = 56
				var coder = result.ops[0]
				getEligible(coder._id, function(err, numEligible) {
					
					logger.info(coder._id, 'eligible for', numEligible);
					coder.eligibleContracts = numEligible;
					reply(coder);
					db.close();

				})
			})
		})

	}
})

routes.push({
	path: '/coders',
	method: 'OPTIONS',
	config: {
		cors: true
	},
	handler: function(request, reply) {
		reply();
	}
})



routes.push({
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
				stats.singleAssigned = _.filter(arr, function(contract) {
					return contract.assigned.length === 1
				}).length
				stats.doubleAssigned = _.filter(arr, function(contract) {
					return contract.assigned.length === 2 && !contract.completed;
				}).length
				stats.completed = _.filter(arr, function(contract) {
					return contract.completed === 1;
				}).length
				reply(stats);
				db.close();
			})
		})
	}
})


routes.push({
	path: '/contract-assign',
	method: 'POST',
	config: {
		cors: true
	},
	handler: function(request, reply) {

		var coderId = mongoObjectId(request.payload.coder);

		mongodb.connect(dbUrl, function(err, db) {
			if (err) logger.error(err);
			// find coder
			db.collection('coders').find({_id: mongoObjectId(coderId)}).toArray(function(err, coders) {
				
				if (coders.length > 1) logger.warn('Multiple coders returned for one assignment request');
				if (err) logger.error(err);

				var coder = coders[0];
				// find contracts for coder
				db.collection('contracts').find({assigned: {$ne: coderId}, fullyAssigned: false}).limit(parseInt(request.payload.contractsToAssign)).toArray(function(err, contracts) {
					// assign the coder to each of the contracts
					async.each(contracts, function(contract, callback) {
						// assign the coder to the contract (and vice versa)
						contract.assigned.push(coderId);
						if (contract.assigned.length === 2) {
							contract.fullyAssigned = true;
						}
						coder.assigned.push(contract._id);
						// update the contract
						// TODO: this should really be restful with built-in checks
						db.collection('contracts').update({_id: contract._id}, contract, function(err, result) {
							if (err) logger.error(err);
							callback();							
						})

					}, 
					// update the coder
					function(err) {
						coder.assignedContracts = coder.assigned.count;
						getEligible(coder._id, function(err, numEligible) {
							coder.numEligible = numEligible;
							// TODO: this should really be restful with built-in checks
							db.collection('coders').update({_id: coder._id}, coder, function(err, result) {
								reply({success: true})
							})
						})
					})
				})
			})
		})
	}
})



routes.push( {
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

module.exports = routes;