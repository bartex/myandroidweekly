var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var IssueSchema = new Schema({
    issue: String,
    link: String
})

module.exports = mongoose.model('Issue', IssueSchema);
