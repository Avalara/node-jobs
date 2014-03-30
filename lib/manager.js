/*
  File: manager.js
  Author: Alan Balasundaram
  Description: marshalls data between jobs and redis
  Avalara (c) 2014
*/

'use strict';

var redis = require('redis'),
    uuid  = require('uuid'),
    url   = require('url'),
    Job = require('./job'),
    rediskeys = require('./rediskeys'),
    messages = require('./messages'),messageHandler;

var client;

// Start a transaction block, and add
// The job to the Jobs set
// And to the PendingJobs Queue
function writeJobToRedis(job) {

  var m = client.multi();

  m.lpush(rediskeys.PENDING_JOBS_KEY(job.name),job.id);
  m.sadd(rediskeys.JOBS_KEY,job.id);

  job.status = 'PENDING';
  job.input = JSON.stringify(job.input);
  m.hmset(rediskeys.JOB_HASH_KEY(job.id),job.toHash());

  m.exec(function(err) {
    if(err) return console.error(err);
  });
}

// This generates a function that is closed over the id
// which will set the status to ERROR or COMPLETE
// set the job endtime
// set the output and results data
// then save it
function createJobCompleteCallback(name,jobId,cleanUpWorker) {

    var jobKey = rediskeys.JOB_HASH_KEY(jobId);
    return function(err,output,result) {
      var m = client.multi();

        if(err) {
          console.error(err);
          m.hset(jobKey,'status','ERROR');
        } else {
          m.hset(jobKey,'status','COMPLETE');
        }

        m.hset(jobKey,'end',new Date());

        if(output) {
          m.hset(jobKey,'output',JSON.stringify(output));
        }

        if(result) {
            m.hset(jobKey,'results',JSON.stringify(result));
        }

        m.srem(rediskeys.RUNNING_JOBS_KEY(name),jobId);

        m.exec(function(err) {
          if(err) { console.error(err); }
        });
      cleanUpWorker();
    };
}

function getJobFromRedis(name,client,workerId,callback,cleanUpWorker) {
  client.lpop(rediskeys.PENDING_JOBS_KEY(name),function(err,jobId) {
    if(err) { return console.error(err); }

    // no job, so just clean up, and don't invoke callback
    if(jobId === null) {
      return cleanUpWorker();
    }

    //we have a job, so change it to RUNNING, set the starttime
    //and add it to the running list, then return it for processing

    var jobKey = rediskeys.JOB_HASH_KEY(jobId);

    client.hgetall(jobKey, function(err,jobHash) {
        if(err) { return console.error(err); }

        var workerJob = new Job();
        workerJob.fromHash(jobHash);

        var m = client.multi();
        workerJob.status = 'RUNNING';
        workerJob.start = new Date();

        m.sadd(rediskeys.RUNNING_JOBS_KEY(name),jobId);
        m.hset(jobKey,'status',workerJob.status);
        m.hset(jobKey,'start',workerJob.start);

        m.exec(function(err) {
          if(err) { return console.error(err); }
          workerJob.input = JSON.parse(workerJob.input);

          messageHandler.setMessageHandlers(workerJob);

          var onJobComplete = createJobCompleteCallback(name,jobId,cleanUpWorker);

          return callback(workerJob,onJobComplete);
        });
    });
  });
}

 var workerSlots = [];

function startWorker(name,workerId,callback) {

  if(!callback && typeof workerId === 'function') {
    callback = workerId;
    workerId = undefined;
  }

  workerId = workerId || workerSlots.pop();

  if(!workerId) {
    return;
  }

  getJobFromRedis(name,client,workerId,callback,function() {
    workerSlots.push(workerId);

    //check the pending jobs queue. if there is more work, kick off a new worker
    client.llen(rediskeys.PENDING_JOBS_KEY(name),function(err,len) {
      if(err) { return console.error(err); }
      if(len > 0) {
        setTimeout(function() {
          startWorker(name,callback);
        },100);
      }
    });
  });
}


var manager = function(redisUrl) {
  var uri = url.parse(redisUrl);

  client = redis.createClient( uri.port, uri.hostname);
  messageHandler = messages(uri.port, uri.hostname);

  var obj = {};

  obj.addJob = function(name,job) {
    job.id = uuid.v4();
    job.name = name;
    writeJobToRedis(job);

    //wire up the job to

    messageHandler.subscribe(job);
    messageHandler.publishToJobQueue(name,'queue');
    return job.id;
  };

  obj.startJobWorkers = function(name,count,callback) {

    for(var i = 0; i < count; ++i) {
      startWorker(name,uuid.v4(),callback);
    }

    messageHandler.subscribeToJobQueue(name,function() {
      startWorker(name,callback);
    });
  };

  obj.getRedisClient = function() { return client; };

  return obj;
};

module.exports = manager;