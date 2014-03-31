/*
	File: messages.js
	Author: Alan Balasundaram
	Description: messaging component
	Avalara (c) 2014
*/
'use strict';
var redis = require('redis'),
    rediskeys = require('./rediskeys');

function setMessageHandlers(job) {
  job.on('update',function(data) {
    return sendMessage(job, {
      'type': 'update',
      'data':data
    });
  });

  job.on('complete',function(data) {
    return sendMessage(job, {
      'type': 'complete',
      'data':data
    });
  });

  job.on('error',function(data) {
    return sendMessage(job, {
      'type': 'error',
      'data': data
    });
  });
}

var workers = {};
var workerClient,jobQueueClient;

var jobs = {};

function onMessage(channel,message) {

    var channels = channel.split('/');

    switch(channels[1]) {
      case 'worker':
        return onWorkerMessage(channels[2],message);
      case 'job.queue':
        return onJobQueueMessage(channels[2]);
      default:
        console.error('unknown channel: ' + channels[1]);
        break;
    }
}

function onJobQueueMessage(jobName) {
  var worker = workers[jobName];
  if(!worker) {return console.log('no worker for: ' + jobName); }
  worker();
}

function onWorkerMessage(jobId, message) {
  message = JSON.parse(message);

   var job = jobs[jobId];
    if(!job) { return; }

    switch(message.type) {
      case 'update':
        job.update(message.data);
        break;
      case 'complete':
        job.complete(message.data);
        break;
      case 'error':
        job.error(message.data);
        break;
      default:
        console.error('Unknown type: ' + message.type);
    }
}

function sendMessage(job,message) {
    return workerClient.publish(rediskeys.WORKER_CHANNEL(job.id),JSON.stringify(message));
}

function subscribe(job) {
	workerClient.subscribe(rediskeys.WORKER_CHANNEL(job.id));
	jobs[job.id] = job;
}

function unsubscribe(job) {
	workerClient.unsubscribe(rediskeys.WORKER_CHANNEL(job.id));
  delete jobs[job.id];
}


module.exports = function(port,host) {
	var obj = {};
	workerClient = redis.createClient(port,host);
  jobQueueClient = redis.createClient(port,host);

	workerClient.on('message',onMessage);
  jobQueueClient.on('message',onMessage);

	obj.setMessageHandlers = setMessageHandlers;

  //for the Job Requestor, subscribe to messages from Job Worker
	obj.subscribe = subscribe;
	obj.unsubscribe = unsubscribe;

  obj.subscribeToJobQueue = function(name,callback) {
    jobQueueClient.subscribe(rediskeys.JOB_QUEUE_CHANNEL(name));
    workers[name] = callback;
  };

  obj.unsubscribeToJobQueue = function(name) {
    jobQueueClient.unsubscribe(rediskeys.JOB_QUEUE_CHANNEL(name));
    delete workers[name];
  };

  obj.publishToJobQueue = function(name,message) {
    jobQueueClient.publish(rediskeys.JOB_QUEUE_CHANNEL(name),message);
  };

	return obj;
};