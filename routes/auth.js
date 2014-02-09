var config = require('../util/config').config;

var twitterAPI = require('node-twitter-api');
var twitter = new twitterAPI({
    consumerKey: config.twitter.consumerKey,
    consumerSecret: config.twitter.consumerSecret,
    callback: 'http://' + config.core.domain + '/callback'
});

exports.login = function(req, res) {
    twitter.getRequestToken(function(error, requestToken, requestTokenSecret, results) {
        if (error) {
            res.send(500);
            return;
        }

        req.session.auth = {};
        req.session.auth.requestToken = requestToken;
        req.session.auth.requestTokenSecret = requestTokenSecret;
        var url = 'https://twitter.com/oauth/authenticate?oauth_token=' + req.session.auth.requestToken;
        res.redirect(url);
    });
};

exports.loginByPopup = function(req, res, next) {
    next();
};

exports.callback = function(req, res) {
    var oauthVerifier = req.param('oauth_verifier');
    if (!oauthVerifier) {
        res.redirect("/");
        req.session.auth = null;
        req.session.login = false;
        req.session.user = null;
        return;
    }

    var auth = req.session.auth;

    twitter.getAccessToken(auth.requestToken, auth.requestTokenSecret, oauthVerifier,
        function(error, accessToken, accessTokenSecret, results) {
            if (error) {
                res.send(500);
                return;
            }

            auth.accessToken = accessToken;
            auth.accessTokenSecret = accessTokenSecret;

            getUserInfo();
        }
    );

    var getUserInfo = function() {
        twitter.account(
            'verify_credentials',
            {},
            auth.accessToken,
            auth.accessTokenSecret,
            function(error, account) {
                if (error) {
                    res.send(500);
                    return;
                } else {
                    onGetUserInfo(account);
                }
            }
        );
    };

    var onGetUserInfo = function(account) {
        req.session.login = true;
        req.session.user = {
            name: account.screen_name,
            icon: account.profile_image_url,
            twitterId: account.id
        };

        onComplete();
    };

    var onComplete = function() {
        res.redirect('/');
    };
};

exports.logout = function(req, res) {
    req.session.login = false;
    req.session.auth = null;
    req.session.user = null;
    res.redirect('/');
};
