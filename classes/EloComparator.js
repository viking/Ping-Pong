'use strict';

var
	util = require('util'),
	events = require('events'),
	Elo = require('arpad'),
	kFactor = require('../kFactor.js');

function EloComparator() {
	this.elo = new Elo(kFactor, 0),
	this.players = [];
};

util.inherits(EloComparator, events.EventEmitter);

EloComparator.prototype.addPlayer = function(player, position) {
	
	if(this.players.length === 2) {
		this.players = [];
	}
	
	this.players.push({
		id: player.get('id'),
		name: player.get('name'),
		gender: player.get('gender'),
		rank: player.get('elo'),
		position: position,
		expectation: undefined,
		winningRank: undefined,
		losingRank: undefined,
		winningLeaderboardRank: undefined,
		losingLeaderboardRank: undefined
	});
	
	this.update();
	
};

/**
 * Emits a tip
 */
EloComparator.prototype.emitTip = function() {

	if(this.lowestRankedPlayer) {
		this.emit('tip.playerWin', this.lowestRankedPlayer);
	}

};

/**
 * Set the existing leaderboard
 */
EloComparator.prototype.setLeaderboard = function(leaderboard) {
	this.leaderboard = leaderboard;
	this.update();
};



/**
 * If both players and the leaderboard is set, update the player info
 */
EloComparator.prototype.update = function() {
	if(this.players.length === 2 && typeof this.leaderboard !== 'undefined') {
		this.recalculate();
		this.lowestRankedPlayer = this.getLowestRankedPlayer();
		this.emitTip();
	}
};



/**
 * Reset
 */
EloComparator.prototype.reset = function() {
	this.players = [];
	this.tip = undefined;
};



/**
 * Gets the updated rank of a player if they beat or lose to a given opponent
 */
EloComparator.prototype.getLeaderboardRank = function(method, subject, comparison) {
	
	var
		rank,
		methods = ['winningRank', 'losingRank'];
	
	if(method === 'losing') {
		methods.reverse();
	}

	this.leaderboard.forEach(function(player) {
		if(player.get('id') === subject.id) {
			player.set('elo', subject[ methods[0] ]);
		}
		if(player.get('id') === comparison.id) {
			player.set('elo', comparison[ methods[1] ]);
		}
	});

	this.leaderboard.comparator = function(player) {
		return -player.get('elo');
	};
	
	this.leaderboard.sort();
	
	rank = this.leaderboard.map(function(player) {
		return player.get('id');
	}).indexOf(subject.id) + 1;
	
	return rank;
	
}

/**
 * Recalculate player rankings
 */
EloComparator.prototype.recalculate = function() {

	this.players[0].winningRank = this.elo.newRatingIfWon(this.players[0].rank, this.players[1].rank);
	this.players[0].losingRank = this.elo.newRatingIfLost(this.players[0].rank, this.players[1].rank);
	
	this.players[1].winningRank = this.elo.newRatingIfWon(this.players[1].rank, this.players[0].rank);
	this.players[1].losingRank = this.elo.newRatingIfLost(this.players[1].rank, this.players[0].rank);
	
	this.players[0].winningLeaderboardRank = this.getLeaderboardRank('winning', this.players[0], this.players[1]);
	this.players[0].losingLeaderboardRank = this.getLeaderboardRank('losing', this.players[0], this.players[1]);

	this.players[1].winningLeaderboardRank = this.getLeaderboardRank('winning', this.players[1], this.players[0]);
	this.players[1].losingLeaderboardRank = this.getLeaderboardRank('losing', this.players[1], this.players[0]);

}

/**
 * Find lowest ranked player
 */
EloComparator.prototype.getLowestRankedPlayer = function() {
	
	var lowestRankingPlayer;
	
	this.players.forEach(function(player) {
		if(!lowestRankingPlayer || lowestRankingPlayer.rank > player.rank) {
			lowestRankingPlayer = player;
		}
	});
	
	return lowestRankingPlayer;
	
}

module.exports = EloComparator;
