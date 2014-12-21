module.exports = {
    development: {
        clientUrl: 'http://localhost',
        clientPort: 12345,
        wsPort: 23456,
        database: {
            client: 'sqlite3',
            connection: {
		filename: __dirname + '/development.db'
            },
            migrations: {
                directory: __dirname + '/migrations',
                tableName: 'migrations'
            }
        }
    },
    production: {
        clientUrl: 'http://localhost',
        clientPort: 12345,
        wsPort: 23456,
        database: {
            client: 'sqlite3',
            connection: {
		filename: __dirname + '/production.db'
            },
            migrations: {
                directory: __dirname + '/migrations',
                tableName: 'migrations'
            }
        }
    },
    global: {
	player1ButtonPin: 32,
	player2ButtonPin: 36,
	stopButtonPin: 38,
        serverSwitchLimit: 5, // How many points before service switches
        serverSwitchThreshold: 20, // When both players have reached this threshold, the server switches every time
        maxScore: 21,
        mustWinBy: 2,
        minPlayers: 2,
        maxPlayers: 2,
        buttonUndoThreshold: 1500,
        winningViewDuration: 12000 // The duration to show the winning view for before returning to the leaderboard
    }
};
