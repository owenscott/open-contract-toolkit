var _ = require('underscore'),
		$ = require('jquery'),
		Backbone = require('backbone'),
		path = require('path'),
		url = require('url'),
		async = require('async');

var Coder = require('./../../shared/models/coder.js'),
		Contracts = require('./../collections/contracts.js');

var fs = require('fs');

module.exports = Backbone.View.extend({

	initialize: function() {
		this.userId = _.last(window.location.href.split('/'));
		this.template = _.template(fs.readFileSync(path.join(__dirname, '../templates/landing.ejs')).toString());
		this.coder = new Coder({
			_id: this.userId
		})
	},

	events: {
		'click #nav-forward': 'navForward',
		'click #nav-backward': 'navBackward',
		'click #nav-start': 'navStart',
		'click #nav-end': 'navEnd'
	},

	render: function() {
		var self = this;

		if (!this._activeModelIndex) {
			this._activeModelIndex = 1;
		}
		
		console.log(self.contracts.models[self._activeModelIndex]);
		console.log(self.coder);

		self.$el.html(self.template({
			activeModel: self._activeModelIndex,
			totalModels: self.contracts.state.totalRecords,
			contract: self.contracts.models[self._activeModelIndex].toJSON(),
			coder: self.coder.toJSON()
		}));
		
		
	},

	navForward: function(e) {
		e.preventDefault()
		this.setActiveModelIndex(this._activeModelIndex + 1)
	},

	navBackward: function(e) {
		e.preventDefault()
		this.setActiveModelIndex(this._activeModelIndex - 1);
	},

	navStart: function(e) {
		e.preventDefault()
		this.setActiveModelIndex(0);
	},

	navEnd: function(e) {
		e.preventDefault();
		this.setActiveModelIndex(this.contracts.state.totalRecords)
	},

	setActiveModelIndex: function(i) {

		var self = this;

		if (!this.contracts) {

			// get coder
			this.coder.fetch({
				
				success: function() {

					self.contracts = new Contracts({
						coderId: self.coder.get('_id')
					})

					self.setActiveModelIndex(i)

				},
				error: function() {
					console.log('error', arguments);
					self.$el.html('<strong>Error loading coder data</strong>', JSON.stringify(arguments))
				}
			})

		}
		else {

			try {
				// this.clearErrorScreen();

				console.log('i', i);

				// if no models have been loaded get the relevant one
				if (!this.contracts.models.length) {
					this.contracts.getPage(i).done(function() {
						self.setactiveModelIndex(i);
					})
				}
				// if the relevant model hasn't been loaded grab it
				else if ( (!this.contracts.models[i] || _.isEmpty(this.contracts.models[i].attributes)) && i >= 1 && (i <= this.contracts.state.totalRecords || !this.contracts.state.totalRecords)) {
					// this.showRecordAsLoading(i);
					this.contracts.getPage(i).done(function() {
						self._activeModelIndex = i;
						// self.router.navigate('contracts/' + parseInt((i + 1)))
						self.render();
					})
				}
				// if the relevant model already has been loaded, go to it
				else if (this.contracts.models[i]) {
					// this.router.navigate('contracts/' + parseInt((i + 1)))
					this._activeModelIndex = i;
					self.render();
				}
				else {
					// alert('Value for record number must be between 1 and ' + self.contracts.state.totalRecords);
				}
			}
			catch(e) {
				//should probably switch this to this.collection.state.error and this.collection.state.errorMsg and then add listeners
				console.log('Error for', i);
				// this.setErrorScreen('Error loading data for record ' + (i+1));
				throw e;
			}
				
		}

	}

})