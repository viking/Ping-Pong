
'use strict';




exports.up = function(knex, Promise) {
  
	return knex.schema.
	
		table('players', function (table) {
			table.boolean('guest');
		});
  
};




exports.down = function(knex, Promise) {
  return knex.schema.
		table('players', function(table) {
			table.dropColumn('guest');
		});
};
