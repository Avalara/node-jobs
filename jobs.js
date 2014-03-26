/*
	File: jobs.js
	Author: Alan Balasundaram
	Description: Jobs
	Avalara (c) 2014
*/
'use strict';

var manager = require('./manager');
var jobs = {};

var jobManager = manager('redis://localhost:6379/0');

jobs.create = function(name,data) {
	var job = {
		input: data
	};

	job.id = jobManager.addJob(name,job);

	return job;
};

jobs.process = function(callback) {
	jobManager.getJob(callback);
};

module.exports = jobs;