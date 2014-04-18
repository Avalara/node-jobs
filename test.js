'use strict';

var args = process.argv.slice(2);

if(args[0] === '--create') {

	var jobs = require('./index').init('redis://localhost:6379/0');
	var log = function(data) {console.log(data); };

	var createJobs = function() {
		for(var i = 0; i < 20; ++i) {
			var job = jobs.create('job-type1',{
				value: '123',
				value2: '234'
			});

			job.on('update',log);
			job.on('complete',log);
			job.on('error',function(data) {
				console.error(data);
			})
		}
	};

	createJobs();

	setInterval(createJobs,5000);

} else if (args[0] === '--web') {

	if(args[1]) {
		var jobs = require('./index').init(args[1]);
	} else {
		var jobs = require('./index').init('redis://localhost:6379/0');
	}

	jobs.startServer(8888);

} else {
	jobs.process('job-type1',2,function(job,callback) {
		if(!job) {
			return console.log('no job');
		}

		console.log('Processing job: ' + job.id);
		job.update(job.id + ': this is a job update!');
		job.complete('yay done');
		job.error('some error happened');
		callback(null,'someoutput','this is my result');
	});
}