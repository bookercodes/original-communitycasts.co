'use strict';

var config = require('config');
var youtube = require('../youtube')(config.youtubeToken);
var vimeo = require('../vimeo')(config.vimeoToken);
var commaSplit = require('comma-split');

var screencastsController = function(connection) {
  var appendWherePhase = function(query, period) {
    switch (period) {
      case 'month':
        query += ' WHERE s.submissionDate > DATE_SUB(NOW(), INTERVAL 1 MONTH)';
        break;
      case 'week':
        query += ' WHERE s.submissionDate > DATE_SUB(NOW(), INTERVAL 1 WEEK)';
        break;
      default:
        query += ' WHERE s.submissionDate > DATE_SUB(NOW(), INTERVAL 1 DAY)';
        break;
    }
    return query;
  };
  var sendScreencasts = function(req, res) {
    var query = 'SELECT COUNT(*) AS count FROM screencasts s';
    query = appendWherePhase(query, req.params.period);
    connection.queryAsync(query).spread(function(result) {
      var total = result.shift().count;
      var page = req.query.page || 1;
      var perPage = config.screencastsPerPage;
      var start = (page - 1) * perPage;
      var finish = page * perPage;
      var totalPageCount = Math.ceil(total / perPage);
      var hasNextPage = page < totalPageCount;
      /*jshint multistr:true*/
      var query =
        'SELECT \
           s.*, \
           GROUP_CONCAT(screencastTags.tagName) AS tags \
         FROM screencasts s \
         JOIN screencastTags \
           ON s.screencastId = screencastTags.screencastId';
      query = appendWherePhase(query, req.params.period);
      query +=
        ' GROUP BY s.screencastId \
         ORDER BY referralCount DESC, submissionDate \
         LIMIT ' + start + ', ' + finish;
      connection.queryAsync(query).spread(function(screencasts) {
        screencasts = screencasts.map(function(screencast) {
          screencast.href =
            'http://localhost:3000/screencasts/' + screencast.screencastId;
          screencast.tags = screencast.tags.split(',');
          delete screencast.link;
          return screencast;
        });
        res.json({
          screencasts: screencasts,
          hasMore: hasNextPage
        });
      });
    });
  };
  var fetchVideoDetails = function(link, done) {
    if (youtube.isYouTubeUrl(link)) {
      youtube.fetchVideoDetails(link, done);
    } else if (vimeo.isVimeoUrl(link)) {
      vimeo.fetchVideoDetails(link, done);
    } else {
      throw new Error('link must be either a YouTube or Vimeo video link');
    }
  };
  var send400 = function(res, message) {
    res.status(400).send({
      message: message
    });
  };
  var redirectToScreencast = function(req, res) {
    var screencastId = req.params.screencastId;
    var remoteAddress = req.connection.remoteAddress;
    /* jshint multistr:true */
    var query =
      'SELECT link \
       FROM screencasts \
       WHERE screencastId = ?';
    connection.queryAsync(query, screencastId).spread(function(screencasts) {
      var screencast = screencasts.shift();
      if (!screencast) {
        return res.status(404).send();
      }
      res.redirect(screencast.link);
      var query =
        'SELECT screencastId \
         FROM referrals \
         WHERE screencastId = ? AND refereeRemoteAddress = ?';
      connection.queryAsync(query, [screencastId, remoteAddress]).spread(
        function(referrals) {
          if (referrals.length > 0) {
            return;
          }
          connection.beginTransactionAsync().then(function() {
            /*jshint multistr:true*/
            var query =
              'UPDATE screencasts \
                 SET referralCount = referralCount + 1 \
               WHERE screencastId = ?';
            return connection.queryAsync(query, screencastId);
          }).then(function() {
            return connection.queryAsync(
              'INSERT INTO referrals SET ?', {
                screencastId: screencastId,
                refereeRemoteAddress: remoteAddress
              });
          }).then(function() {
            return connection.commit();
          }).error(function() {
            return connection.rollback();
          });
        });
    });
  };
  return {
    sendScreencasts: sendScreencasts,
    redirectToScreencast: redirectToScreencast
  };
};

module.exports = screencastsController;
