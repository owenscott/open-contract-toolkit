var Backbone = require('backbone'),
		$ = require('jquery'),
		_ = require('underscore');

var fs = require('fs');

var conf = JSON.parse(fs.readFileSync('./conf.json').toString());

module.exports = Backbone.Model.extend({

	idAttribute: '_id',

	defaults: {
		title: ''
	},

	initialize: function() {
		this.on('change', function() {
			console.log('Record model changed')
			console.log(this.toJSON());
		});
	},

	urlRoot: 'http://' + conf.apiHost + ':' + conf.apiPort + '/records'

})