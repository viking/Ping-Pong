var
	environment = process.env.NODE_ENV = process.env.NODE_ENV || 'development';
	config = require('./config');

var
	chalk = require('chalk'),
	io = require('socket.io'),
	GameController = require('./classes/GameController'),
	ButtonController = require('./classes/ButtonController'),
	CardReader = require('./lib/CardReader'),
	Button = require('./lib/Button');

// Setup bookshelf
var
	knex = require('knex')(config[environment].database),
	bookshelf = require('bookshelf')(knex);

// Setup models
require('./models/Player')(bookshelf);
require('./models/Game')(bookshelf);

function Server(config, environment, bookshelf) {

	var _this = this;

	this.button1 = new Button(config.global.player1ButtonPin),
	this.button2 = new Button(config.global.player2ButtonPin);
	this.buttonController1 = new ButtonController(this.button1, 1),
	this.buttonController2 = new ButtonController(this.button2, 2);

	this.stats = require('./lib/stats')(bookshelf);

	// Setup web server
	this.app = require('./app')(bookshelf);
	this.app.listen(config[environment].clientPort);
	console.log(chalk.green('Web Server: Listening on port ' + config[environment].clientPort));

	// Setup socketio
	this.io = io.listen(config[environment].wsPort);
	console.log(chalk.green('Websocket Server: Listening on port ' + config[environment].wsPort));

	this.io.configure(function() {
	    _this.io.set('log level', 2);
	});

	// Setup game controller

	this.gameController = new GameController(bookshelf, [this.buttonController1, this.buttonController2], this.stats, this.io.sockets);

	this.io.sockets.on('connection', function(client) {
	    _this.gameController.reset();
	    _this.gameController.clientJoined();
	    //client.on('fakeScored', game.feelerPressed); // Fake score event for easier testing
	});

	// Setup hardware
	this.cardReader = new CardReader();

	this.cardReader.on('read', function(data) {
	    console.log('New read', data);
	    _this.gameController.addPlayerByRfid(data.rfid);
	});

};

var server = new Server(config, environment, bookshelf);
module.exports = server;
