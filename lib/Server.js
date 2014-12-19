var
	chalk = require('chalk'),
	SocketServer = require('socket.io'),
	GameController = require('../classes/GameController'),
	ButtonController = require('../classes/ButtonController'),
	CardReader = require('./CardReader'),
	Button = require('./Button'),
	SoundPlayer = require('./SoundPlayer'),
	app = require('../app'),
	stats = require('./stats')

function Server(config, environment, bookshelf) {
	var _this = this;

	this._clientPort = config[environment].clientPort;
	this._wsPort = config[environment].wsPort;

	// Sound player
	this.soundPlayer = new SoundPlayer(__dirname + '/../sounds');

	// Setup socket io
	this.io = new SocketServer();

	// Setup buttons
	this.button1 = new Button(config.global.player1ButtonPin),
	this.button2 = new Button(config.global.player2ButtonPin);
	this.buttonController1 = new ButtonController(this.button1, 1),
	this.buttonController2 = new ButtonController(this.button2, 2);

	// setup stats
	this.stats = stats(bookshelf);

	this.stats.on('biggestWinningStreak', function(streak) {
		_this.io.sockets.emit('stats.biggestWinningStreak', streak);
	});
	
	this.stats.on('mostConsecutiveLosses', function(streak) {
		_this.io.sockets.emit('stats.mostConsecutiveLosses', streak);
	});
	
	this.stats.on('largestWhooping', function(whooping) {
		_this.io.sockets.emit('stats.largestWhooping', whooping);
	});
	
	this.stats.on('totalCompanyGames', function(count) {
		_this.io.sockets.emit('stats.totalCompanyGames', count);
	});
	
	this.stats.on('mostFrequentPlayer', function(player) {
		_this.io.sockets.emit('stats.mostFrequentPlayer', player);
	});


	// Setup web server
	this.app = app(bookshelf);

	// Setup game controller
	this.gameController = new GameController(bookshelf, [this.buttonController1, this.buttonController2]);

	this.gameController.on('game.message', function(data) {
		_this.io.sockets.emit('game.message', data);
	});

	this.gameController.on('game.playerNotFound', function(data) {
		_this.io.sockets.emit('game.playerNotFound', data);
	});

	this.gameController.on('player0.join', function(data) {
		_this.io.sockets.emit('player0.join', data);
	});

	this.gameController.on('player1.join', function(data) {
		_this.io.sockets.emit('player1.join', data);
	});

	this.gameController.on('player.join', function(data) {
		_this.io.sockets.emit('player.join', data);
	});

	this.gameController.on('leaderboard.hide', function() {
		_this.io.sockets.emit('leaderboard.hide');
	});

	this.gameController.on('game.reset', function() {
		_this.io.sockets.emit('game.reset');
	});

	this.gameController.on('game.end', function(data) {
		_this.io.sockets.emit('game.end', data);
        	_this.soundPlayer.queue('game_end');
		_this.soundPlayer.queue(data.winnerName.toLowerCase() + '-won-the-game');
	});

	this.gameController.on('game.saved', function() {
		_this.stats.emit('game.end');
	});

	this.gameController.on('stats.lastGameBetweenPlayers', function(data) {
		_this.io.sockets.emit('stats.lastGameBetweenPlayers', data);
	});

	this.gameController.on('stats.headToHead', function(data) {
		_this.io.sockets.emit('stats.headToHead', data);
	});

	this.gameController.on('game.score', function(data) {
		_this.io.sockets.emit('game.score', data);

		if (data.server == 1) {
			_this.soundPlayer.queue(data.gameScore[1].toString());
			_this.soundPlayer.queue(data.gameScore[0].toString());
		} else {
			_this.soundPlayer.queue(data.gameScore[0].toString());
			_this.soundPlayer.queue(data.gameScore[1].toString());
		}
        });

	this.gameController.on('game.gamePoint', function(data) {
		_this.io.sockets.emit('game.gamePoint', data);
		_this.soundPlayer.queue('game-point-' + data.playerName.toLowerCase());
	});

	this.gameController.on('game.notGamePoint', function(data) {
		_this.io.sockets.emit('game.notGamePoint', data);
	});

	this.gameController.on('game.cancelPoint', function(data) {
		_this.io.sockets.emit('game.cancelPoint', data);
	});

	this.gameController.on('game.switchServer', function(data) {
		_this.io.sockets.emit('game.switchServer', data);
		_this.soundPlayer.queue(data.playerName.toLowerCase() + '-to-serve');
	});

	this.gameController.on('game.nextPointWins', function(data) {
		_this.io.sockets.emit('game.nextPointWins', data);
	});

	this.io.sockets.on('connection', function(client) {
		_this.gameController.reset();
		_this.stats.emit('client.join');
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
	this.soundPlayer.poll();

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
