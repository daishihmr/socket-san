var SC_SIZE = 10000;

var units = [];
var bullets = [];
var explosions = [];
var death = [];

var Unit = function(socket, data) {
    this.socket = socket;

    this.hp = 10;

    this.id = data.id;
    this.x = data.x;
    this.y = data.y;
    this.rotation = data.rotation;
    this.velocity = {
        x: 0,
        y: 0
    };
    this.heat = 0;

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
};

Unit.prototype.update = function() {
    if (this.hp <= 0) return;

    if (this.keyboard.left) {
        this.rotation -= 5;
    } else if (this.keyboard.right) {
        this.rotation += 5;
    }

    var cos = Math.cos((this.rotation-90)*Math.PI/180);
    var sin = Math.sin((this.rotation-90)*Math.PI/180);
    if (this.keyboard.up) {
        this.velocity.x += cos*0.2;
        this.velocity.y += sin*0.2;
    } else if (this.keyboard.down) {
        this.velocity.x += cos*-0.2;
        this.velocity.y += sin*-0.2;
    }

    if (this.keyboard.z && this.heat < 0) {
        var dx = cos*40;
        var dy = sin*40;
        new Bullet({
            x: this.x + dx,
            y: this.y + dy,
            dx: dx,
            dy: dy,
            ownerId: this.id
        });
        this.heat = 3;
    }

    this.x += this.velocity.x;
    this.y += this.velocity.y;
    this.velocity.x *= 0.99;
    this.velocity.y *= 0.99;

    this.heat -= 1;

    if (this.x < 0 || SC_SIZE <= this.x) {
        this.velocity.x *= -1;
        this.x = this.x < 0 ? 0 : SC_SIZE-1;
    }
    if (this.y < 0 || SC_SIZE <= this.y) {
        this.velocity.y *= -1;
        this.y = this.y < 0 ? 0 : SC_SIZE-1;
    }
};
Unit.update = function(unit) { unit.update(); };

Unit.prototype.damage = function(bullet) {
    this.velocity.x += bullet.dx*0.1;
    this.velocity.y += bullet.dy*0.1;
    this.hp -= 1;

    explosions.push({
        x: bullet.x,
        y: bullet.y,
        size: this.hp > 0 ? 200: 800
    });
    if (this.hp <= 0) {
        this.socket.emit('death');
        var idx = units.indexOf(this);
        if (idx !== -1) units.splice(idx, 1);
        death.push({
            id: this.id
        });

        for (var i = 0; i < units.length; i++) {
            if (units[i].id === bullet.ownerId) {
                units[i].socket.emit('kill');
                break;
            }
        }
    }
};

Unit.prototype.publish = function() {
    return {
        id: this.id,
        x: this.x,
        y: this.y,
        rotation: this.rotation
    };
};
Unit.publish = function(unit) { return unit.publish(); };

var Bullet = function(data) {
    this.ownerId = data.ownerId;
    this.x = data.x;
    this.y = data.y;
    this.dx = data.dx;
    this.dy = data.dy;
    this.age = 0;

    bullets.push(this);
};
Bullet.prototype.update = function() {
    this.x += this.dx;
    this.y += this.dy;
    this.age += 1;
    if (this.age > 40) {
        this.remove();
        return;
    }

    var copied = [].concat(units);
    copied.forEach(function(unit) {
        if (this.ownerId === unit.id) return;
        if ((unit.x - this.x)*(unit.x - this.x) + (unit.y - this.y)*(unit.y - this.y) < 30*30) {
            this.remove();
            unit.damage(this);
        }
    }.bind(this));
};
Bullet.prototype.remove = function() {
    var idx = bullets.indexOf(this);
    if (idx !== -1) bullets.splice(idx, 1);
};
Bullet.prototype.publish = function() {
    return {
        ownerId: this.ownerId,
        x: this.x,
        y: this.y,
        dx: this.dx,
        dy: this.dy
    };
};
Bullet.update = function(bullet) { bullet.update(); };
Bullet.publish = function(bullet) { return bullet.publish(); };

exports.world = function(socket) {
    socket.on('join', function(unitData) {
        console.log('join ' + unitData.id);
        new Unit(socket, unitData);
    });
};

var updateWorld = function() {
    var copiedUnits = [].concat(units);
    copiedUnits.forEach(Unit.update);
    var copiedBullets = [].concat(bullets);
    copiedBullets.forEach(Bullet.update);

    var allData = {
        units: units.map(Unit.publish),
        bullets: bullets.map(Bullet.publish),
        explosions: explosions,
        death: death
    };
    units.forEach(function(unit) {
        unit.socket.emit('tick', allData);
    });

    explosions.splice(0);
    death.splice(0);

    setTimeout(updateWorld, 1000/60);
};
updateWorld();
