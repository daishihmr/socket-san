var worldJs = require("./world");
var bulletJs = require("./bullet");

var units = [];

var Unit = function() {};

Unit.prototype.initialize = function(socket, data) {
    this.socket = socket;

    this.hp = 10;

    this.type = data.type;
    this.id = data.id;
    this.x = data.x;
    this.y = data.y;
    this.rotation = data.rotation;
    this.velocity = {
        x: 0,
        y: 0
    };
    this.heat = 0;
    this.star = 1;

    this.keyboard = {
        up: false,
        down: false,
        left: false,
        right: false,
        z: false,
    };

    units.push(this);

    socket.on('disconnect', function() {
        var idx = units.indexOf(this);
        if (idx !== -1) units.splice(idx, 1);
    }.bind(this));
    socket.on('enterframe', function(keyboard) {
        this.keyboard = keyboard;
    }.bind(this));

    console.log("Unit#initialize");
};

Unit.prototype.update = function(frame) {
    if (this.hp <= 0) return;

    this.recoverHp();

    if (this.keyboard.left) {
        this.rotation -= 5;
    } else if (this.keyboard.right) {
        this.rotation += 5;
    }

    var cos = Math.cos((this.rotation-90)*Math.PI/180);
    var sin = Math.sin((this.rotation-90)*Math.PI/180);
    if (this.keyboard.up) {
        this.velocity.x += cos*0.5;
        this.velocity.y += sin*0.5;
    } else if (this.keyboard.down) {
        this.velocity.x += cos*-0.5;
        this.velocity.y += sin*-0.5;
    }

    if (this.keyboard.z && this.heat < 0) {
        if (this.type === "pc") {
            var dx = cos * 40 + this.velocity.x;
            var dy = sin * 40 + this.velocity.y;
            new bulletJs.Bullet({
                x: this.x + dx + Math.cos((this.rotation-90-90)*Math.PI/180)*20,
                y: this.y + dy + Math.sin((this.rotation-90-90)*Math.PI/180)*20,
                dx: dx,
                dy: dy,
                owner: this
            });
            new bulletJs.Bullet({
                x: this.x + dx + Math.cos((this.rotation-90+90)*Math.PI/180)*20,
                y: this.y + dy + Math.sin((this.rotation-90+90)*Math.PI/180)*20,
                dx: dx,
                dy: dy,
                owner: this
            });
            this.heat = 6;
        } else {
            var dx = cos * 40 + this.velocity.x;
            var dy = sin * 40 + this.velocity.y;
            new bulletJs.Bullet({
                x: this.x + dx,
                y: this.y + dy,
                dx: dx,
                dy: dy,
                owner: this
            });
            this.heat = 4;
        }
    }

    this.x += this.velocity.x;
    this.y += this.velocity.y;
    this.velocity.x *= 0.99;
    this.velocity.y *= 0.99;

    this.heat -= 1;

    if (this.x < 0 || worldJs.SC_SIZE <= this.x) {
        this.velocity.x *= -1;
        this.x = this.x < 0 ? 0 : worldJs.SC_SIZE-1;
    }
    if (this.y < 0 || worldJs.SC_SIZE <= this.y) {
        this.velocity.y *= -1;
        this.y = this.y < 0 ? 0 : worldJs.SC_SIZE-1;
    }
};

Unit.prototype.recoverHp = function() {
    this.hp = Math.min(10, this.hp + 0.001);
};

Unit.prototype.damage = function(bullet) {
    this.velocity.x += bullet.dx*0.1;
    this.velocity.y += bullet.dy*0.1;
    this.hp -= 1;

    worldJs.explosions.push({
        x: bullet.x,
        y: bullet.y,
        size: 200
    });
    if (this.hp <= 0) {
        this.socket.emit('death');
        var idx = units.indexOf(this);
        if (idx !== -1) units.splice(idx, 1);
        worldJs.explosions.push({
            x: this.x,
            y: this.y,
            size: 1000
        });
        worldJs.death.push({
            id: this.id
        });

        for (var i = 0; i < units.length; i++) {
            if (units[i] === bullet.owner) {
                if (units[i].type == "pc") units[i].star += this.star;
                units[i].socket.emit('kill');
                break;
            }
        }
    }
};

Unit.prototype.publish = function() {
    return {
        type: this.type,
        id: this.id,
        x: this.x,
        y: this.y,
        rotation: this.rotation,
        hp: this.hp,
        star: this.star
    };
};
Unit.publish = function(unit) { return unit.publish(); };

exports.Unit = Unit;
exports.units = units;
exports.pcUnitNumber = function() {
    var pc = 0;
    for (var i = 0; i < units.length; i++) {
        if (units[i].type == "pc") pc++;
    }
    return pc;
};
