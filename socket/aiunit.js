var worldJs = require("./world");

var unitJs = require("./unit");

var DummySocket = function() {
    this.dummy = true;
    this.listeners = {};
};

DummySocket.prototype.on = function(eventType, listener) {
    if (!this.listeners[eventType]) {
        this.listeners[eventType] = [];
    }
    this.listeners[eventType].push(listener);
};
DummySocket.prototype.emit = function(eventType, args) {
    if (!this.listeners[eventType]) return;
    var copied = [].concat(this.listeners[eventType]);
    for (var i = 0; i < copied.length; i++) {
        copied[i].call(this, args);
    }
};

var count = 0;
var AIUnit = function() {};
AIUnit.prototype = new unitJs.Unit();

AIUnit.prototype.initialize = function() {
    unitJs.Unit.prototype.initialize.call(this, new DummySocket(), {
        type: "npc",
        id: "AI-" + count++,
        x: Math.random() * worldJs.SC_SIZE,
        y: Math.random() * worldJs.SC_SIZE,
        rotation: Math.random() * 360,
    });

    this.age = -1;

    this.aiPersonality = Math.floor(Math.random() * 3);

    console.log("AIUnit#initialize");
};

AIUnit.prototype.update = function(frame) {
    this.age += 1;

    if (unitJs.units.length === 0) {
        this.keyboard.top = false;
        this.keyboard.bottom = false;
        this.keyboard.left = false;
        this.keyboard.right = false;
        this.keyboard.z = false;
        return;
    }

    var target = null;
    var tarDist = -1;
    for (var i = 0; i < unitJs.units.length; i++) {
        var unit = unitJs.units[i];
        if (unit.type == "npc") continue;

        var dist = (this.x-unit.x)*(this.x-unit.x) + (this.y-unit.y)*(this.y-unit.y);
        if (dist < tarDist || tarDist === -1) {
            tarDist = dist;
            target = unit;
        }
    }

    if (target == null) return;

    var r = (Math.atan2(target.y - this.y, target.x - this.x) * 180 / Math.PI) + 90;
    switch (this.aiPersonality) {
    case 1:
        if (tarDist > 2000*2000) r += 15;
        break;
    case 2:
        if (tarDist > 2000*2000) r -= 15;
        break;
    } 
    var d = r - this.rotation;
    while(d < -180) d += 360;
    while(180 <= d) d -= 360;

    if (d < 0) {
        this.keyboard.left = true;
        this.keyboard.right = false;
    } else {
        this.keyboard.left = false;
        this.keyboard.right = true;
    }

    var shotStartDistance = this.aiPersonality === 0 ? 800 : 2000;
    if (tarDist < shotStartDistance*shotStartDistance && Math.floor(this.age/11) % 10 === 0) {
        this.keyboard.up = frame%2 === 0;
        this.keyboard.z = true;
    } else {
        this.keyboard.up = true;
        this.keyboard.z = false;
    }

    unitJs.Unit.prototype.update.call(this, frame);
};

AIUnit.prototype.recoverHp = function() {
};

exports.AIUnit = AIUnit;

exports.aiUnitNumber = function() {
    var npc = 0;
    for (var i = 0; i < unitJs.units.length; i++) {
        if (unitJs.units[i].type == "npc") npc++;
    }
    return npc;
};
