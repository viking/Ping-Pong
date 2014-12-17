var
	events = require('events'),
	util = require('util'),
	config = require('../config.js');

function ButtonController(button, which) {
	this.scoreRegisteredWithinThreshold = false;
	this.button = button;
	this.which = which;
	var self = this;
	button.addListener('pushed', function() {
		self.counter();	
	});
};

util.inherits(ButtonController, events.EventEmitter);

ButtonController.prototype.counter = function() {
    
    if(this.scoreRegisteredWithinThreshold) {
        
        // Button pressed within threshold - undo
        
        this.emit('removePoint', this.which);
        this.scoreRegisteredWithinThreshold = false;
        
        return clearTimeout(this.timer);
        
    }
    
    // Button pressed after threshold elapsed - score
    
    this.emit('score', this.which);
    this.scoreRegisteredWithinThreshold = true;
    
    var _this = this;
    this.timer = setTimeout(function() {
        _this.scoreRegisteredWithinThreshold = false;
    }, config.global.buttonUndoThreshold);
    
};

module.exports = ButtonController;
