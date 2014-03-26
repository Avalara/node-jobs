/*
	File: jobs.js
	Author: Alan Balasundaram
	Description: Jobs
	Avalara (c) 2014
*/
'use strict';
var Job = require('./job');

// Job.prototype.success = function(callback) {
// 	callback(this.result);
// };

var manager = require('./manager');
var jobs = {};

var jobManager = manager('redis://localhost:6379/0');

jobs.create = function(name,data) {
	var job = new Job(name);
	job.input = data;
	job.id = jobManager.addJob(name,job);
	return job;
};


jobs.process = function(name,callback) {
	if(!name) { throw 'No job name specified'; }
	jobManager.getJob(name,callback);
};

module.exports = jobs;