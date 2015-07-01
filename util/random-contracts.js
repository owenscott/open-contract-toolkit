var mongodb = require('mongodb').MongoClient;
var _ = require('underscore');

var randomWords = require('random-words');


mongodb.connect('mongodb://localhost:27017/contract-test', function(err, db) {

	db.collection('contracts').drop(function(err, result) {
		
		err && console.log(err);

		_.range(0,5).forEach(function(num) {
			db.collection('contracts').insert({
				title: randomWords(5).join(' '),
				assigned: [],
				fullyAssigned: false
			})
		})

	})


})