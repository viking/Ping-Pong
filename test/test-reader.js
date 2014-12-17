var CardReader = require('../lib/CardReader');
var reader = new CardReader();
reader.addListener('read', function(evt) {
	console.log(evt);
});
