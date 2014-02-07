var worldJs = require("./world");
var bulletJs = require("./bullet");
var unitJs = require("./unit");

var rocks = [];

var Rock = function() {};
Rock.prototype.initialize = function() {
    this.x = Math.random() * worldJs.SC_SIZE;
    this.y = Math.random() * worldJs.SC_SIZE;
    this.dx = -2 + Math.random() * 4;
    this.dy = -2 + Math.random() * 4;
    this.radius = 200 + Math.random() * 200;
    rocks.push(this);
};

Rock.prototype.update = function(frame) {
    this.x += this.dx;
    this.y += this.dy;

    if (this.x < this.radius) {
        this.x = this.radius;
        this.dx *= -1;
    } else if (worldJs.SC_SIZE-this.radius < this.x) {
        this.x = worldJs.SC_SIZE-this.radius;
        this.dx *= -1;
    }
    if (this.y < this.radius) {
        this.y = this.radius;
        this.dy *= -1;
    } else if (worldJs.SC_SIZE-this.radius < this.y) {
        this.y = worldJs.SC_SIZE-this.radius;
        this.dy *= -1;
    }

    var copiedUnits = [].concat(unitJs.units);
    copiedUnits.forEach(function(unit) {
        if ((unit.x - this.x)*(unit.x - this.x) + (unit.y - this.y)*(unit.y - this.y) < (this.radius+40)*(this.radius+40)) {
            this.dx += unit.velocity.x*0.002;
            this.dy += unit.velocity.y*0.002;

            var a = Math.atan2(unit.y - this.y, unit.x - this.x);
            unit.x = this.x + Math.cos(a) * (this.radius + 20);
            unit.y = this.y + Math.sin(a) * (this.radius + 20);

            var s = Math.sqrt((unit.velocity.x*unit.velocity.x) + (unit.velocity.y*unit.velocity.y));
            unit.velocity.x += Math.cos(a) * s*0.3;
            unit.velocity.y += Math.sin(a) * s*0.3;
            unit.x += unit.velocity.x;
            unit.y += unit.velocity.y;
        }
    }.bind(this));

    var copiedBullets = [].concat(bulletJs.bullets);
    copiedBullets.forEach(function(bullet) {
        if ((bullet.x - this.x)*(bullet.x - this.x) + (bullet.y - this.y)*(bullet.y - this.y) < (this.radius+20)*(this.radius+20)) {
            worldJs.explosions.push({
                x: bullet.x,
                y: bullet.y,
                size: 200
            });
            this.dx += bullet.dx*0.001;
            this.dy += bullet.dy*0.001;
            bullet.remove();
        }
    }.bind(this));
};

Rock.prototype.publish = function() {
    return {
        x: this.x,
        y: this.y,
        radius: this.radius
    };
};
Rock.publish = function(rock) { return rock.publish(); };

exports.Rock = Rock;
exports.rocks = rocks;

exports.init = function() {
    for (var i = 0; i < 40; i++) {
        new Rock().initialize();
    }
};
