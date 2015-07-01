var LandingView = require('./views/landing-view.js');

var landingView = new LandingView({
	el: '#landing'
})

landingView.setActiveModelIndex(1);
