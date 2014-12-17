var
	chalk = require('chalk'),
	settings = require('../config').global,
	EloComparator = require('./EloComparator');

function GameController(bookshelf, buttonControllers, stats, sockets) {

	this.bookshelf = bookshelf;
	this.online = true;
	this.score = [0, 0];
	this.players = [];
	this.inProgress = false;
	this.buttonControllers = buttonControllers;
	this.gameHistory = [];
	this.inProgress = false;
	this.elo = new EloComparator();
	this.stats = stats;
	this.sockets = sockets;

	var _this = this;
	this.buttonControllers.forEach(function(buttonController) {
		buttonController.on('score', function(which) {
			_this.scored({ data: which });
		});
		buttonController.on('removePoint', function(which) {
			_this.pointRemoved({ data: which });
		});
	});
	
	this.stats.on('biggestWinningStreak', function(streak) {
		_this.sockets.emit('stats.biggestWinningStreak', streak);
	});
	
	this.stats.on('mostConsecutiveLosses', function(streak) {
		_this.sockets.emit('stats.mostConsecutiveLosses', streak);
	});
	
	this.stats.on('largestWhooping', function(whooping) {
		_this.sockets.emit('stats.largestWhooping', whooping);
	});
	
	this.stats.on('totalCompanyGames', function(count) {
		_this.sockets.emit('stats.totalCompanyGames', count);
	});
	
	this.stats.on('mostFrequentPlayer', function(player) {
		_this.sockets.emit('stats.mostFrequentPlayer', player);
	});

	this.elo.on('tip.playerWin', function(player) {
		
		var
			pronoun = 'them',
			genderPronouns = {
				male: 'him',
				female: 'her'
			};
		
		if(player.gender) {
			pronoun = genderPronouns[player.gender];
		}

		_this.sockets.emit('game.message', {
			message: 'A win for <span class="player-' + player.position + '">' + player.name + '</span> takes ' + pronoun + ' to rank ' + player.winningLeaderboardRank
		});
		
	});

}

/**
 * Add a player based on their rfid
 */
GameController.prototype.addPlayerByRfid = function(rfid) {
	this.addPlayer(null, {
		attr: 'rfid',
		value: rfid
	});
};

/**
 * Add a player to the game
 */
GameController.prototype.addPlayer = function(playerID, custom) {
	
	var
		attr = playerID !== null ? 'id' : custom.attr,
		value = playerID !== null ? playerID : custom.value,
		_this = this,
		position;
	
	// Load the model for the added player
	this.bookshelf.Player.where(attr, value).fetch().then(function(player) {
		
		if(!player) {
			console.log(chalk.red('Player ' + value + ' not found'));
			_this.sockets.emit('game.playerNotFound', {
				attr: attr,
				value: value
			});
			return;
		}

		if(_this.players.length === settings.maxPlayers) {
			// A third player joined, prompting the game to be reset
			console.log(chalk.yellow('A third player joined, resetting the game'));
			return _this.end(false);
		}
		
		if(_this.playerInGame(player.id)) {
			console.log(chalk.red(player.get('name') + ' is already in the game!'));
			return;
		} 
		
		console.log(chalk.green('Player added: ' + player.get('name')));
		
		_this.players.push(player);
		position = _this.players.indexOf(player);
		_this.elo.addPlayer(player, position);
		
		if(_this.players.length === settings.minPlayers) {
			_this.ready();
		}
		
		// Notify the client a player has joined
		_this.sockets.emit('player' + position + '.join', {
			player: player.toJSON(),
			position: position
		});
		
		_this.sockets.emit('player.join', {
			player: player.toJSON(),
			position: position
		});
		
		_this.sockets.emit('leaderboard.hide');
	
	});
	
};

/**
 * Reset the game
 */
GameController.prototype.reset = function() {
	this.gameModel = {};
	this.players = [];
	this.score = [0,0];
	this.serve = undefined;
	this.inProgress = false;
	this.gameHistory = [];
	this.elo.reset();
	this.updateStatus();
};

/**
 * End game and reset score
 */
GameController.prototype.end = function(complete) {
	
	complete = typeof complete == 'undefined' ? true : complete;
	
	var
		_this = this,
		winningPlayer = this.leadingPlayer(),
		updatedRanks = [];
	
	if(!complete) {
		this.sockets.emit('game.reset');
		return this.reset();
	}
	
	
	if(winningPlayer - 1 === 0) {
		updatedRanks = [this.elo.players[0].winningLeaderboardRank, this.elo.players[1].losingLeaderboardRank];
	} else {
		updatedRanks = [this.elo.players[0].losingLeaderboardRank, this.elo.players[1].winningLeaderboardRank];
	}
	
	this.sockets.emit('game.message', {
		message: '<span class="player-0">' + this.players[0].get('name') + '</span> is now rank ' + updatedRanks[0] + ', <span class="player-1">' + this.players[1].get('name') + '</span> is rank ' + updatedRanks[1]
	});

	this.sockets.emit('game.end', {
		winner: winningPlayer - 1
	});
	
	setTimeout(function() {
		_this.sockets.emit('game.reset');
	}, settings.winningViewDuration + 200);

	this.gameModel.set({
		winner_id: this.players[winningPlayer - 1].id,
		player0_score: this.score[0],
		player1_score: this.score[1],
		score_delta: Math.abs(this.score[0] - this.score[1])
	});
	
	// Add the game to the DB
	this.gameModel.save()
		.then(function() {
			_this.stats.emit('game.end');
			_this.reset();
		});
		
	this.players.forEach(function(player, i) {
		
		if(i === winningPlayer - 1) {
			player.set('elo', _this.elo.players[i].winningRank);
		} else {
			player.set('elo', _this.elo.players[i].losingRank);
		}

		// Increment play count
		player.set('play_count', player.get('play_count') + 1);

		player.save();

	});
	
	console.log(chalk.green('Game ending, ' + this.players[winningPlayer - 1].get('name') + ' won'));
	
};

/**
 * The game is ready – two players have joined, but not yet started
 */
GameController.prototype.ready = function() {

	var _this = this;
	this.gameModel = new this.bookshelf.Game();

	this.gameModel.set({
		player0_id: this.players[0].get('id'),
		player1_id: this.players[1].get('id')
	});
	
	this.bookshelf.Player.leaderboard().then(function(leaderboard) {
		_this.elo.setLeaderboard(leaderboard);
	});
	
	// Find the last game between the players
	this.bookshelf.Game.lastBetweenPlayers([this.players[0].get('id'), this.players[1].get('id')])
		.fetch()
		.then(function(game) {
			
			if(game) {
				
				var lastGame = [];
				
				lastGame.push({
					player: _this.players[0].toJSON(),
					score: undefined
				});
				
				lastGame.push({
					player: _this.players[1].toJSON(),
					score: undefined
				});
				
				if(game.get('player0_id') === _this.players[0].get('id')) {
					lastGame[0].score = game.get('player0_score');
					lastGame[1].score = game.get('player1_score');
				}
				
				if(game.get('player0_id') === _this.players[1].get('id')) {
					lastGame[0].score = game.get('player1_score');
					lastGame[1].score = game.get('player0_score');
				}
				
				_this.sockets.emit('stats.lastGameBetweenPlayers', {
					lastGame: lastGame
				});
				
			} else {
			
				_this.sockets.emit('stats.firstGameBetweenPlayers', {
					lastGame: undefined
				});
			
				_this.sockets.emit('game.message', {
					message: 'Players first match'
				});
			
			}
			
		});

	// Find the players head to head score
	this.bookshelf.Player.headToHead(this.players[0].get('id'), this.players[1].get('id')).then(function(scores) {
		_this.sockets.emit('stats.headToHead', {
			headToHead: scores
		});
	});

};

/**
 * Start the game
 */
GameController.prototype.start = function(startingServe) {
	
	if(!this.minPlayersAdded()) {
		console.log(chalk.red('Can\'t start the game until ' + settings.minPlayers + ' players have joined'));
		return false;
	}
	
	this.gameModel.start();
	this.checkServerSwitch(startingServe);
	this.inProgress = true;

};

/**
 * Register a new point scored
 */
GameController.prototype.scored = function(event) {

	var player = event.data;
	var playerID = player - 1;
	var _this = this;

	if(!this.inProgress) {
		// Game not started, try to start...
		if(!this.start(playerID)) {
			// Could not start, wait...
			return;
		}
	}

	this.score[playerID] ++;

	this.gameHistory.unshift({
		action: 'scorePoint',
		player: playerID,
		score: this.score.slice()
	});

	this.sockets.emit('game.score', {
		player: playerID,
		score: this.score[playerID],
		gameScore: this.score
	});
	
	if(this.nextPointWins() && this.leadingPlayer() - 1 == playerID) {
		this.sockets.emit('game.gamePoint', {
			player: playerID
		});
	} else {
		this.sockets.emit('game.notGamePoint', {
			player: _this.leadingPlayer() - 1,
		});
	}

	// Has anybody won?
	if(this.checkWon()) {
		return;
	}

	// Is it time to switch serves?
	this.checkServerSwitch();

	// Is the next point a winning one?
	this.checkGamePoint();
	
	this.updateStatus();
};

/**
 * Remove point from a player
 */
GameController.prototype.pointRemoved = function(event) {
	
	if(!this.inProgress) return;
	
	var playerID = event.data - 1;
	
	if(this.score[playerID] > 0) {
		
		this.score[playerID] --;
		
		this.gameHistory.unshift({
			action: 'cancelPoint',
			player: playerID,
			score: this.score.slice()
		});
		
		this.sockets.emit('game.cancelPoint', {
			player: playerID,
			score: this.score[playerID]
		});
		
		this.sockets.emit('game.notGamePoint', {
			player: playerID
		});
		
		if(this.checkWon()) {
			return;
		}
		
		this.checkServerSwitch();
		this.checkGamePoint();
		this.updateStatus();
		
	}

};

/**
 * Has a player reached 21 with 2 points clear?
 */
GameController.prototype.checkWon = function() {

	var
		playerReachedMaxScore = this.score[0] >= settings.maxScore || this.score[1] >= settings.maxScore,
		playerReachedScoreClearance = Math.abs(this.score[0] - this.score[1]) >= settings.mustWinBy;

	if(playerReachedMaxScore && playerReachedScoreClearance) {
		this.end();
		return true;
	}
	
	return false;
	
};

/**
 * Is it time to switch servers?
 */
GameController.prototype.checkServerSwitch = function(forceServe) {

	var
		_this = this,
		totalScore = this.score[0] + this.score[1],
		pointJustCancelled = this.gameHistory.length > 0 && this.gameHistory[0].action == 'cancelPoint',
		switchServer = totalScore % settings.serverSwitchLimit === 0 || this.serverSwitchThresholdMet() || typeof forceServe !== 'undefined',
		switchPreviousServer = (totalScore + 1) % settings.serverSwitchLimit === 0 && pointJustCancelled;
	
	if(switchServer || switchPreviousServer) {
		
		if(typeof forceServe !== 'undefined') {
			this.serve = forceServe;
		} else if(this.score[0] > 0 || this.score[1] > 0) {
			this.serve = (this.serve == 1) ? 0 : 1;
		}

		this.gameHistory.unshift({
			action: 'switchServers',
			server: this.serve,
			score: this.score.slice()
		});

		this.sockets.emit('game.switchServer', {
			player: this.serve
		});
		
	}
};

/**
 * Have both of the players reached the server switch threshold?
 * (the point at which service changes on each score)
 */
GameController.prototype.serverSwitchThresholdMet = function() {
	return this.score.every(function(score) {
		return score >= settings.serverSwitchThreshold;
	});
};

/**
 * Returns the ID of the leading player
 */
GameController.prototype.leadingPlayer = function() {
	var greatestScore = Math.max.apply(Math, this.score);
	return this.score.indexOf(greatestScore) + 1;
};

/**
 * Is the specified player currently playing?
 */
GameController.prototype.playerInGame = function(playerID) {
	return this.players.some(function(player) {
		return player.id == playerID;
	});
};

/**
 * Have the minimum quantity of players been added?
 */
GameController.prototype.minPlayersAdded = function() {
	return this.players.length >= settings.minPlayers;
};

/**
 * Could the game end within one point?
 */
GameController.prototype.nextPointWins = function() {

	var
		nextScorePlayer1 = this.score[0] + 1,
		nextScorePlayer2 = this.score[1] + 1,
		leadingPlayer = (nextScorePlayer1 > nextScorePlayer2) ? 1 : 2,
		futureScoreDifference = (nextScorePlayer1 > nextScorePlayer2) ? nextScorePlayer1 - nextScorePlayer2 : nextScorePlayer2 - nextScorePlayer1;

	return (nextScorePlayer1 >= settings.maxScore || nextScorePlayer2 >= settings.maxScore) && (futureScoreDifference + 1 >= settings.mustWinBy);

};

/**
 * Is the next point a winning point?
 */
GameController.prototype.checkGamePoint = function() {

	if(!this.nextPointWins()) return;
	
	this.sockets.emit('game.nextPointWins', {
		player: this.leadingPlayer() - 1
	});
	
	if(this.leadingPlayer() == 1) {
		this.sockets.emit("nextPointWins", { "player": 1 });
		console.log('Next point for player 1 wins');
	}
	
	if(this.leadingPlayer() == 2) {
		this.sockets.emit("nextPointWins", { "player": 2 });
		console.log('Next point for player 2 wins');
	}
	
};

/**
 * Send current game status to all clients
 */
GameController.prototype.updateStatus = function() {
	var stats = {
		online: this.online
	};
	this.sockets.emit("stats", stats);
};

/**
 * Client Joined
 */
GameController.prototype.clientJoined = function() {
	this.stats.emit('client.join');
};

module.exports = GameController;
