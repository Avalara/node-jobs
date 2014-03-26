/*
	File: messages.js
	Author: Alan Balasundaram
	Description: messaging component
	Avalara (c) 2014
*/
'use strict';
var redis = require('redis');

var WORKER_CHANNEL = function(jobId){
  return 'ntask:channels/worker.' + jobId;
};

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
}

var workers = {};
var messageClient;

function onMessage(channel,message) {
    message = JSON.parse(message);

    var job = workers[channel];

    if(!job) {
      return console.log('no job listening to: ' + channel);
    }

    switch(message.type) {
      case 'update':
        job.update(message.data);
        break;
      case 'complete':
        job.complete(message.data);
        break;
      default:
        console.error('Unknown type: ' + message.type);
    }
}

function sendMessage(job,message) {
    return messageClient.publish(WORKER_CHANNEL(job.id),JSON.stringify(message));
}

function subscribe(job) {
	messageClient.subscribe(WORKER_CHANNEL(job.id));
	workers[WORKER_CHANNEL(job.id)] = job;
}

function unsubscribe(job) {
	messageClient.unsubscribe(WORKER_CHANNEL(job.id));
  delete workers[WORKER_CHANNEL(job.id)];
}


module.exports = function(host,port) {
	var obj = {};
	messageClient = redis.createClient(port,host);
	messageClient.on('message',onMessage);

	obj.setMessageHandlers = setMessageHandlers;

  //for the Job Requestor, subscribe to messages from Job Worker
	obj.subscribe = subscribe;
	obj.unsubscribe = unsubscribe;

	return obj;
};