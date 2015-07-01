var Backbone = require('Backbone'),
		$ = require('jquery'),
		_ = require('underscore'),
		path = require('path');

var fs = require('fs');
var conf = JSON.parse(fs.readFileSync('./conf.json').toString());

Backbone.$ = $;


module.exports = Backbone.View.extend({

	tagName: 'tr',

	initialize: function() {
		var self = this;
		this.template = _.template(fs.readFileSync(path.join(__dirname, '../templates/coder-table.ejs')).toString());
		this.model.on('sync', function() {
			self.render();
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

		var self = this;
		e.preventDefault();

		var form = e.target.closest('form');
		var data = $(form).serializeArray();
		var dataObj = {};

		data.forEach(function(d){
			dataObj[d.name] = d.value;
		})

		dataObj.coder = this.model.get('_id');

		// temporarily disable submit forms to prevent race condition on server		
		$('.assign-form').prop('disabled', true);

		// send an imperative API request to assign new contracts to the coder
		// API request handler updates all contracts and coders as a side-effect
		$.post('http://' + conf.apiHost + ':' + conf.apiPort + '/contract-assign', dataObj, function(result) {
			
			// re-enable submit forms
			// $(form).trigger('reset');
			// $('.assign-form').prop('disabled', false);

			// sync all of the models (which triggers re-render)
			self.model.collection.models.forEach(function(model) {
				model.fetch({
					success: function() {
						// nothingn yet
					}
				})
			})
		})



	}

})