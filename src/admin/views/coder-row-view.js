var Backbone = require('backbone'),
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
		this.$el.html(this.template(this.model.toJSON()));
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

		// dataObj.contractsToAssign = parseInt(dataObj.contractsToAssign)
		// var eligibleContracts = this.model.get('eligibleContracts');

		// if (dataObj.contractsToAssign <= eligibleContracts && dataObj.contractsToAssign > 0) {
		// 	this.model.set('eligibleContracts', eligibleContracts - dataObj.contractsToAssign);
		// 	this.model.set('assignedContracts', this.model.get('assignedContracts') + dataObj.contractsToAssign)
		// 	this.model.save();
		// 	// race condition
		// 	this.model.collection.fetch();
		// 	this.render();
		// }
		// else {
		// 	$(form).trigger('reset');
		// }

	}

})
