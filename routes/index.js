var uuid = require('uuid');

exports.index = function(req, res) {
    res.render('index', { title: 'ドッグファイト！ソケットさん' });
};

exports.id = function(req, res) {
    res.setHeader('Content-Type', 'text/javascript');
    res.send('var id = "' + uuid() + '";');
};
