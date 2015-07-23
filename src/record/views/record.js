var Backbone = require('backbone'),
		$ = require('jquery'),
		_ = require('underscore');


var Record = require('../models/record.js');

var fs = require('fs');

Backbone.$ = $;

module.exports = Backbone.View.extend({

	initialize: function(settings) {

		this.template = _.template(fs.readFileSync('./src/record/templates/record.ejs').toString());

	},

	events: {
		'blur input': 'onInputChange'
	},

	render: function() {
		this.$el.html(this.template(this.model.toJSON()));
	},

	onInputChange: function(e) {
		e.stopPropagation();
		
		var fieldName = e.target.name,
				fieldValue = e.target.value;

		this.model.set(fieldName, fieldValue);
		this.model.save();

	}


})