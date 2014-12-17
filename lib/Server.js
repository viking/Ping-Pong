var
	chalk = require('chalk'),
	SocketServer = require('socket.io'),
	GameController = require('../classes/GameController'),
	ButtonController = require('../classes/ButtonController'),
	CardReader = require('./CardReader'),
	Button = require('./Button'),
	app = require('../app'),
	stats = require('./stats')

function Server(config, environment, bookshelf) {
	var _this = this;

	this._clientPort = config[environment].clientPort;
	this._wsPort = config[environment].wsPort;

	// Setup buttons
	this.button1 = new Button(config.global.player1ButtonPin),
	this.button2 = new Button(config.global.player2ButtonPin);
	this.buttonController1 = new ButtonController(this.button1, 1),
	this.buttonController2 = new ButtonController(this.button2, 2);

	this.stats = stats(bookshelf);

	// Setup web server
	this.app = app(bookshelf);

	// Setup socket io
	this.io = new SocketServer();

	// Setup game controller
	this.gameController = new GameController(bookshelf, [this.buttonController1, this.buttonController2], this.stats, this.io.sockets);

	this.io.sockets.on('connection', function(client) {
		_this.gameController.reset();
		_this.gameController.clientJoined();
	});

	// Setup hardware
	this.cardReader = new CardReader();

	this.cardReader.on('read', function(data) {
		console.log('New read', data);
		_this.gameController.addPlayerByRfid(data.rfid);
	});
};

Server.prototype.start = function() {
	this.button1.poll();
	this.button2.poll();
	this.cardReader.poll();

	// Start web server
	this._appServer = this.app.listen(this._clientPort);
	console.log(chalk.green('Web Server: Listening on port ' + this._clientPort));

	// Setup socketio
	this._wsServer = this.io.listen(this._wsPort);
	console.log(chalk.green('Websocket Server: Listening on port ' + this._wsPort));
};

Server.prototype.stop = function() {
	this.button1.stop();
	this.button2.stop();
	this.cardReader.stop();
	this._appServer.close();
	this._wsServer.close();
};

module.exports = Server;
