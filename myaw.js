var express = require('express');
var request = require('request');
var cheerio = require('cheerio');
var mongoose = require('mongoose');
var app = express();

var port = 8080;

var Issue = require('./models/issue')
// ======================
// Router for API
var router = express.Router();

url = 'http://androidweekly.net';

router.get('/latest', function(req, res) {

	request(url, function (error, response, html) {
	    if (!error && response.statusCode == 200) {
	        var $  = cheerio.load(html);

	        var latest_issue, date;
	        var sections = [];
	        var links = [];
	        var content = [];
			var articles = [];

	        var metajson = {
				latest: '',
				date: '',
				sections: ''
			};

			//Get latest issue number and date
	        $('.issue-header').filter(function(){
	        	var data = $(this)

	        	latest_issue = data.children().first().text().trim();
	        	date = data.children().last().text().trim();

				//Get the first element of the regex match result
				//The output will be the lastes issue number
	        	metajson.latest = latest_issue.match(/\#([0-9]*)/)[1];
	        	metajson.date = date;
	        })

			//Extract topic content
			$('.sections tr p').each(function(i, element){
				var data = $(this);
				content[i] = data.text().trim();
			})

			//Get all articles from current issue
	        $('.article-headline').each(function(i, element){
	        	var data = $(this);
				var title = data.text().trim();
	        	var link = $(this).attr('href');

				var article = {
					title: title,
					link: link,
					content: content[i]
				}
				articles[i] = article;
	        })
			metajson.articles = articles;

			//Get all sections
			$('.sections tr h2').each(function(i, element){
				var data = $(this);

				var section = {
					section: data.text().trim()
				}
				sections[i] = section;
			})
			metajson.sections = sections;
			metajson.sections.articles = articles;

	        res.json(metajson);
	    }
	});

})

router.get('/archive', function(req, res) {
	Issue.find(function(err, issues) {
		if (err)
			res.send(err)

		res.json(issues);
	})
})

function parseIssue(issue) {
	var regex = /Issue \#([0-9]*)|.+/;
	return issue.match(regex);
}

//====================
// Database
mongoose.connect('mongodb://127.0.0.1:27017/myawdb', function(err, db) {
    if (!err) {
        console.log("Database connected");
		//Everytime when we connect to the db
		//we want to drop the databse to refill
		//the data again. It's not much.
		mongoose.connection.db.dropDatabase();
	}
})

//====================
//Poll data from androidweekly.net
function pollArchive() {
	request(url + '/archive', function(error, response, html) {
		if (!error) {
			var $ = cheerio.load(html);
			var issues = [];

			$('.archive-list h3').each(function(i, element) {
				var data = $(this);
				var issue_number;

				data = data.text().trim();
				issue_number = parseIssue(data);

				var archive_response = {
					issue: issue_number[1],
					link: url + '/issues/issue-' + issue_number[1]
				}
				issues[i] = archive_response;
			})

			for (i = 0; i < issues.length; i++) {
				var issue = new Issue();
				issue.issue = issues[i].issue;
				issue.link = issues[i].link;
				issue.save();
			}

			//Check if there will be a new issue
			//once a week.
			//We have 86400 seconds in a day
			setInterval(pollArchive, 7*86400*1000);
		}
	})
}

app.use('/api', router);
app.listen(port);

console.log("Starting server at: " + port);
pollArchive();

exports = module.exports = app;
