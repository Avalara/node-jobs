/*
	File: jobs.js
	Author: Alan Balasundaram
	Description: Jobs
	Avalara (c) 2014
*/
'use strict';
var Job = require('./job');

var manager = require('./manager');
var jobs = {};

var jobManager = manager('redis://127.0.0.1:6379/0');

jobs.create = function(name,data) {
	var job = new Job(name);
	job.input = data;
	job.id = jobManager.addJob(name,job);
	return job;
};

jobs.process = function(name,count,callback) {
	if(!name) { throw 'No job name specified'; }

	if(!callback && typeof count === 'function') {
		callback = count;
		count = 1;
	}

	jobManager.startJobWorkers(name,count,callback);
};

module.exports = jobs;