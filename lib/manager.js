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
    messages = require('./messages'),messageHandler;


var JOBS_KEY     = 'ntask:jobs';

var PENDING_JOBS_KEY = function(name) {
  return 'ntask:jobs:' + name + '.pending';
};

var RUNNING_JOBS_KEY = function(name) {
  return 'ntask:jobs:' + name + '.running';
};

var JOB_HASH_KEY = function(id) {
  return 'ntask:jobs:job.' + id;
};


//Job status:
//PENDIONG
//RUNNING
//COMPLETE
//ERROR

// Start a transaction block, and add
// The job to the Jobs set
// And to the PendingJobs Queue
function writeJobToRedis(job,client) {

  var m = client.multi();

  m.lpush(PENDING_JOBS_KEY(job.name),job.id);
  m.sadd(JOBS_KEY,job.id);

  job.status = 'PENDING';
  job.input = JSON.stringify(job.input);
  m.hmset(JOB_HASH_KEY(job.id),job.toHash());

  m.exec(function(err) {
    if(err) return console.error(err);
  });
}

//This generates a function that is closed over the id and the redis client
// which will set the status to ERROR or COMPLETE
// set the job endtime
// set the output and results data
// then save it
function createJobCompleteCallback(name,jobId,client) {

    var jobKey = JOB_HASH_KEY(jobId);

    var callback = function(err,output,result) {

      var m = client.multi();

      if(err) {
        console.error(err);
        m.hset(jobKey,'status','ERROR');
      } else {
        m.hset(jobKey,'status','COMPLETE');
      }

      m.hset(jobKey,'endtime',new Date());

      if(output) {
        m.hset(jobKey,'output',JSON.stringify(output));
      }

      if(result) {
          m.hset(jobKey,'results',JSON.stringify(result));
      }

      m.srem(RUNNING_JOBS_KEY(name),jobId);

      m.exec(function(err) {
        if(err) { console.error(err); }
      });
    };

    return callback;
}


function getJobFromRedis(name,client,callback) {
  client.lpop(PENDING_JOBS_KEY(name),function(err,jobId) {
    if(err) { return console.error(err); }

    if(jobId === null) {
      return callback();
    }

    //we have a job, so change it to RUNNING, set the starttime
    //and add it to the running list, then return it for processing

    var jobKey = JOB_HASH_KEY(jobId);

    client.hgetall(jobKey, function(err,jobHash) {
        if(err) { return console.error(err); }

        var workerJob = new Job();
        workerJob.fromHash(jobHash);

        var m = client.multi();
        workerJob.status = 'RUNNING';
        workerJob.start = new Date().toISOString();

        m.sadd(RUNNING_JOBS_KEY(name),jobId);
        m.hset(jobKey,workerJob.status);
        m.hset(jobKey,workerJob.start);

        m.exec(function(err) {
          if(err) { return console.error(err); }
          workerJob.input = JSON.parse(workerJob.input);

          messageHandler.setMessageHandlers(workerJob);

          var onJobComplete = createJobCompleteCallback(name,jobId,client);
          return callback(workerJob,onJobComplete);
        });
    });
  });
}



var manager = function(redisUrl) {
  var uri = url.parse(redisUrl);

  var client = redis.createClient( uri.port, uri.hostname);
  messageHandler = messages(uri.port,uri.hostname);

  var obj = {};

  obj.addJob = function(name,job) {
    job.id = uuid.v4();
    job.name = name;
    writeJobToRedis(job,client);
    messageHandler.subscribe(job);
    return job.id;
  };

  obj.getJob = function(name,callback) {
    return getJobFromRedis(name,client,callback);
  };

  return obj;
};

module.exports = manager;