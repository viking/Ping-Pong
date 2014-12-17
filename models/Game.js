var datetimeFormat = 'YYYY-MM-DD HH:mm:ss';
var moment = require('moment');

module.exports = function(bookshelf) {
	bookshelf.Game = bookshelf.Model.extend({
	    tableName: 'games',

	    initialize: function() {
		var end;
		
		this.on('saving', function() {
		    end = moment();
		    this.set('end', end.format(datetimeFormat));
		    this.set('duration', end.diff(this.start));
		});
	    },
	    
	    start: function() {
		this.start = moment();
		this.set('start', this.start.format(datetimeFormat));
	    },
	    
	    player0: function() {
		return this.belongsTo(bookshelf.Player, 'player0_id');
	    },
	    
	    player1: function() {
		return this.belongsTo(bookshelf.Player, 'player1_id');
	    }

	}, {
	    
	   /**
	    * Get the last game between two given players
	    */
	   lastBetweenPlayers: function(playerIds) {

	       playerIds = playerIds;

	       return this.query(function(qb) {
		   qb
		       .where(function() {
			   this.whereIn('player0_id', playerIds).andWhere('player1_id', playerIds[1]);
		       })
		       .orWhere(function() {
			   this.whereIn('player1_id', playerIds).andWhere('player0_id', playerIds[1]);
		       });
	       })
	       .query('orderBy', 'end', 'desc');

	   }
	    
	});
};
