var
	path = require('path'),
	exec = require('child_process').exec;


function SoundPlayer(path) {
	this._path = path;
	this._queue = [];
}

SoundPlayer.prototype.queue = function(name) {
	var filename = path.join(this._path, name + '.mp3');
	this._queue.push(filename);
};

SoundPlayer.prototype.poll = function() {
	if (this._queue.length > 0) {
		var _this = this;
		var filename = this._queue.shift();
		exec('mpg123 ' + filename, function(error, stdin, stderr) {
			_this.poll();	
		});
	} else {
		setTimeout(this.poll.bind(this), 100);
	}
};

module.exports = SoundPlayer;
