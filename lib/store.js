/*
	File: store.js
	Author: Alan Balasundaram
	Description: provides API's to interface to REDIS
	Avalara (c) 2014
*/
'use strict';

var	async = require('async'),
	uuid = require('uuid'),
	rediskeys = require('./rediskeys');

//var client = redis.createClient(6379,'127.0.0.1');

var client;
module.exports.init = function(redisclient) {
	client = redisclient;
};

function getJobs(callback) {

	var data = [];

	//client.lrange(rediskeys.JOBS_KEY,start,start + count,function(err, jobkeys) {
	client.smembers(rediskeys.JOBS_KEY,function(err,jobkeys) {
		if(err) { return callback(console.error(err)); }

		async.each(jobkeys,function(key,cb) {
			client.hgetall(rediskeys.JOB_HASH_KEY(key),function(err,jobHash) {
				if(err) { cb(); return console.error(err); }
				data.push(jobHash);
				cb();
			});
		},function() {
			callback(data);
		});
	});
}
module.exports.getJobs = getJobs;

function getJob(jobId,callback) {
	client.hgetall(rediskeys.JOB_HASH_KEY(jobId),function(err,jobHash) {
		return err ? callback(console.error(err)) : callback(jobHash);
	});
}
module.exports.getJob = getJob;

function cloneJob(jobId) {
	client.hgetall(rediskeys.JOB_HASH_KEY(jobId),function(err,jobHash) {
		if(err) { return console.error(err); }

		jobHash.id = uuid.v4();

		client.hmset(rediskeys.JOB_HASH_KEY(jobHash.id),jobHash,function(err) {
			if(err) { return console.error(err); }
			client.sadd(rediskeys.JOBS_KEY,jobHash.id,function(err) {
				if(err){ return console.error(err); }
			});
		});
	});
}
module.exports.cloneJob = cloneJob;

function deleteJob(jobId) {
	client.del(rediskeys.JOB_HASH_KEY(jobId),function(err) {
		if(err) { return console.error(err); }
		client.srem(rediskeys.JOBS_KEY,jobId,function(err){
			if(err) { return console.error(err); }
		});
	});
}
module.exports.deleteJob = deleteJob;


function restartJob(jobId) {
	var reset = {
		'status':'PENDING',
		'start': undefined,
		'end':undefined,
		'result': undefined,
		'output': undefined
	};

	var key = rediskeys.JOB_HASH_KEY(jobId);
	client.hmset(key,reset,function(err) {
		if(err) { console.error(err); }
		client.hget(key,'name',function(err,taskname) {
			client.lpush(rediskeys.PENDING_JOBS_KEY(taskname),jobId,function(err) {
				if(err) { console.error(err); }
			});
		});
	});
}
module.exports.restartJob = restartJob;


function getQueues(callback) {
	client.keys(rediskeys.QUEUE_PREFIX + '*',function(err,queues) {
		if(err) { return callback(console.log(err)); }
		callback(queues);
	});
}
module.exports.getQueues = getQueues;


function getQueueData(queue,callback) {
	if(queue.indexOf('.pending') !== -1) {
		client.lrange(queue,0,-1,function(err,data) {
			if(err) { return callback(console.error(err)); }
			return callback(data);
		});
	} else if(queue.indexOf('.running') !== -1) {
		client.smembers(queue,function(err,data) {
			if(err) { return callback(console.error(err)); }
			return callback(data);
		});
	}
}
module.exports.getQueueData = getQueueData;

// client = require('redis').createClient(6379,'localhost');

// cloneJob('95f529c7-c66d-4d1c-90d6-2d8018f62264');
// deleteJob('ea487a47-c7a3-4133-8e25-4baf049b2959');
// restartJob('95f529c7-c66d-4d1c-90d6-2d8018f62264');

// getJobs(function(data){
// 	data.forEach(function(d) {
// 		console.log(d);
// 	});
// });
// getQueues(function(ques) {
// 	ques.forEach(function(q) {
// 		getQueueData(q,function(data) {
// 			getJob(data[0],function(data) {
// 				console.log(data);
// 			});
// 		});
// 	});
// });