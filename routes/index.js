var uuid = require('uuid');

exports.index = function(req, res) {
    res.render('index', {
        title: 'ドッグファイト！ソケットさん',
        session: req.session
    });
};

exports.id = function(req, res) {
    res.setHeader('Content-Type', 'text/javascript');
    if (req.session.login) {
        res.send('var id = "' + req.session.user.name + '";');
    } else {
        res.send('var id = "' + uuid() + '";');
    }
};
