var server = require('../server');

setTimeout(function() {
	server.cardReader.emit('read', { rfid: 'abcdef' });
	setTimeout(function() {
		server.cardReader.emit('read', { rfid: '123456' });
		setTimeout(function() {
				server.button1.emit('pushed');
		}, 2000);
	}, 2000);
}, 20000);
