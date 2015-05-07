var express    = require('express');
var path       = require('path');
var bodyParser = require('body-parser');
var mysql      = require('mysql');
var validator  = require('express-validator');
var moment     = require('moment');

var channels     = require('./routes/channels');
var technologies = require('./routes/technologies');
var submit       = require('./routes/submit');
var home         = require('./routes/home');
var videos       = require('./routes/videos');
var api          = require('./routes/api');
var terms        = require('./routes/terms');
var about        = require('./routes/about');
var admin        = require('./routes/admin');

var app = express();

connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'password',
  database: 'screencastHub'
});
connection.connect();

// settings
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// middlware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(validator());
app.use(function(req, res, next) {
  var query = 
  'SELECT \
     tags.tagName, \
     COUNT(*) AS count \
   FROM tags \
   JOIN screencastTags \
     ON screencastTags.tagName = tags.tagName \
   WHERE tags.tagName IN ( \
     SELECT tagName \
     FROM screencastTags \
     JOIN screencasts \
       ON screencasts.screencastId = screencastTags.screencastId \
     WHERE screencasts.approved = 1) \
   GROUP BY tags.tagName \
   ORDER BY count DESC, tags.tagName DESC \
   LIMIT 9';
  connection.query(query, function(err, tags) {
    if (tags.length === 9) {
      tags.push({ 
        tagName:'Other' 
      });
    }
    res.locals.tags = tags;
    next();
  });
});

// routes
app.use('/', home);
app.use('/channels', channels);
app.use('/technologies', technologies);
app.use('/submit', submit);
app.use('/videos', videos);
app.use('/api', api);
app.use('/terms', terms);
app.use('/about', about);
app.use('/admin', admin);

app.use(function(req, res, next) {
  res.status(404).render('404');
});

app.listen(53111);
