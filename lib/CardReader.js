var util = require('util'),
    events = require('events'),
    EventEmitter = events.EventEmitter,
    chalk = require('chalk'),
    pn532 = require('pn532'),
    SerialPort = require('serialport').SerialPort; 

function CardReader() {
	this.serialPort = new SerialPort('/dev/ttyAMA0', { baudrate: 115200 });
	this.rfid = new pn532.PN532(this.serialPort);
}

util.inherits(CardReader, EventEmitter);

CardReader.prototype.poll = function() {
	var self = this;
	self.rfid.on('ready', function() {
	    console.log(chalk.green('Card Reader: Listening...'));
	    self.rfid.on('card', function(data) {
		self.emit('read', { rfid: data.uid });
	    });
	});
};

CardReader.prototype.stop = function() {
	this.rfid.removeAllListeners('card');
};

module.exports = CardReader;
