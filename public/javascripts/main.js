var app;
var socket;
var myUnit;
var units = {};

tm.main(function() {
    app = tm.display.CanvasApp("#app");
    app.resize(1000, 1000).fitWindow();
    app.background = "rgba(0, 0, 0, 0.3)";
    app.fps = 30;

    var viewport = tm.display.CanvasElement().addChildTo(app.currentScene);
    viewport.stars = Array.range(0, 10000).map(function() {
        return {
            x: -10000 + Math.random() * 20000,
            y: -10000 + Math.random() * 20000,
            size: Math.random() * 2 + 0.1
        };
    });
    viewport.update = function() {
        this.x += (-myUnit.x + app.width/2 - this.x) * 0.1;
        this.y += (-myUnit.y + app.height/2 - this.y) * 0.1;
    };
    viewport.draw = function(canvas) {
        this.stars.forEach(function(star) {
            canvas.fillStyle = "white";
            canvas.fillCircle(star.x, star.y, star.size);
        })
    };

    myUnit = new MyUnit(window.id);
    myUnit.addChildTo(viewport);

    socket = io.connect("http://localhost:3000");
    socket.on("connect", function() {
        console.log("onconnect");
        this.emit("join", {
            id: window.id,
            x: myUnit.x,
            y: myUnit.y,
            rotation: myUnit.rotation
        });
    });
    socket.on("disconnect", function(data) {
        console.log("disconnect");
    });

    var bullets = new Bullets().addChildTo(viewport);

    socket.on("tick", function(allData) {
        allData.units.forEach(function(unit) {
            var target = units[unit.id];
            if (target === undefined) {
                target = new Unit(unit.id).addChildTo(viewport);
            }
            target.setPosition(unit.x, unit.y).setRotation(unit.rotation);
        });
        bullets.data = allData.bullets;
    });

    var timer = tm.display.CanvasElement().addChildTo(app.currentScene);
    timer.update = function(app) {
        var kb = app.keyboard;
        socket.emit("enterframe", {
            up: kb.getKey("up"),
            down: kb.getKey("down"),
            left: kb.getKey("left"),
            right: kb.getKey("right"),
            z: kb.getKey("z")
        });
    };

    app.run();
});

tm.define("Unit", {
    superClass: "tm.display.CanvasElement",

    id: null,

    init: function(id, color) {
        this.superInit();
        this.scaleX = 0.6;

        this.id = id;
        units[id] = this;

        tm.display.TriangleShape(50, 50, {
            strokeStyle: color || "hsl(20, 50%, 50%)",
            fillStyle: "transparent",
            lineWidth: 5
        }).setBlendMode("lighter").addChildTo(this);
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
            // this.scaleX *= 0.8;
            // this.scaleY *= 0.8;
            if (this.alpha < 0.001) this.remove();
        }
    }
});

tm.define("MyUnit", {
    superClass: "Unit",

    heat: 0,

    init: function() {
        this.superInit(window.id, "hsl(220, 50%, 50%)");
        this.x = Math.random() * app.width;
        this.y = Math.random() * app.height;
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