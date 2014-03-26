'use strict';
var jobs = require('./jobs');

jobs.create('Alan',{
	value: '123',
	value2: '234'
});

jobs.process(function(job,callback) {
	console.log(job);
	callback(null,'someoutput','this is my result');
});