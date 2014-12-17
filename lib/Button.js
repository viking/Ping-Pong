var util = require('util'),
    events = require('events'),
    EventEmitter = events.EventEmitter,
    chalk = require('chalk'),
    gpio = require("pi-gpio");

function Button(pin) {
	this.pin = pin;
}

util.inherits(Button, EventEmitter);

Button.prototype.poll = function() {
	var self = this;
	gpio.open(self.pin, "input", function(err) {
		if (err) {
			console.log(chalk.red('Button (' + self.pin + ') open error:'), err);
		} else {
			console.log(chalk.green('Button (' + self.pin + '): Listening...'));
			self.interval = setInterval(function() {
				self.read();
			}, 50);
		}
	});
};

Button.prototype.read = function() {
	var self = this;
	gpio.read(self.pin, function(err, value) {
		if (err) {
			console.log(chalk.red('Button (' + self.pin + ') read error:'), err);
			self.stop();	
		} else if (value != self.status) {
			self.status = value;
			if (value == 1) {
				self.emit('pushed');
			}
		}
	});		
};

Button.prototype.stop = function() {
	clearInterval(this.interval);
	delete this.interval;
	gpio.close(this.pin);
};

module.exports = Button;
