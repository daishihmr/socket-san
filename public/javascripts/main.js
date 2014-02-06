var SERVER_URL = "/";

var SC_SIZE = 20000;

var app;
var socket;
var myUnit;
var score = 0;

var viewport = null;
var viewTarget = {
    x: SC_SIZE/2,
    y: SC_SIZE/2,
    rotation: 0,
    isSpace: true
};

var units = {};
unitsLength = function() {
    var i = 0;
    for (var key in this) if (this.hasOwnProperty(key)) {
        i++;
    }
    return i;
}.bind(units);
unitsPickup = function() {
    var keys = [];
    for (var key in this) if (this.hasOwnProperty(key)) {
        keys.push(key);
    }
    return this[keys.pickup()];
}.bind(units);

tm.main(function() {
    app = tm.display.CanvasApp("#app");
    app.resize(1000, 1000).fitWindow();
    app.background = "rgba(0, 0, 0, 0.3)";
    app.fps = 30;

    viewport = tm.app.Object2D().addChildTo(app.currentScene);
    viewport.scaleX = 0.6;
    viewport.scaleY = 0.6;
    viewport.update = function() {
        if (myUnit) {
            viewTarget = myUnit;
        } else if (viewTarget.isSpace === true && unitsLength() > 0) {
            viewTarget = unitsPickup();
            viewTarget.on("removed", function() {
                viewTarget = {
                    x: SC_SIZE/2,
                    y: SC_SIZE/2,
                    rotation: 0,
                    isSpace: true
                };
            });
        }
        var targetX = viewTarget.x + Math.cos((viewTarget.rotation-90)*Math.DEG_TO_RAD)*300;
        var targetY = viewTarget.y + Math.sin((viewTarget.rotation-90)*Math.DEG_TO_RAD)*300;
        var dx = (-targetX*this.scaleX + app.width/2 - this.x);
        var dy = (-targetY*this.scaleY + app.height/2 - this.y);
        if (dx < -SC_SIZE*0.5 || SC_SIZE*0.5 < dx) {
            this.x += dx;
        } else {
            this.x += dx * 0.2;
        }
        if (dy < -SC_SIZE*0.5 || SC_SIZE*0.5 < dy) {
            this.y += dy;
        } else {
            this.y += dy * 0.2;
        }
    };
    new Lock().addChildTo(viewport);

    var stars0 = Array.range(0, 20).map(function() {
        return {
            x: Math.random() * app.width,
            y: Math.random() * app.height,
            size: Math.random() * 5 + 0.1
        };
    });
    var stars1 = Array.range(0, 20).map(function() {
        return {
            x: Math.random() * app.width,
            y: Math.random() * app.height,
            size: Math.random() * 5 + 0.1
        };
    });
    var stars2 = Array.range(0, 20).map(function() {
        return {
            x: Math.random() * app.width,
            y: Math.random() * app.height,
            size: Math.random() * 5 + 0.1
        };
    });
    var background = tm.display.CanvasElement().addChildTo(app.currentScene);
    background.draw = function(canvas) {
        var x = viewport.x % app.width;
        var y = viewport.y % app.height;
        canvas.fillStyle = "rgba(255,255,255,0.6)";
        stars0.forEach(function(star) {
            canvas.fillCircle(star.x+x, star.y+y, star.size);
            canvas.fillCircle(star.x+x+app.width, star.y+y, star.size);
            canvas.fillCircle(star.x+x, star.y+y+app.height, star.size);
            canvas.fillCircle(star.x+x+app.width, star.y+y+app.height, star.size);
        });

        x = (viewport.x*0.75) % app.width;
        y = (viewport.y*0.75) % app.height;
        canvas.fillStyle = "rgba(255,255,255,0.4)";
        stars1.forEach(function(star) {
            canvas.fillCircle(star.x+x, star.y+y, star.size);
            canvas.fillCircle(star.x+x+app.width, star.y+y, star.size);
            canvas.fillCircle(star.x+x, star.y+y+app.height, star.size);
            canvas.fillCircle(star.x+x+app.width, star.y+y+app.height, star.size);
        });

        x = (viewport.x*0.5) % app.width;
        y = (viewport.y*0.5) % app.height;
        canvas.fillStyle = "rgba(255,255,255,0.2)";
        stars2.forEach(function(star) {
            canvas.fillCircle(star.x+x, star.y+y, star.size);
            canvas.fillCircle(star.x+x+app.width, star.y+y, star.size);
            canvas.fillCircle(star.x+x, star.y+y+app.height, star.size);
            canvas.fillCircle(star.x+x+app.width, star.y+y+app.height, star.size);
        });
    };

    var lader = new Lader().setPosition(app.width - 110, 110).addChildTo(app.currentScene);

    var playercount = tm.display.Label(" ", 40)
        .setAlign("left")
        .setBaseline("top")
        .setPosition(0, 0)
        .setFillStyle("white")
        .addChildTo(app.currentScene);
    playercount.update = function() {
        var pc = 0;
        var npc = 0;
        for (var id in units) if (units.hasOwnProperty(id)) {
            if (units[id].type == "pc") pc++;
            else npc++;
        }
        this.text = pc + "人が参加中 + " + npc + "機のNPC";
    };

    socket = io.connect(SERVER_URL);
    socket.emit("hello");
    socket.on("connect", function() {
        console.log("onconnect");
    });
    socket.on("disconnect", function(data) {
        console.log("disconnect");
    });

    var bullets = new Bullets().addChildTo(viewport);
    var rocks = [];

    socket.on("tick", function(allData) {
        allData.units.forEach(function(unit) {
            var target = units[unit.id];
            if (target === undefined) {
                target = new Unit(unit.id, unit.type).addChildTo(viewport);
            }
            target.setPosition(unit.x, unit.y).setRotation(unit.rotation);
            target.hp = unit.hp;
        });

        bullets.data = allData.bullets;
        
        allData.rocks.forEach(function(rock, i) {
            if (rocks[i] === undefined) {
                rocks[i] = new Rock(rock.x, rock.y, rock.radius).addChildTo(viewport);
            }
        });

        allData.explosions.forEach(function(explosion) {
            new Explosion(explosion.x, explosion.y, explosion.size).addChildTo(viewport);
        });
        allData.death.forEach(function(d) {
            var target = units[d.id];
            if (target !== undefined) {
                target.remove();
            }
            delete units[d.id];
        });
    });

    socket.on("kill", function() {
        score += 1;
    });

    socket.on("hit", function() {
        var l = tm.display.Label("HIT!!", 100)
            .setFillStyle("red")
            .setPosition(app.width/2, app.height)
            .setBaseline("bottom")
            .addChildTo(app.currentScene);
        l.fontStyle = "italic bold {fontSize}px {fontFamily}".format(l);
        l.update = function(app) {
            this.visible = app.frame%2 === 0;
        };
        l.tweener.to({alpha:0}, 1000).call(function() { this.remove() }.bind(l));
    });

    socket.on("death", function() {
        gameover();
    });

    var timer = tm.display.CanvasElement().addChildTo(app.currentScene);
    timer.update = function(app) {
        var kb = app.keyboard;
        socket.emit("enterframe", {
            up: kb.getKey("up"),
            down: kb.getKey("down"),
            left: kb.getKey("left"),
            right: kb.getKey("right"),
            z: kb.getKey("space") || kb.getKey("z")
        });

        if (kb.getKeyDown("escape")) {
            gameover();
        }
    };

    app.run();

    var joinButton = tm.ui.GlossyButton(180, 50, "blue", "Join to Game").setPosition(app.width/2, app.height/2).addChildTo(app.currentScene);
    joinButton.onclick = function() {
        this.remove();
        joinToGame();
        var lbl;
        lbl = tm.display.Label("カーソルキーで移動", 48).setPosition(app.width/2, app.height/2-200).addChildTo(app.currentScene);
        lbl.tweener.to({alpha:0}, 5000).call(function() { this.remove() }.bind(lbl));

        lbl = tm.display.Label("スペースキーで攻撃", 48).setPosition(app.width/2, app.height/2).addChildTo(app.currentScene);
        lbl.tweener.to({alpha:0}, 5000).call(function() { this.remove() }.bind(lbl));

        lbl = tm.display.Label("ESCキーで終了", 48).setPosition(app.width/2, app.height/2+200).addChildTo(app.currentScene);
        lbl.tweener.to({alpha:0}, 5000).call(function() { this.remove() }.bind(lbl));
    };
});

var joinToGame = function() {
    myUnit = new MyUnit();
    myUnit.addChildTo(viewport);
    socket.emit("join", {
        id: window.id,
        x: myUnit.x,
        y: myUnit.y,
        rotation: myUnit.rotation
    });
};

var gameover = function() {
    tm.display.Label("GAME OVER", 48)
        .setFillStyle("red")
        .setPosition(app.width/2, app.height/2)
        .addChildTo(app.currentScene)
        .tweener.set({
            alpha: 0
        }).to({
            alpha: 1
        }, 1000).call(function() {
            var resultScene = tm.app.ResultScene({
                width: app.width,
                height: app.height,
                score: score*100,
                msg: "ドッグファイト！ソケットさん",
                url: window.location.origin,
                hashtags: "dev7jp"
            });
            resultScene.on("nextscene", function() {
                window.location.href = window.location.origin;
            });
            app.replaceScene(resultScene);
        });
};

tm.define("Unit", {
    superClass: "tm.display.CanvasElement",

    id: null,
    hp: 0,

    init: function(id, type, color) {
        this.superInit();
        this.blendMode = "lighter";

        this.type = type;
        this.id = id;
        units[id] = this;

        if (this.type == "pc") {
            this.scaleX = 0.6;
            tm.display.TriangleShape(50, 50, {
                strokeStyle: color || "hsl(20, 50%, 50%)",
                fillStyle: "transparent",
                lineWidth: 5
            }).setBlendMode("lighter").addChildTo(this);
        } else {
            tm.display.RectangleShape(50, 50, {
                strokeStyle: "hsl(0, 50%, 50%)",
                fillStyle: "transparent",
                lineWidth: 5
            }).setBlendMode("lighter").addChildTo(this);
        }

        this.hp = 10;

        var that = this;
        var hpRing = tm.display.CanvasElement().setBlendMode("lighter").addChildTo(this);
        if (this.type == "pc") hpRing.scaleX = 1/0.6;
        hpRing.draw = function(canvas) {
            canvas.strokeStyle = "hsla(220, 80%, 80%, 0.5)";
            canvas.linecap = "round";

            canvas.lineWidth = 2;
            canvas.context.beginPath();
            canvas.context.arc(0, 0, 60, 0, Math.PI*2, false);
            canvas.stroke();

            canvas.lineWidth = 8;
            canvas.context.beginPath();
            canvas.context.arc(0, 0, 60, Math.PI*-0.5, Math.PI*-0.5 + that.hp/10 * Math.PI*2, false);
            canvas.stroke();
        };
    },

    update: function() {
        var f = tm.display.RectangleShape(50*2, 50*2, {
            fillStyle: tm.graphics.RadialGradient(50, 50, 0, 50, 50, 50).addColorStopList([
                { offset: 0, color: "rgba(255, 255, 255, 0.1)" },
                { offset: 1, color: "rgba(255, 255, 255, 0.0)" },
            ]).toStyle(),
            strokeStyle: "transparent"
        }).setPosition(this.x, this.y).setBlendMode("lighter").addChildTo(this.parent);
        f.v = tm.geom.Vector2().setAngle(this.rotation+90, 10);
        f.update = function() {
            this.position.add(this.v);
            this.alpha *= 0.8;
            if (this.alpha < 0.001) this.remove();
        }
    }
});

tm.define("MyUnit", {
    superClass: "Unit",

    heat: 0,

    init: function() {
        this.superInit(window.id, "pc", "hsl(220, 50%, 50%)");
        this.x = Math.random() * SC_SIZE;
        this.y = Math.random() * SC_SIZE;
        this.rotation = Math.random() * 360;
    }
});

tm.define("Bullets", {
    superClass: "tm.display.CanvasElement",

    data: null,

    init: function() {
        this.superInit();
        this.data = [];
        this.blendMode = "lighter";
    },

    draw: function(canvas) {
        this.data.forEach(function(bullet) {
            canvas.save();
            if (bullet.ownerId === window.id) {
                canvas.fillStyle = tm.graphics.RadialGradient(20, 0, 0, 0, 0, 30).addColorStopList([
                    { offset: 0, color: "white" },
                    { offset: 1, color: "rgba(0,0,255,0)" },
                ]).toStyle();
            } else {
                canvas.fillStyle = tm.graphics.RadialGradient(5, 0, 0, 0, 0, 30).addColorStopList([
                    { offset: 0, color: "white" },
                    { offset: 1, color: "rgba(255,0,0,0)" },
                ]).toStyle();
            }
            canvas.context.translate(bullet.x, bullet.y);
            canvas.context.rotate(Math.atan2(bullet.dy, bullet.dx));
            canvas.context.scale(2.0, 0.5);
            canvas.fillCircle(0, 0, 30);
            canvas.restore();
        });
    }
});

var LADER_RADIUS_MAX = 7000;
tm.define("Lader", {
    superClass: "tm.display.CanvasElement",

    radius: 7000,

    init: function() {
        this.superInit();
        this.blendMode = "lighter";
        this.lineAngle = 0;
    },

    update: function() {
        this.lineAngle += 0.1;
    },

    draw: function(canvas) {
        if (viewTarget == null) return;

        canvas.fillStyle = "hsla(220, 50%, 50%, 0.2)";
        canvas.lineWidth = 1;

        canvas.fillCircle(0, 0, this.radius * 100/LADER_RADIUS_MAX);

        for (var i = 0; i < 5; i++) {
            canvas.strokeStyle = "hsla(100, 50%, 70%, " + (0.05*i) + ")";
            canvas.drawLine(0, 0, Math.cos(this.lineAngle+i*0.05)*100, Math.sin(this.lineAngle+i*0.05)*100);
        }

        var rx = Math.max(-100, -viewTarget.x * 100/LADER_RADIUS_MAX);
        var ry = Math.max(-100, -viewTarget.y * 100/LADER_RADIUS_MAX);
        var rw = Math.min(100-rx, ((SC_SIZE - viewTarget.x) * 100/LADER_RADIUS_MAX) - rx);
        var rh = Math.min(100-ry, ((SC_SIZE - viewTarget.y) * 100/LADER_RADIUS_MAX) - ry);
        canvas.strokeStyle = "white";
        canvas.strokeRect(rx, ry, rw, rh);
        canvas.strokeRect(-100, -100, 200, 200);

        for (var id in units) if (units.hasOwnProperty(id)) {
            var u = units[id];
            canvas.fillStyle = u.id === window.id ? "aqua" : "red";
            if ((viewTarget.x-u.x)*(viewTarget.x-u.x) + (viewTarget.y-u.y)*(viewTarget.y-u.y) < this.radius*this.radius) {
                canvas.fillRect((u.x-viewTarget.x) * 100 / this.radius - 2, (u.y-viewTarget.y) * 100 / this.radius - 2, 4, 4);
            }
        }
    }
});

tm.define("Explosion", {
    superClass: "tm.display.RectangleShape",

    init: function(x, y, size) {
        this.superInit(size*2, size*2, {
            fillStyle: tm.graphics.RadialGradient(size, size, 0, size, size, size).addColorStopList([
                { offset: 0.0, color: "rgba(255, 255, 255, 0)"},
                { offset: 0.2, color: "rgba(255, 255, 255, 0)"},
                { offset: 0.9, color: "rgba(255, 255, 255, 1)"},
                { offset: 1.0, color: "rgba(255, 255, 255, 0)"}
            ]).toStyle(),
            strokeStyle: "transparent"
        });
        this.setPosition(x, y);
        this.tweener.clear().set({
            scaleX: 0.1,
            scaleY: 0.1,
            alpha: 1
        }).to({
            scaleX: 1,
            scaleY: 1,
            alpha: 0
        }, size, "easeOutQuad")
        .call(function() {
            this.remove();
        }.bind(this));
    }
});

tm.define("Lock", {
    superClass: "tm.display.CanvasElement",

    nears: null,

    init: function() {
        this.superInit();
    },

    update: function() {
        if (!myUnit) return;

        this.nears = [];
        for (var id in units) if (units.hasOwnProperty(id)) {
            if (id !== window.id && tm.geom.Vector2.distanceSquared(myUnit, units[id]) < 2000*2000) {
                this.nears.push(units[id]);
            }
        }
    },

    draw: function(canvas) {
        if (!myUnit) return;

        canvas.strokeStyle = "white";
        canvas.lineWidth = 0.5;
        this.nears.forEach(function(unit) {
            canvas.drawLine(myUnit.x, myUnit.y, unit.x, unit.y);
        });
    }
});

tm.define("Rock", {
    superClass: "tm.display.CanvasElement",

    points: null,

    init: function(x, y, radius) {
        this.superInit();

        this.x = x;
        this.y = y;
        this.radius = radius;

        this.points = [];
        for (var i = 0; i < 10; i++) {
            var a = Math.PI*2 * i / 10;
            this.points.push(Math.cos(a) * radius * Math.randf(0.8, 1.2));
            this.points.push(Math.sin(a) * radius * Math.randf(0.8, 1.2));
        }
        this.points.push(this.points[0]);
        this.points.push(this.points[1]);
    },

    update: function() {

    },

    draw: function(canvas) {
        canvas.strokeStyle = "white";
        canvas.lineWidth = 5;
        canvas.strokeLines.apply(canvas, this.points);
    }
})