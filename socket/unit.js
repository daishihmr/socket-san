var worldJs = require("./world");
var bulletJs = require("./bullet");
var fs = require("fs");

var MachineData = JSON.parse(fs.readFileSync('public/machinetype.json', { encoding: 'utf8'}));

var units = [];

var Unit = function() {};

Unit.prototype.initialize = function(socket, data) {
    var machineData = MachineData[data.machineType || "a"];

    this.socket = socket;

    this.machineType = data.machineType;
    this.maxHp = this.hp = machineData.hp;
    this.accelForward = machineData.accelForward;
    this.accelBack = machineData.accelBack;
    this.angularSpeed = machineData.angularSpeed;
    this.shotType = machineData.shotType;
    this.shotParam = machineData.shotParam;
    this.shotPowar = machineData.shotPowar;
    this.shotSpeed = machineData.shotSpeed;
    this.shotAge = machineData.shotAge;
    this.shotHeat = machineData.shotHeat;

    this.type = data.type;
    this.id = data.id;
    this.icon = data.icon;
    this.x = data.x;
    this.y = data.y;
    this.rotation = data.rotation;
    this.velocity = {
        x: 0,
        y: 0
    };
    this.heat = 0;
    this.star = 1;
    this.fireOn = -1;

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

    var cos = Math.cos((this.rotation-90)*Math.PI/180);
    var sin = Math.sin((this.rotation-90)*Math.PI/180);

    if (this.fireOn > 0) {
        this.keyboard.up = false;
        this.keyboard.down = false;
        this.keyboard.left = false;
        this.keyboard.right = false;
        this.keyboard.z = false;
        if (this.shotType == "long") {
            var dx = cos * this.shotSpeed;
            var dy = sin * this.shotSpeed;
            this.velocity.x += cos*-0.3;
            this.velocity.y += sin*-0.3;
            for (var i = -this.shotParam.width/2; i <= this.shotParam.width/2; i+=20) {
                new bulletJs.Bullet({
                    x: this.x + dx + Math.cos((this.rotation-90-90)*Math.PI/180) * i,
                    y: this.y + dy + Math.sin((this.rotation-90-90)*Math.PI/180) * i,
                    dx: dx,
                    dy: dy,
                    owner: this,
                    ageLimit: this.shotAge,
                    power: this.shotPowar
                });
            }
        }

        this.fireOn -= 1;
    }

    if (this.keyboard.left) {
        this.rotation -= this.angularSpeed;
    } else if (this.keyboard.right) {
        this.rotation += this.angularSpeed;
    }

    if (this.keyboard.up) {
        this.velocity.x += cos*this.accelForward;
        this.velocity.y += sin*this.accelForward;
    } else if (this.keyboard.down) {
        this.velocity.x += cos*-this.accelBack;
        this.velocity.y += sin*-this.accelBack;
    }

    if (this.keyboard.z && this.heat < 0) {
        if (this.shotType === "twin") {
            var dx = cos * this.shotSpeed + this.velocity.x;
            var dy = sin * this.shotSpeed + this.velocity.y;
            new bulletJs.Bullet({
                x: this.x + dx + Math.cos((this.rotation-90-90)*Math.PI/180) * -20,
                y: this.y + dy + Math.sin((this.rotation-90-90)*Math.PI/180) * -20,
                dx: dx,
                dy: dy,
                owner: this,
                ageLimit: this.shotAge,
                power: this.shotPowar
            });
            new bulletJs.Bullet({
                x: this.x + dx + Math.cos((this.rotation-90-90)*Math.PI/180) * +20,
                y: this.y + dy + Math.sin((this.rotation-90-90)*Math.PI/180) * +20,
                dx: dx,
                dy: dy,
                owner: this,
                ageLimit: this.shotAge,
                power: this.shotPowar
            });
        } else if (this.shotType === "wide") {
            var w = this.shotParam.width;
            for (var i = -w/2; i <= w/2; i+= w/(this.shotParam.way-1)) {
                var cos2 = Math.cos((this.rotation+i-90)*Math.PI/180);
                var sin2 = Math.sin((this.rotation+i-90)*Math.PI/180);
                var dx = cos2 * this.shotSpeed + this.velocity.x;
                var dy = sin2 * this.shotSpeed + this.velocity.y;
                new bulletJs.Bullet({
                    x: this.x + dx,
                    y: this.y + dy,
                    dx: dx,
                    dy: dy,
                    owner: this,
                    ageLimit: this.shotAge,
                    power: this.shotPowar
                });
            }
        } else if (this.shotType === "long") {
            this.fireOn = this.shotParam.time;
        } else {
            var dx = cos * this.shotSpeed + this.velocity.x;
            var dy = sin * this.shotSpeed + this.velocity.y;
            new bulletJs.Bullet({
                x: this.x + dx,
                y: this.y + dy,
                dx: dx,
                dy: dy,
                owner: this,
                ageLimit: this.shotAge,
                power: this.shotPowar
            });
        }
        this.heat = this.shotHeat;
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
    this.hp = Math.min(this.maxHp, this.hp + 0.001);
};

Unit.prototype.damage = function(bullet) {
    this.velocity.x += bullet.dx*0.1;
    this.velocity.y += bullet.dy*0.1;
    this.hp -= bullet.power;

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
        machineType: this.machineType,
        type: this.type,
        id: this.id,
        icon: this.icon,
        x: this.x,
        y: this.y,
        rotation: this.rotation,
        hp: this.hp,
        maxHp: this.maxHp,
        star: this.star,
        heat: this.heat
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
