# node-jobs

A robust, nodejs based, Redis backed job queue.

## Getting Started

TBD 

## Using node-job

The `node-jobs` is designed to be simple to use.

```
  var jobs = require('node-jobs').init('redis://localhost:6379/0');
```

### Creating a Job

Creating a job, you specify the name of the job, and the data (input) you want to pass along. You will be returned a `Job` which you can use to listen for events such as `complete` and `update` 

```
  jobs.create(name,jobdata);

  var clawjob = jobs.create('clawjob',{
     input1: 'someValue',
     input2: 'someValue2',
  });
  
  clawjob.on('update',function(data) { 
    // Do something...
  });
  
  clawjob.on('complete',function(results) {
    // Do something with results...
  });

  clawjob.on('error',function(error) {
    // Do something with error...
  });

```

### Processing a Job

To process a job, you simply provide a callback for a given job name, as well as an optional concurrency value. The concurrency number, is the number of jobs that will be dequeued and worked.

The callback is passed the job, and a callback which must be invoked when you are finished processing the job. If there was an error processing the job, pass an error object back as the first parameter to the callback.

```
  jobs.process(jobname,concurrency,callback);
  
  jobs.process('clawjob',4,function(job,callback) {
    //do some work
    var str = job.input.input1 + job.input.input2;
    console.log(str);
    
    job.update('Hey How You Doin?');
    job.complete('We are all Done!');
    
    callback(null,'job output','job result');
  
  });
  
```

### Web Console

`node-jobs` ships with a light-weight web console to monitor jobs. The console also provides restart, and clone functionality in addition to inspecting jobs.

To start the web console:

```
  jobs.startServer(port);
```

If port isn't specified, the web server will start on port 31337.

## TODO

1. Documetation
1. Web Dashboard Styling
1. Job Monitoring
1. Stats
1. Worker Tracking
1. Graceful Shutdown of Redis client

## Rationale

Why yet another queue system? Unfortunately the options were limited for nodejs. Kue has a great interface, but lacks the ability to easily capture data for  a job run (for example, `stdout` and `stderr` for a shell command. While Kue has nifty features, like priorities, and delayed jobs, those things have increased the complexity. If you need delayed jobs, use `cron`.

Bull a lightweight replacement, similarly inspired by Kue, doesn't offer passings results from the Worker to the Requestor.

Celery, a python based task manager, doesn't have a lot of flexibility for non-python jobs.

Resque, another great Task Queue, is very ruby based.

The goal is to make node-jobs as robust and mission critical as Resque and Celery, for use in production systems that require reliability and scalability, as well as additional reporting, monitoring, and job management capabilities.

## License

The MIT License (MIT)

Copyright (c) 2014 Avalara

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
