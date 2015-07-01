var Backbone = require('backbone'),
		$ = require('jquery');

var fs = require('fs');
var conf = JSON.parse(fs.readFileSync('./conf.json').toString());

Backbone.$ = $;

module.exports = Backbone.Model.extend({

	idAttribute: '_id',

	initialize: function() {
		var self = this;
		this.on('change:assigned', function() {
			self.set('assignedContracts', self.get('assigned').length)
		})
	},

	defaults: {
		assignedContracts: 0,
		eligibleContracts: 'unknown',
		completedContracts: 'unknown',
		assigned: []
	},

	urlRoot: 'http://' + conf.apiHost + ':' + conf.apiPort + '/coders'


})
