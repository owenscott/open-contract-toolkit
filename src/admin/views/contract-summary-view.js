var Backbone = require('backbone'),
		$ = require('jquery'),
		_ = require('underscore');

var fs = require('fs');
var conf = JSON.parse(fs.readFileSync('./conf.json').toString());

var path = require('path');

Backbone.$ = $;

module.exports = Backbone.View.extend({

	initialize: function() {
		this.template = _.template(fs.readFileSync(path.join(__dirname, '../templates/contract-summary.ejs')).toString());
	},

	render: function() {
		var self = this;
		$.get('http://' + conf.apiHost + ':' + conf.apiPort + '/contract-stats', function(result) {
			self.$el.html(self.template(result));
		})
	}

})