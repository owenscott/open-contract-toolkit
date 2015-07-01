var Backbone = require('backbone'),
		$ = require('jquery');

var fs = require('fs');
var conf = JSON.parse(fs.readFileSync('./conf.json').toString());

Backbone.$ = $;

var Coder = require('./../models/coder.js');

module.exports = Backbone.Collection.extend({

	initialize: function(settings) {
		
	},

	url: 'http://' + conf.apiHost + ':' + conf.apiPort + '/coders',
	
	model: Coder

})
