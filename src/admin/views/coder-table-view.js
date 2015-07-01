var Backbone = require('Backbone'),
		$ = require('jquery');

var _ = require('underscore');
var fs = require('fs');
var path = require('path');

var CoderRowView = require('./coder-row-view.js');

Backbone.$ = $;

module.exports = Backbone.View.extend({

	initialize: function() {
		var self = this;
		this.template = _.template(fs.readFileSync(path.join(__dirname, '../templates/coder-section.ejs')).toString());
		this.collection.on('add', function() {
			self.render();
		})
	},

	render: function() {

		this.$el.html(this.template());

		var self = this;
		this.$coders = this.$('#coders');

		this.$coders.html('');

		this.collection.models.forEach(function(coder) {

			var coderRowView = new CoderRowView({
				model: coder
			});

			self.$coders.append(coderRowView.render().el);;

		})

	},

	events: {
		'click #new-coder-form button': 'addCoder'
	},

	addCoder: function(e) {
		
		e.preventDefault();
		var coder = {};
		$(e.target.closest('form')).serializeArray().forEach(function(d) {
			coder[d.name] = d.value;
		})

		this.collection.create(coder);

	}


})


// $('#coders').html('')
// var coderTemplate = 
// coders.models.forEach(function(model) {
// 	$('#coders').append(coderTemplate(model.attributes));
// })