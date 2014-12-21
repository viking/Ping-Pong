var Button = require('../lib/Button');

var button1 = new Button(32);
button1.addListener('pushed', function(evt) {
	console.log("Button 1 pushed!");
});

var button2 = new Button(36);
button2.addListener('pushed', function(evt) {
	console.log("Button 2 pushed!");
});

button1.poll();
button2.poll();
process.on('SIGINT', function() {
	button1.stop();
	button2.stop();
});
