'use strict';
var jobs = require('./index');

var args = process.argv.slice(2);

if(args[0] === '--create') {

	var log = function(data) {console.log(data); };

	for(var i = 0; i < 20; ++i) {
		var job = jobs.create('job-type1',{
			value: '123',
			value2: '234'
		});

		job.on('update',log);
		job.on('complete',log);
	}

} else {
	jobs.process('job-type1',2,function(job,callback) {
		if(!job) {
			return console.log('no job');
		}

		job.update(job.id + ': this is a job update!');


		job.complete('yay done');


		callback(null,'someoutput','this is my result');
	});
}