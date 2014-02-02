var unitJs = require("./unit");

var bullets = [];

var Bullet = function(data) {
    this.owner = data.owner;
    this.x = data.x;
    this.y = data.y;
    this.dx = data.dx;
    this.dy = data.dy;
    this.age = 400;

    bullets.push(this);
};
Bullet.prototype.update = function(frame) {
    this.x += this.dx;
    this.y += this.dy;
    this.age -= 1;
    if (this.age <= 0) {
        this.remove();
        return;
    }

    var copied = [].concat(unitJs.units);
    copied.forEach(function(unit) {
        if (this.owner === unit) return;
        if ((unit.x - this.x)*(unit.x - this.x) + (unit.y - this.y)*(unit.y - this.y) < 30*30) {
            this.remove();
            unit.damage(this);
            this.owner.socket.emit("hit");
        }
    }.bind(this));
};
Bullet.prototype.remove = function() {
    var idx = bullets.indexOf(this);
    if (idx !== -1) bullets.splice(idx, 1);
};
Bullet.prototype.publish = function() {
    return {
        ownerId: this.owner.id,
        x: this.x,
        y: this.y,
        dx: this.dx,
        dy: this.dy
    };
};
Bullet.publish = function(bullet) { return bullet.publish(); };

exports.Bullet = Bullet;
exports.bullets = bullets;
