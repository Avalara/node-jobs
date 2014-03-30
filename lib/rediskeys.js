/*
	File: rediskeys.js
	Author: Alan Balasundaram
	Description: Centralizes Keys for use at external modules
	Avalara (c) 2014
*/
'use strict';
module.exports.JOBS_KEY     = 'ntask:jobs';

var QUEUE_PREFIX = 'ntask:queue:';

module.exports.QUEUE_PREFIX = QUEUE_PREFIX;

module.exports.PENDING_JOBS_KEY = function(name) {
  return QUEUE_PREFIX + name + '.pending';
};

module.exports.RUNNING_JOBS_KEY = function(name) {
  return QUEUE_PREFIX + name + '.running';
};

module.exports.JOB_HASH_KEY = function(id) {
  return 'ntask:jobs:job.' + id;
};

module.exports.WORKER_CHANNEL = function(jobId){
  return 'ntask:channels/worker/' + jobId;
};

module.exports.JOB_QUEUE_CHANNEL = function(name){
  return 'ntask:channels/job.queue/' + name;
};