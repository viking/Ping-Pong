var
	environment = process.env.NODE_ENV = process.env.NODE_ENV || 'development';
	config = require('./config'),
	Server = require('./lib/Server');

// Setup bookshelf
var
	knex = require('knex')(config[environment].database),
	bookshelf = require('bookshelf')(knex);

// Setup models
require('./models/Player')(bookshelf);
require('./models/Game')(bookshelf);

// Run server
var server = new Server(config, environment, bookshelf);
server.start();

process.on('SIGINT', function() {
	server.stop();
	process.exit();
});
