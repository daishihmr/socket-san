var fs = require('fs');

var json = fs.readFileSync('config.json', { encoding: 'utf8'});

exports.config = JSON.parse(json);
