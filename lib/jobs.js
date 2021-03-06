/*
	File: jobs.js
	Author: Alan Balasundaram
	Description: Jobs
	Avalara (c) 2014
*/
'use strict';
var Job = require('./job');

var manager = require('./manager');
var store = require('./store');
var jobs = {};

var jobManager;

jobs.status = function(jobId,callback) {
	return store.getJob(jobId,callback);
};

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

jobs.startServer = function(port) {
	require('./web').startServer(jobManager.getRedisClient(),port);
};

module.exports = {
	init: function(redisUrl) {
		jobManager = manager(redisUrl);
		store.init(jobManager.getRedisClient());
		return jobs;
	}
};