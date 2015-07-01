var Backbone = require('Backbone'),
		$ = require('jquery'),
		_ = require('underscore'),
		path = require('path');

var fs = require('fs');

Backbone.$ = $;


module.exports = Backbone.View.extend({

	tagName: 'tr',

	initialize: function() {
		this.template = _.template(fs.readFileSync(path.join(__dirname, '../templates/coder-table.ejs')).toString());
		this.model.on('sync', function() {
			console.log('sunk');
		})
	},

	render: function() {
		console.log(this.model.toJSON());
		if (!this.model.get('active')) {
			this.$el.remove();
		}
		else {
			this.$el.html(this.template(this.model.toJSON()));
		}
		return this;	
	},

	events: {
		'click button': 'onButtonClick'
	},

	onButtonClick: function(e) {


		e.preventDefault();

		var form = e.target.closest('form');
		var data = $(form).serializeArray();
		var dataObj = {};

		data.forEach(function(d){
			dataObj[d.name] = d.value;
		})

		dataObj.coder = this.model.get('_id');
		console.log(dataObj);
		$(form).trigger('reset');

		$.post('contract-assign', dataObj, function(result) {
			console.log(result);
		})

	}

})