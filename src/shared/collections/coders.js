var Backbone = require('Backbone'),
		$ = require('jquery');

var fs = require('fs');
var conf = JSON.parse(fs.readFileSync('./conf.json').toString());

Backbone.$ = $;

var Coder = require('./../models/coder.js');

module.exports = Backbone.Collection.extend({

	initialize: function(settings) {
		this.on('change:assigned', function() {
			console.log('someoen had new contracts assigned');
		})
	},

	url: 'http://' + conf.apiHost + ':' + conf.apiPort + '/coders',
	
	model: Coder

})