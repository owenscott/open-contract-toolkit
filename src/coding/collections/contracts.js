var Backbone = require('backbone'),
		_ = require('underscore'),
		$ = require('jquery');

var fs = require('fs');

var PageableCollection = require('backbone.paginator')

var Contract = require('./../models/contract.js');

var conf = JSON.parse(fs.readFileSync('./conf.json').toString());

Backbone.$ = $;

module.exports = PageableCollection.extend({

	initialize: function(settings) {

		this.coderId = settings.coderId;
		console.log(this.coderId);

	},

	url: function() {
		return 'http://' + conf.apiHost + ':' + conf.apiPort + '/coders/' + this.coderId + '/contracts';
	},

	state: {
		firstPage: 1,
		pageSize: 1
	},

	parseRecords: function(response, options) {

		var tempModels = _.clone(this.models) || [];
		tempModels[this.state.currentPage] = response.items[0]
		return tempModels;

	},

	parseState: function(response, queryParams, state, options) {
		return {totalRecords: response.total_count}
	},

	model: Contract

})