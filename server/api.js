var logger = require('./logger.js');
var fs = require('fs');
var mongodb = require('mongodb').MongoClient;
var routes = [];
var _ = require('underscore');
var async = require('async');
var mongoObjectId = require('mongodb').ObjectId;

var conf = JSON.parse(fs.readFileSync('./conf.json').toString());
var dbUrl = 'mongodb://' + conf.mongoHost + ':' + conf.mongoPort + '/' + conf.dbName;



// ===========================================================
//    											FUNCTIONS												 |
// ===========================================================


// gets the number of eligible contracts for a coder given that coder's ID
function getEligible(coderId, callback) {

	var eligibleContracts = 0;

	coderId = mongoObjectId(coderId);

	mongodb.connect(dbUrl, function(err, db) {
		db.collection('coders').find({_id: coderId}).toArray(function(err, coders) {
			// if coder is inactive then no elegible contracts
			if (!coders[0].active) {
				db.close();
				callback(err, 0);
			}
			// otherwise figure out how many
			else {
				db.collection('contracts').find({assigned: {$ne: coderId}, fullyAssigned: false}).toArray(function(err, contracts) {
					callback(err, (contracts && contracts.length) || 0);
					db.close();
				})	
			}
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

// ===========================================================
//    									CODER ROUTES												 |
// ===========================================================

routes.push({
	path: '/coders',
	method: 'GET',
	config: {
		cors: true
	},
	handler: function(request, reply) {

		mongodb.connect(dbUrl, function(err, db) {

			db.collection('coders').find({}).toArray(function(err, coders) {
				reply(coders);
				db.close();
			})

		})

	}
})

// get details on an individual coder
routes.push({
	path: '/coders/{coderId}',
	method: 'GET',
	config: {
		cors: true
	},
	handler: function(request, reply) {

		var coderId = mongoObjectId(request.params.coderId);

		mongodb.connect(dbUrl, function(err, db) {
			// get the coder by ID
			db.collection('coders').find({_id: coderId}).toArray(function(err, coders) {
				if (coders.length > 1) console.log('ERROR: too many coders');
				var coder = coders[0];
				// update their assigned contracts
				coder.assignedContracts = coder.assigned.length;
				// find out how many contracts they are eligible for
				getEligible(coder._id, function(err, numEligible) {
					coder.eligibleContracts = numEligible;
					// update the coder in the DB (just to keep things in sync)
					db.collection('coders').update({_id: coderId}, coder, function(err, results) {
						// send the coder to the client
						reply(coder);
						db.close();
					})
				})
			})
		})
	}
})

// update a coder (NOT IMPLEMENTED!)
routes.push({
	path: '/coders/{_id}',
	method: 'PUT',
	config: {
		cors: true
	},
	handler: function(request, reply) {
		var coderId = mongoObjectId(request.params._id);
		var updateObj = request.payload;
		var assignedContracts = _.clone(updateObj.assigned);
		updateObj._id = coderId;

		// clear out the coder's assignments if they are being put inactive
		if (!updateObj.active) {
			// strip the coder of all of their contracts
			updateObj.eligibleContracts = 0;
			updateObj.assigned = [];
			async.each(assignedContracts, function(assignedContractId, callback) {
				mongodb.connect(dbUrl, function(err, db) {
					// find the contract and remove the coder from its assignment
					assignedContractIdText = assignedContractId;
					assignedContractId = mongoObjectId(assignedContractId);
					db.collection('contracts').find({_id: assignedContractId}).toArray(function(err, contracts) {
						var contract = contracts[0];
						var newAssigned = []
						// convoluted for loop approach b/c Array.indexOf() doesn't work w/ mongo object ids
						contract.assigned.forEach(function(a) {
							if (a != request.params._id) {
								newAssigned.push(a);
							}
						})
						contract.assigned = newAssigned
						// remove its fullyassigned status if needed
						if (contract.assigned.length < 2 && contract.fullyAssigned) {
							contract.fullyAssigned = false;
						}
						// update the contract in the db
						db.collection('contracts').update({_id: assignedContractId}, contract, function(err, result) {
							if (err) logger.error(err);
							db.close();
							callback();
						})
					})	
				})
			},
			function(err) {
				// update the coder
				mongodb.connect(dbUrl, function(err, db) {
					db.collection('coders').update({_id: coderId}, updateObj, function(err, result) {
						if (err) logger.error(err);
						reply(updateObj);
						db.close();
					})			
				})
			})
		}
		// otherwise just update normally
		else {
			getEligible(coderId, function(err, numEligible) {
				updateObj.eligibleContracts = numEligible
				mongodb.connect(dbUrl, function(err, db) {
					if (err) logger.error(err);
					// update the coder
					db.collection('coders').update({_id: coderId}, request.payload, function(err, result) {
						if (err) logger.error(err);
						reply(updateObj);
						db.close();
					})
				})
			})
		}

	
	}
})

// add a new coder
routes.push({
	path: '/coders',
	method: 'POST',
	config: {
		cors: true
	},
	handler: function(request, reply) {
		mongodb.connect(dbUrl, function(err, db) {
			// add the new coder
			db.collection('coders').insert(request.payload, function(err, result) {
				var coder = result.ops[0]
				// figure out how many contracts they're eligible for
				getEligible(coder._id, function(err, numEligible) {
					logger.info(coder._id, 'eligible for', numEligible);
					coder.eligibleContracts = numEligible;
					// save the coder back into the db
					db.collection('coders').update({_id: coder._id}, coder, function(err, result) {
						if (err) logger.error(err);
						// send them back to the client to sync
						reply(coder);
						db.close();
					})
				})
			})
		})
	}
})

routes.push({
	path: '/coders/{coderId}',
	method: 'DELETE',
	config: {
		cors: true
	},
	handler: function(request, reply) {

	}
})

// needed for CORS only
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
	path: '/coders/{coderId}',
	method: 'OPTIONS',
	config: {
		cors: true
	},
	handler: function(request, reply) {
		reply();
	}
})


// ===========================================================
//    									  STATISTICS												 |
// ===========================================================


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


// ===========================================================
//    									  IMPERATIVE												 |
// ===========================================================


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
								db.close();
								reply({success: true})
							})
						})
					})
				})
			})
		})
	}
})


// ===========================================================
//    									  CONTRACTS 												 |
// ===========================================================

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

				db.close()

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
			})
		})

	}
})

// ===========================================================
//    									    EXPORT  												 |
// ===========================================================

module.exports = routes;