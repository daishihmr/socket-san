var unitJs = require("./unit");
var bulletJs = require("./bullet");
var aiunitJs = require("./aiunit");

var SC_SIZE = 20000;

var explosions = [];
var death = [];

var genNpc = function() {
    if (aiunitJs.aiUnitNumber() > 5) return;
    var pcn = unitJs.pcUnitNumber();
    if ((0 < pcn && frame % 1000 === 0) || (pcn === 1 && frame % 500 === 0)) {
        new aiunitJs.AIUnit().initialize();
    }
};

var frame = 0;
var updateWorld = function() {
    var copiedUnits = [].concat(unitJs.units);
    copiedUnits.forEach(function(unit) {
        unit.update(frame);
    });
    var copiedBullets = [].concat(bulletJs.bullets);
    copiedBullets.forEach(function(bullet) {
        bullet.update(frame);
    });

    var allData = {
        units: unitJs.units.map(unitJs.Unit.publish),
        bullets: bulletJs.bullets.map(bulletJs.Bullet.publish),
        explosions: explosions,
        death: death
    };
    unitJs.units.forEach(function(unit) {
        unit.socket.emit('tick', allData);
    });

    explosions.splice(0);
    death.splice(0);

    genNpc();

    setTimeout(updateWorld, 1000/60);

    frame += 1;
};
updateWorld();

exports.SC_SIZE = SC_SIZE;
exports.explosions = explosions;
exports.death = death;
exports.world = function(socket) {
    socket.on('join', function(unitData) {
        console.log('join ' + unitData.id);
        unitData.type = "pc";
        new unitJs.Unit().initialize(socket, unitData);
    });
};
