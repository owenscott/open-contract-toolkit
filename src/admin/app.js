var Coders = require('./../shared/collections/coders.js');
var TableView = require('./views/coder-table-view.js');
var ContractSummaryView = require('./views/contract-summary-view.js');

var $ = require('jquery');
var _ = require('underscore');
var fs = require('fs');


$('document').ready(function() {
	setTimeout(function() {

		var coders = new Coders();

		coders.fetch({
			success: function() {

				var tableView = new TableView({
					collection: coders,
					el: '#coder-section'
				});

				tableView.render();
			}
		});

		var contractSummaryView = new ContractSummaryView({
			el: '#summary-section'
		})

		contractSummaryView.render();

	}, 1000)
})

