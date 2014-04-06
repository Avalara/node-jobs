/*
	File: job.js
	Author: Alan Balasundaram
	Description: Job class
	Avalara (c) 2014
*/
'use strict';
var events = require('events'), util = require('util');


function Job(name) {
	this.name = name;
}

util.inherits(Job,events.EventEmitter);

Job.prototype.update = function(data) {
	this.emit('update',data);
};

Job.prototype.complete = function(data) {
	this.emit('complete',data);
};

Job.prototype.error = function(data) {
	this.emit('error',data);
};

//var status = ['PENDING','RUNNING','ERROR','COMPLETE','STOPPED'];

var keys = ['id','name','status','input','output','start','end','results'];
function copy(src,dest) {
	keys.forEach(function(key) {
		dest[key] = src[key];
	});
}

Job.prototype.toHash = function() {
	var o = {};
	copy(this,o);
	return o;
};

Job.prototype.fromHash = function(hash) {
	return copy(hash,this);
};

module.exports = Job;