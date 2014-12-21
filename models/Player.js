var
    Promise = require('bluebird'),
    through = require('through2');

module.exports = function(bookshelf) {
	bookshelf.Player = bookshelf.Model.extend({
	    tableName: 'players',
	    
	    games: function() {
		return bookshelf.Game
		    .query('where', 'player0_id', '=', this.get('id'))
		    .query('orWhere', 'player1_id', '=', this.get('id'));
	    },
	    
	    gamesWith: function(id) {
		var _this = this;
		return this.games()
		    .query('where', 'player0_id', '=', id)
		    .query('orWhere', 'player1_id', '=', id);
	    },
	}, {
	    headToHead: function(id0, id1) {
		
		var
		    resolver = Promise.pending(),
		    scores = [0, 0];
		
		bookshelf.knex
		    .select('*')
		    .from('games')
		    .whereRaw('(player0_id = ? AND player1_id = ?) OR (player1_id = ? AND player0_id = ?)', [id0, id1, id0, id1])
		    .stream(function(stream) {
			stream.pipe(through.obj(function(game, enc, cb) {
			    if(game.player0_id === id0) {
				if(game.winner_id === id0) {
				    scores[0] ++;
				} else {
				    scores[1] ++;
				}
			    } else {
				if(game.winner_id === id1) {
				    scores[1] ++;
				} else {
				    scores[0] ++;
				}
			    }
			    cb();
			}));
		    })
		    .then(function() {
			resolver.resolve(scores);
		    });
		
		return resolver.promise;
	    },
		leaderboard: function(limit) {
			if (typeof(limit) == 'undefined') {
				limit = 10;
			}	
			return this.query('where', 'play_count', '>', '0').
				query('where', 'guest', '!=', 1).
				query('orderBy', 'elo', 'desc').
				query('limit', limit).
				fetchAll();
		}
	});
};
