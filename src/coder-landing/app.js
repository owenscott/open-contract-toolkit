// this whole "coder landing page" section isnt' interactive and shoudl really just be server rendered
// i kept it client-rendered only b/c it allowed me to be very lazy in building it (crappy code re-use through 
// copy and pasting)
// the only way it would ever be interactive is if we used websockets to push new contract assignment events to the
// user, which seems like a tonne of overkill when they could just refresh

var Coders = require('./../shared/collections/coders.js');
var TableView = require('./views/coder-table-view.js');

var $ = require('jquery');
var _ = require('underscore');
var fs = require('fs');


$('document').ready(function() {
	setTimeout(function() {

		var coders = new Coders();

		coders.fetch({
			success: function() {

				console.log('weeee');
				console.log(coders);
				var tableView = new TableView({
					collection: coders,
					el: '#coder-section'

				});

				tableView.render();
			}
		});


	}, 1000)
})

