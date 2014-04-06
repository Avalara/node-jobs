/*
	File: web.js
	Author: Alan Balasundaram
	Description: provides a simple http server
	Avalara (c) 2014
*/
'use strict';
var http = require('http'),
		urlrouter = require('urlrouter'),
		fs = require('fs'),
		store = require('./store');

function sendFile(path,res) {
	var stat = fs.statSync(path);
	res.writeHead(200, {
		'Content-Type': 'text/html',
		'Content-Length': stat.size
	});

	fs.createReadStream(path).pipe(res);
}

function startServer(client,port) {

	store.init(client);

	var router = urlrouter(function (app) {

		app.get('/jobs',function(req,res) {
			store.getJobs(function(data) {
				res.end(JSON.stringify(data));
			});
		});

		app.get('/jobs/:jobid',function(req,res) {
			store.getJob(req.params.jobid,function(data) {
				res.end(JSON.stringify(data));
			});
		});

		app.delete('/jobs/:jobid',function(req,res) {
			res.end();
			store.deleteJob(req.params.jobid);
		});

		app.post('/jobs/:jobid/restart',function(req,res) {
			res.end();
			store.restartJob(req.params.jobid);
		});

		app.post('/jobs/:jobid/clone',function(req,res) {
			res.end();
			store.cloneJob(req.params.jobid);
		});

		app.post('/jobs/:jobid/stop',function(req,res) {
			res.end();
			store.stopJob(req.params.jobid);
		});

		app.get('/queues',function(req,res) {
			store.getQueues(function(data) {
				res.end(JSON.stringify({'queues': data}));
			});
		});

		app.get('/queues/:name',function(req,res) {
			store.getQueueData(req.params.name,function(data) {
				res.end(JSON.stringify({'queue': data}));
			});
		});

		app.post('/queues/:name/purge',function(req,res) {
			res.end();
			return store.purgeQueue(req.params.name);
		});

	  app.get('/', function (req, res) {
	    return sendFile(__dirname + '/index.html',res);
	  });
	});

	console.log(port);

	http.createServer(router).listen(port || 31337);
}

module.exports.startServer = startServer;

