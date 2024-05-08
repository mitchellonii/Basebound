const { v4: uuidv4 } = require('uuid');

var ongoingGames = []
var db = require("../db")


class Queue {
    constructor() {
        this.join = (player) => {
            if (ongoingGames.length == 0) {
                var g = new Game()
                ongoingGames.push(g);
                g.join(player)
            } else {
                var inGames = ongoingGames.filter(g => g.playersJoining.includes(player))
                if (inGames.length == 0 && !ongoingGames[0].started) ongoingGames[0].join(player)
                else if (ongoingGames[0].started) {
                    var g = new Game()
                    ongoingGames.push(g);
                    g.join(player)

                }
                else return inGames[0].id



            }
            return ongoingGames[0].id
        }
    }
}


class Game {
    constructor() {
        var players;
        this.projectiles = []
        this.buildings = []
        this.maxPlayers = 5;
        this.minPlayers = 2;

        this.countdown = 10000
        this.worldSize = [60, 40]//x50 for each cube
        this.playersJoining = []
        this.upgradedConnections = {}
        this.joinable = true
        this.started = false
        this.countdownStartedTimestamp = -1;
        this.joined = 0


        this.id = uuidv4()

        this.join = (player) => {
            if (!this.joinable) return;
            this.playersJoining.push(player)
            this.triggerUpdate()
        }
        this.triggerUpdate = () => {
            if (this.playersJoining.length >= this.maxPlayers) this.joinable = false;

        }


        this.confirmJoin = (player) => {
            this.joined++;

            for (const [id, socket] of Object.entries(this.upgradedConnections)) {
                socket.send(JSON.stringify({
                    "event": "playerJoinEvent", "data": {
                        playerID: player,
                        joined: this.joined,
                        max: this.maxPlayers
                    }
                }))
            }
            if (this.joined >= this.minPlayers && !this.started) this.beginCountdown()

        }

        this.confirmLeave = (player) => {
            this.joined--;

            for (const [id, socket] of Object.entries(this.upgradedConnections)) {
                socket.send(JSON.stringify({
                    "event": "playerLeaveEvent", "data": {
                        playerID: player,
                        joined: this.joined,
                        max: this.maxPlayers
                    }
                }))
            }
        }

        this.beginCountdown = () => {
            if (this.started) return
            this.countdownStartedTimestamp = Date.now()
            var loop = () => {
                if (Date.now() - this.countdownStartedTimestamp < this.countdown && Object.keys(this.upgradedConnections).length >= this.minPlayers) {
                    for (const [id, socket] of Object.entries(this.upgradedConnections)) {
                        var packet = JSON.stringify({
                            "event": "countdownUpdateEvent", "data": {
                                joined: this.joined,
                                max: this.maxPlayers,
                                remaining: this.countdown - (Date.now() - this.countdownStartedTimestamp)
                            }
                        })
                        socket.send(packet)

                    }
                    setTimeout(loop, 1000)
                } else if (Date.now() - this.countdownStartedTimestamp > this.countdown && Object.keys(this.upgradedConnections).length >= this.minPlayers) {
                    for (const [id, socket] of Object.entries(this.upgradedConnections)) {
                        var packet = JSON.stringify({
                            "event": "gameBeginEvent", "data": {

                            }
                        })
                        socket.send(packet)
                    }
                    this.beginGameLoop()
                } else if (Object.keys(this.upgradedConnections).length < this.minPlayers) {
                    console.log("h")
                    this.countdownStartedTimestamp = -1
                    for (const [id, socket] of Object.entries(this.upgradedConnections)) {
                        var packet = JSON.stringify({
                            "event": "countdownAbortEvent", "data": {
                                joined: this.joined,
                                max: this.maxPlayers,
                            }
                        })
                        socket.send(packet)

                    }
                }


            }
            loop()
        }

        this.misc = {
            ticksRemaining: -1,
            totalTicks: 6000
        }


        this.beginGameLoop = () => {
            this.misc.ticksRemaining = this.misc.totalTicks
            this.started = true
            players = Object.fromEntries(Object.keys(this.upgradedConnections).map(key => [key, {}]));
            var pl = Object.keys(players)

            pl.forEach(async (p) => {//intitialise
                players[p].position = [0, 0]
                players[p].health = 100
                players[p].character = "Robot"
                players[p].direction = "Right"
                players[p].move = "still"
                players[p].username = (await db.login(p)).username
                players[p].maxHealth = 100
                players[p].ticksToHeal = 0;
                players[p].superCharge = 0;
                players[p].scrap = 0;
            })

            var world = {
                size: this.worldSize,
                border: [75, 50],
                crates: [[10, 10], [28, 3], [25, 18], [15, 5], [8, 10], [9, 18]]
            }




            let tick = () => {
                if (Object.keys(players).length == 1) return this.endGame()
                if (this.misc.ticksRemaining <= 0) {
                    clearInterval(this.loopInt)
                    this.endGame()
                }
                for (const [id, socket] of Object.entries(this.upgradedConnections)) {
                    var packet = JSON.stringify({
                        "event": "gameTickEvent", "data": {
                            players: players,
                            world: world,
                            misc: this.misc,
                            projectiles: this.projectiles,
                            buildings: this.buildings
                        }
                    })
                    socket.send(packet)


                }



                for (const proj in this.projectiles) {

                    var pp = this.projectiles[proj]
                    if (pp.ticksAlive > 30) {
                        pp.dead = true;

                    }
                    else {
                        var projSpeed = 0.4
                        if (pp.direction[0] == -1) pp.position[0] -= projSpeed
                        else if (pp.direction[0] == 1) pp.position[0] += projSpeed
                        if (pp.direction[1] == -1) pp.position[1] -= projSpeed
                        else if (pp.direction[1] == 1) pp.position[1] += projSpeed
                        pp.ticksAlive++;
                    }
                }



                var speed = 0.1
                world.border[0] -= world.size[0] / this.misc.totalTicks * 1.1
                world.border[1] -= world.size[1] / this.misc.totalTicks * 1.1
                for (const p of Object.keys(players)) {
                    if (players[p].move == "left") {
                        if (!(players[p].position[0] - speed > -1)) return
                        players[p].direction = "Left";
                        players[p].position[0] -= speed
                    }
                    if (players[p].move == "right") {
                        if (!(players[p].position[0] - speed < this.worldSize[0] - 2)) return
                        players[p].direction = "Right";
                        players[p].position[0] += speed
                    }
                    if (players[p].move == "down") {
                        if (!(players[p].position[1] - speed < this.worldSize[1] - 2)) return
                        players[p].direction = "Down";
                        players[p].position[1] += speed

                    }
                    if (players[p].move == "up") {
                        if (!(players[p].position[1] - speed > -1)) return
                        players[p].direction = "Up";
                        players[p].position[1] -= speed
                    }



                    if (players[p].position[0] < world.size[0] - world.border[0] - 3) {
                        players[p].health -= 0.05
                    }
                    if (players[p].position[0] > world.border[0]) {
                        players[p].health -= 0.05
                    }



                    for (const proj in this.projectiles) {

                        var pp = this.projectiles[proj]
                        if (!pp.dead) {
                            for (const p of Object.keys(players)) {
                                var diffX = Math.abs(pp.position[0] - players[p].position[0])
                                var diffY = Math.abs(pp.position[1] - players[p].position[1])

                                if (diffX < 2 && diffY < 2 && pp.owner !== p) {
                                    players[p].health -= 5
                                    players[pp.owner].superCharge += 1
                                    pp.dead = true;
                                }
                            }


                            for (const p in world.crates) {
                                var diffX = Math.abs(pp.position[0] - world.crates[p][0])
                                var diffY = Math.abs(pp.position[1] - world.crates[p][1])

                                if (diffX < 1.4 && diffY < 1.4 && pp.owner !== p) {
                                    players[pp.owner].scrap += 5
                                    world.crates[p] = [500, 500]
                                }
                            }


                            for (const p in this.buildings) {
                                var diffX = Math.abs(pp.position[0] - this.buildings[p].position[0])
                                var diffY = Math.abs(pp.position[1] - this.buildings[p].position[1])

                                if (diffX < 1.4 && diffY < 1.4) {
                                    this.buildings[p].health -= 20
                                    pp.dead = true
                                }
                            }





                        }
                    }

                }
                for (const build in this.buildings) {

                    var b = this.buildings[build]
                    if (!b.health <= 0) {
                        for (const p of Object.keys(players)) {
                            var diffX = Math.abs(b.position[0] - players[p].position[0])
                            var diffY = Math.abs(b.position[1] - players[p].position[1])

                            var diff = Math.sqrt(Math.pow(diffX, 2) + Math.pow(diffY, 2))

                            if (diff < 2.2 && players[p].health < players[p].maxHealth) {

                                players[p].health += 0.1

                            }



                        }
                    }

                }

                for (const [id, socket] of Object.entries(this.upgradedConnections)) {
                    try {
                        if (players[id].health <= 0) {
                            var packet = JSON.stringify({
                                "event": "gameOverEvent", "data": {
                                    position: Object.keys(players).length,

                                }

                            })
                            if (Object.keys(players).length == 1) db.addWin(id)
                            db.addCoins(id, 100 - Object.keys(players).length * 10)
                            socket.send(packet)
                            socket.close()
                            delete players[id]
                        }
                    } catch (e) {

                    }



                }




                this.misc.ticksRemaining -= 1

            }


            this.loopInt = setInterval(tick, 50)


        }


        this.registerProjectile = (p) => {
            this.projectiles.push(p)
        }
        this.alreadyEnded = false
        this.endGame = () => {
            if (this.alreadyEnded) return
            this.alreadyEnded = true
            for (const [id, socket] of Object.entries(this.upgradedConnections)) {
                var packet = JSON.stringify({
                    "event": "gameOverEvent", "data": {
                        position: 1

                    }
                })
                db.addWin(id)
                db.addCoins(id, 100)
                socket.send(packet)
                ongoingGames.shift()

            }
            delete this;

        }

        this.handleMessage = (id, d) => {
            if (!this.started) return
            var messageData = JSON.parse(d.data)
            switch (messageData.event) {
                case 'move':
                    players[id].move = messageData.data.direction
                    break;
                case 'launchProjectile':
                    var p = new Projectile(id)
                    p.position = [players[id].position[0], players[id].position[1]]
                    if (players[id].move == "left") p.direction[0] = -1
                    if (players[id].move == "right") p.direction[0] = 1
                    if (players[id].move == "up") p.direction[1] = -1
                    if (players[id].move == "down") p.direction[1] = 1
                    this.registerProjectile(p)
                    break;
                case 'build':
                    if (!players[id].scrap >= 10) return
                    players[id].scrap -= 10;
                    var x = new Building(id)
                    x.position = [~~players[id].position[0], ~~players[id].position[1]]
                    this.buildings.push(x)
                    break;
                default:
            }
        }

    }
}




class Projectile {
    constructor(owner, players) {
        this.position = [0, 0]
        this.direction = [0, 0]
        this.owner = owner
        this.ticksAlive = 0;
        this.dead = false;
    }
}


class Building {
    constructor(owner) {
        this.position = [0, 0]
        this.health = 1000
        this.owner = owner
    }
}




var globalQueue = new Queue()


module.exports = {
    ongoingGames,
    globalQueue,
    Game
}