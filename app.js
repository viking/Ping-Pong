var
	environment = process.env.NODE_ENV || 'development',
	config = require('./config');

var
	express = require('express'),
	cors = require('cors')
	jade = require('jade'),
	path = require('path'),
	serveStatic = require('serve-static');

module.exports = function(bookshelf) {
	var app = express();

	app.use(cors());
	app.set('bookshelf', bookshelf);
	app.set('settings', config.global);
	app.engine('jade', jade.__express);
	app.use(serveStatic('./ui/public'));

	app.get('/', function(req, res) {
		delete require.cache[path.resolve('./versions/js.json')];
		delete require.cache[path.resolve('./versions/css.json')];
		
		res.render('home.jade', {
			title: 'Ping Pong',
			metaDesc: 'Ping Pong',
			clientUrl: config[environment].clientUrl,
			clientPort: config[environment].clientPort,
			wsPort: config[environment].wsPort,
			winningViewDuration: config.global.winningViewDuration,
			JSVersions: require('./versions/js'),
			CSSVersions: require('./versions/css')
		});
	});

	app.get('/leaderboard', function(req, res) {
		bookshelf.Player.leaderboard().
			then(function(players) {
				res.json(players.toJSON());
			});
	});

	return app;
};
