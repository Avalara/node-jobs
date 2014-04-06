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

var client;
module.exports.init = function(redisclient) {
	client = redisclient;
};

function getJobs(callback) {

	var data = [];

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
		jobHash.status = 'STOPPED';

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
	getJob(jobId,function(jobHash) {
		if(!jobHash) { return; }
		client.del(rediskeys.JOB_HASH_KEY(jobId),function(err) {
			if(err) { return console.error(err); }
			client.srem(rediskeys.JOBS_KEY,jobId,function(err){
				if(err) { return console.error(err); }
				if(jobHash.status === 'PENDING') {
					client.lrem(rediskeys.PENDING_JOBS_KEY(jobHash.name),0,jobId,function() {});
				} else if(jobHash.status === 'RUNNING') {
					client.srem(rediskeys.RUNNING_JOBS_KEY(jobHash.name),jobId,function() {});
				}
			});
		});
	});
}

module.exports.deleteJob = deleteJob;

function stopJob(jobId) {
	getJob(jobId,function(job) {
		if(!job) { return;}
		// can't stop running jobs (yet)
		if(job.status === 'PENDING') {
			job.status = 'STOPPED';
			client.hmset(rediskeys.JOB_HASH_KEY(jobId),job,function() {});
			removeJobFromPendingJobsQueue(rediskeys.PENDING_JOBS_KEY(job.name),jobId);
		}
	});
}
module.exports.stopJob = stopJob;

function restartJob(jobId) {
	var reset = {
		'status':'PENDING',
		'start': undefined,
		'end':undefined,
		'result': undefined,
		'output': undefined
	};

	var key = rediskeys.JOB_HASH_KEY(jobId);

	client.hget(key,'status',function(err,status) {
		if(status === 'PENDING') { return; }
		client.hmset(key,reset,function(err) {
			if(err) { console.error(err); }
			client.hget(key,'name',function(err,taskname) {
				client.lpush(rediskeys.PENDING_JOBS_KEY(taskname),jobId,function(err) {
					if(err) { console.error(err); }
				});
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

function isPendingQueue(queue) {
	return (queue.indexOf('.pending') !== -1);
}

function getQueueData(queue,callback) {
	if(isPendingQueue(queue)) {
		client.lrange(queue,0,-1,function(err,data) {
			if(err) { return callback(console.error(err)); }
			return callback(data);
		});
	} else {
		client.smembers(queue,function(err,data) {
			if(err) { return callback(console.error(err)); }
			return callback(data);
		});
	}
}
module.exports.getQueueData = getQueueData;

function removeJobFromQueue(queue,jobId) {
	if(isPendingQueue(queue)) {
		return removeJobFromPendingJobsQueue(queue,jobId);
	} else {
		return removeJobFromRunningJobsQueue(queue,jobId);
	}
}

function removeJobFromRunningJobsQueue(queue,jobId) {
	client.srem(queue,jobId);
}

function removeJobFromPendingJobsQueue(queue,jobId) {
	client.lrem(queue,0,jobId);
}

function purgeQueue(queue) {

	var checkAndRemove = function(hashId) {
		client.exists(rediskeys.JOB_HASH_KEY(hashId),function(err,exists) {
			if(err) { return console.error(err); }
			if(!exists) {
				removeJobFromQueue(queue,hashId);
			}
		});
	};

	getQueueData(queue,function(data) {
		for(var i = 0; i < data.length; ++i) {
			checkAndRemove(data[i]);
		}
	});
}
module.exports.purgeQueue = purgeQueue;

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