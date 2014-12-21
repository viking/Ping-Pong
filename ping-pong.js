var
	environment = process.env.NODE_ENV = process.env.NODE_ENV || 'production',
	config = require('./config'),
	Server = require('./lib/Server'),
	Button = require('./lib/Button'),
	exec = require('child_process').exec;

// Setup bookshelf
var
	knex = require('knex')(config[environment].database),
	bookshelf = require('bookshelf')(knex);

// Setup models
require('./models/Player')(bookshelf);
require('./models/Game')(bookshelf);

// Setup stop button
var button = new Button(config.global.stopButtonPin);
button.addListener('pushed', function() {
	stop();
});
button.poll();

// Run server
var server = new Server(config, environment, bookshelf);
server.start();

function stop() {
	server.stop();
	button.stop();

	console.log('Exiting...');
	exec('sudo halt', function() {
	});
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
