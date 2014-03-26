/*
  File: manager.js
  Author: Alan Balasundaram
  Description: marshalls data between jobs and redis
  Avalara (c) 2014
*/

'use strict';

var redis = require('redis'),
    uuid  = require('uuid'),
    url   = require('url');


var JOBS_KEY     = 'ntask:jobs';
var PENDING_JOBS_KEY = 'ntask:jobs.pending';
var RUNNING_JOBS_KEY = 'ntask:jobs.running';

var CHANNEL = function(name){
  return 'ntask:channels/' + name;
};

var JOB_HASH_KEY = function(id) {
  return 'ntask:job:hash.' + id;
};


//Job status:
//Pending
//Running
//Complete

// Start a transaction block, and add
// The job to the Jobs set
// And to the PendingJobs Queue
function writeJobToRedis(job,client) {

  var m = client.multi();

  m.lpush(PENDING_JOBS_KEY,job.id);
  m.sadd(JOBS_KEY,job.id);

  job.status = 'PENDING';
  job.input = JSON.stringify(job.input);
  m.hmset(JOB_HASH_KEY(job.id),job);

  m.exec(function(err) {
    if(err) return console.error(err);
  });
}

//This generates a function that is closed over the id and the redis client
// which will set the status to ERROR or COMPLETE
// set the job endtime
// set the output and results data
// then save it
function createJobCompleteCallback(jobId,client) {

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

      m.srem(RUNNING_JOBS_KEY,jobId);

      m.exec(function(err) {
        if(err) { console.error(err); }
      });
    };

    return callback;
}


function getJobFromRedis(client,callback) {
  client.lpop(PENDING_JOBS_KEY,function(err,jobId) {
    if(err) { return console.error(err); }

    console.log(jobId);

    if(jobId === null) {
      return callback();
    }

    //we have a job, so change it to RUNNING, set the starttime
    //and add it to the running list, then return it for processing

    var jobKey = JOB_HASH_KEY(jobId);

    client.hgetall(jobKey, function(err,job) {
        if(err) { return console.error(err); }

        var m = client.multi();
        job.status = 'RUNNING';
        job.starttime = new Date().toISOString();

        m.sadd(RUNNING_JOBS_KEY,jobId);
        m.hmset(jobKey,job);

        m.exec(function(err) {
          if(err) { return console.error(err); }
          job.input = JSON.parse(job.input);
          return callback(job,createJobCompleteCallback(jobId,client));

        });
    });
  });
}


var manager = function(redisUrl) {
  var uri = url.parse(redisUrl);

  var client = redis.createClient( uri.port, uri.hostname);
  var obj = {};

  obj.addJob = function(name,job) {
    var id = uuid.v4();
    job.id = id;
    job.name = name;

    writeJobToRedis(job,client);

    //todo: wire up channels()

    return id;
  };

  obj.getJob = function(callback) {
    return getJobFromRedis(client,callback);
  };

  return obj;
};

module.exports = manager;