'use strict';
var jobs = require('./jobs');

var args = process.argv.slice(2);


if(args[0] === '--create') {

	var job = jobs.create('job-type1',{
		value: '123',
		value2: '234'
	});

	job.on('update',function(data) {
		console.log(data);
	});

	job = jobs.create('job-type1',{
		value: '123',
		value2: '234'
	});

	job.on('update',function(data) {
		console.log(data);
	});

} else {
	jobs.process('job-type1',function(job,callback) {
		if(!job) {
			return console.log('no job');
		}

		job.update(job.id + ': this is a job update!');
		callback(null,'someoutput','this is my result');
	});
}