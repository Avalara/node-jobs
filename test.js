'use strict';
var jobs = require('./index').init('redis://localhost:6379/0');

var args = process.argv.slice(2);

if(args[0] === '--create') {

	var log = function(data) {console.log(data); };

	var createJobs = function() {
		for(var i = 0; i < 20; ++i) {
			var job = jobs.create('job-type1',{
				value: '123',
				value2: '234'
			});

			job.on('update',log);
			job.on('complete',log);
		}
	};

	createJobs();

	setInterval(createJobs,5000);

} else if (args[0] === '--web') {
	jobs.startServer(8888);
} else {
	jobs.process('job-type1',2,function(job,callback) {
		if(!job) {
			return console.log('no job');
		}

		console.log('Processing job: ' + job.id);
		job.update(job.id + ': this is a job update!');
		job.complete('yay done');
		callback(null,'someoutput','this is my result');
	});
}