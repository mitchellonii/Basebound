const canvas = document.querySelector("canvas")
const ctx = canvas.getContext("2d")
var cellSize = 50


var socket;
if (window.location.protocol === "https:") {
    socket = new WebSocket(`wss:${window.location.href.replace(window.location.protocol, "").replace("ws:", "")}`);
} else {
    socket = new WebSocket(`ws:${window.location.href.replace(window.location.protocol, "")}`);
}


var imgAssets = {
    characterRobotUp: createAsset("/static/characters/robot/walk-up.png"),
    characterRobotDown: createAsset("/static/characters/robot/walk-down.png"),
    characterRobotLeft: createAsset("/static/characters/robot/walk-left.png"),
    characterRobotRight: createAsset("/static/characters/robot/walk-right.png"),
    lightningProjectile: createAsset("/static/lightning.png"),
    crate: createAsset("/static/crate.png"),
    pot: createAsset("/static/hotpot.png"),
    floor: createAsset("/static/floor.png")

}

function createAsset(src) {
    var tmp = new Image()
    tmp.src = src
    return tmp
}


async function preloadAssets() {
    const promises = [];

    for (const key in imgAssets) {
        const image = imgAssets[key];

        if (image.complete && image.naturalWidth !== 0) {
            promises.push(Promise.resolve());
        } else {
            promises.push(new Promise((resolve, reject) => {
                image.onload = resolve;
                image.onerror = reject;
            }));
        }

    }

    await Promise.all(promises);

}

















const gameState = {
    state: "matchmaking",
    maxPlayers: -1,
    joinedPlayers: -1,
    countdownTime: -1,
    cameraPosition: [0, 0],
    worldSize: [70, 60],
    players: {},
    ticksRemaining: 0,
    border: [100, 100],
    projectiles: [],
    buildings: []
}



socket.onopen = () => {
    console.log("connection opened")
}

socket.onmessage = (message) => {
    var m = JSON.parse(message.data)
    messageEvent = m.event
    messageData = m.data


    switch (messageEvent) {
        case "playerJoinEvent":
            gameState.joinedPlayers = messageData.joined
            gameState.maxPlayers = messageData.max;
            break;
        case "countdownUpdateEvent":
            gameState.countdownTime = messageData.remaining;
            gameState.joinedPlayers = messageData.joined;
            gameState.maxPlayers = messageData.max;
            break;
        case "countdownAbortEvent":
            gameState.countdownTime = -1;
            gameState.joinedPlayers = messageData.joined;
            gameState.maxPlayers = messageData.max;
            break;
        case "gameBeginEvent":
            gameState.state = "active"
            gameState.countdownTime = -1;
            break;
        case "gameTickEvent":
            gameState.players = messageData.players;
            gameState.state = "active";
            gameState.secondsRemaining = messageData.misc.ticksRemaining / 20;
            gameState.worldSize = messageData.world.size
            gameState.border = messageData.world.border
            gameState.projectiles = messageData.projectiles
            gameState.crates = messageData.world.crates
            gameState.buildings = messageData.buildings
            break;
        case "selfIdEvent":
            gameState.id = messageData.id;
            break;
        case "gameOverEvent":
            window.location.href = "/game/over?position=" + messageData.position
            break

        default:
    }






}



async function renderLoop(h, first = false) {

    if (first) {
        ctx.fillStyle = `black`
        ctx.font = "68px Fortnite"
        ctx.fillText(`Loading assets...`, canvas.width / 2 - `Loading assets...`.length / 2 * 29, 400)

        await preloadAssets()
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgb(200,200,200)";

    ctx.fillRect(0, 0, canvas.width, canvas.height)

    drawGrid()
    drawWorldBorder()
    if (gameState.state == "matchmaking") drawLoadingScreen()
    else drawGame()



    requestAnimationFrame(renderLoop)
}

function physicsLoop() {
}


setInterval(physicsLoop, 200)
renderLoop(undefined, true)









function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

resizeCanvas();

window.addEventListener('resize', resizeCanvas);





function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath()

    ctx.drawImage(imgAssets.floor, gameState.cameraPosition[0], gameState.cameraPosition[1], gameState.worldSize[0] * cellSize, gameState.worldSize[1] * cellSize)
    // Loop through rows
    for (var x = 0; x <= cellSize * gameState.worldSize[0]; x += cellSize) {
        // Draw horizontal lines
        ctx.moveTo((x + gameState.cameraPosition[0]), gameState.cameraPosition[1]);
        ctx.lineTo((x + gameState.cameraPosition[0]), gameState.worldSize[1] * cellSize + (gameState.cameraPosition[1]));
    }

    // Loop through columns
    for (var y = 0; y <= cellSize * gameState.worldSize[1]; y += cellSize) {
        // Draw vertical lines
        ctx.moveTo(gameState.cameraPosition[0], (y + gameState.cameraPosition[1]));
        ctx.lineTo(gameState.worldSize[0] * cellSize + gameState.cameraPosition[0], (y + gameState.cameraPosition[1]));
    }

    // Set line color and draw the lines
    ctx.strokeStyle = 'rgba(146, 149, 152,0.3)';
    ctx.stroke();
    ctx.closePath();

}

function drawWorldBorder() {
    ctx.fillStyle = 'rgba(120,255,120,0.5)'; // Set border color
    const borderThickness = 20; // Thickness of the border in cells

    // Calculate border coordinates
    const borderLeft = gameState.cameraPosition[0] - borderThickness * cellSize + (gameState.worldSize[0] - gameState.border[0]) * cellSize / 2;
    const borderTop = gameState.cameraPosition[1] - borderThickness * cellSize + (gameState.worldSize[1] - gameState.border[1]) * cellSize / 2
    const borderRight = gameState.cameraPosition[0] + (gameState.worldSize[0] + borderThickness) * cellSize - (gameState.worldSize[0] - gameState.border[0]) * cellSize / 2
    const borderBottom = gameState.cameraPosition[1] + (gameState.worldSize[1] + borderThickness) * cellSize - + (gameState.worldSize[1] - gameState.border[1]) * cellSize / 2

    // Draw filled border
    ctx.fillRect(borderLeft + 20 * cellSize, borderTop, borderRight - borderLeft - cellSize * 40, borderThickness * cellSize); // Top border
    ctx.fillRect(borderLeft + 20 * cellSize, borderBottom - borderThickness * cellSize, borderRight - borderLeft - cellSize * 40, borderThickness * cellSize); // Bottom border
    ctx.fillRect(borderLeft, borderTop, borderThickness * cellSize, borderBottom - borderTop); // Left border
    ctx.fillRect(borderRight - borderThickness * cellSize, borderTop, borderThickness * cellSize, borderBottom - borderTop); // Right border
}






function drawLoadingScreen() {
    if (gameState.countdownTime == -1 && gameState.state == "matchmaking") {
        ctx.fillStyle = `black`
        ctx.font = "68px Fortnite"
        ctx.fillText(`${gameState.joinedPlayers}/${gameState.maxPlayers} players found...`, canvas.width / 2 - `${gameState.joinedPlayers}/${gameState.maxPlayers} players found...`.length / 2 * 29, 400)
    } else if (gameState.countdownTime !== -1 && gameState.state == "matchmaking") {
        ctx.fillStyle = `black`
        ctx.font = "68px Fortnite"
        ctx.fillText(`Starting in ${~~(gameState.countdownTime / 1000)}  (${gameState.joinedPlayers}/${gameState.maxPlayers})`, canvas.width / 2 - `Starting in ${~~(gameState.countdownTime / 1000)}  (${gameState.joinedPlayers}/${gameState.maxPlayers})`.length / 2 * 29, 400)

    }

}




function drawGame() {
    try {
        gameState.cameraPosition = [-gameState.players[gameState.id].position[0] * cellSize + canvas.width / 2 - 100, -gameState.players[gameState.id].position[1] * cellSize + canvas.height / 2 - 200]
        if (gameState.cameraPosition[0] > -3) gameState.cameraPosition[0] = -3
        if (gameState.cameraPosition[0] < -1300) gameState.cameraPosition[0] = -1300

        if (gameState.cameraPosition[1] > -3) gameState.cameraPosition[1] = -3

        if (gameState.cameraPosition[1] < -1038) gameState.cameraPosition[1] = -1038



        //draw players
        for (const p in gameState.buildings) {
            let b = gameState.buildings[p]
            if (gameState.id == b.owner && b.health > 0) {
                ctx.fillStyle = "rgba(255,255,0,.2)";
                ctx.beginPath();
                ctx.arc(b.position[0] * cellSize + gameState.cameraPosition[0] + cellSize * .5, b.position[1] * cellSize + gameState.cameraPosition[1] + cellSize * .5, 140, 0, 2 * Math.PI);
                ctx.fill()
            }
        }
        for (const player in gameState.players) {
            if (player == gameState.id) {
                ctx.fillStyle = "rgba(0,0,0,0.2)";
                ctx.beginPath();
                ctx.arc(gameState.players[player].position[0] * cellSize + gameState.cameraPosition[0] + cellSize * 1.5, gameState.players[player].position[1] * cellSize + gameState.cameraPosition[1] + cellSize * 1.5, 70, 0, 2 * Math.PI);
                ctx.fill()
            }
        }

        for (const p in gameState.crates) {
            let crate = gameState.crates[p]
            ctx.drawImage(imgAssets.crate, crate[0] * cellSize + gameState.cameraPosition[0] - 10, crate[1] * cellSize + gameState.cameraPosition[1] - 10, cellSize * 1.3, cellSize * 1.3)

        }
        for (const player in gameState.players) {
            ctx.drawImage(imgAssets[`character${gameState.players[player].character}${gameState.players[player].direction}`], gameState.players[player].position[0] * cellSize + gameState.cameraPosition[0], gameState.players[player].position[1] * cellSize + gameState.cameraPosition[1], 3 * cellSize, 3 * cellSize)


        }
        for (const player in gameState.players) {
            ctx.fillStyle = `black`
            ctx.font = "20px Fortnite"
            ctx.fillText(gameState.players[player].username, gameState.players[player].position[0] * cellSize + gameState.cameraPosition[0] + gameState.players[player].username.length * 20 / 4, gameState.players[player].position[1] * cellSize + gameState.cameraPosition[1] - 0)

            ctx.strokeStyle = "#ff7777";
            ctx.fillStyle = "#ff7777";
            // Different radii for each corner, top-left clockwise to bottom-left
            ctx.beginPath();
            ctx.roundRect(gameState.players[player].position[0] * cellSize + gameState.cameraPosition[0] + 25, gameState.players[player].position[1] * cellSize + gameState.cameraPosition[1] + 5, 100, 10, [50, 50, 50, 50]);
            ctx.fill();
            ctx.stroke();
            ctx.strokeStyle = "#77ff77";
            ctx.fillStyle = "#77ff77";
            // Different radii for each corner, top-left clockwise to bottom-left
            ctx.beginPath();
            ctx.roundRect(gameState.players[player].position[0] * cellSize + gameState.cameraPosition[0] + 25, gameState.players[player].position[1] * cellSize + gameState.cameraPosition[1] + 5, 100 * (gameState.players[player].health / gameState.players[player].maxHealth), 10, [50, 50, 50, 50]);
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = `black`
            ctx.font = "12px Fortnite"
            ctx.fillText(`${~~gameState.players[player].health}/${gameState.players[player].maxHealth}`, gameState.players[player].position[0] * cellSize + gameState.cameraPosition[0] + `${~~gameState.players[player].health}/${gameState.players[player].maxHealth}`.length * 20 / 3, gameState.players[player].position[1] * cellSize + gameState.cameraPosition[1] + 14)


        }

        for (const p in gameState.projectiles) {
            let projectile = gameState.projectiles[p]
            if (!projectile.dead) ctx.drawImage(imgAssets.lightningProjectile, projectile.position[0] * cellSize + gameState.cameraPosition[0] + cellSize, projectile.position[1] * cellSize + gameState.cameraPosition[1] + cellSize, cellSize, cellSize)

        }


        for (const p in gameState.buildings) {
            let b = gameState.buildings[p]
            if (b.health > 0) ctx.drawImage(imgAssets.pot, b.position[0] * cellSize + gameState.cameraPosition[0] - 12, b.position[1] * cellSize + gameState.cameraPosition[1] - 22, cellSize * 1.5, cellSize * 1.6)

        }
        for (const p in gameState.buildings) {
            if (gameState.buildings[p].health > 0) {
                let b = gameState.buildings[p]
                ctx.strokeStyle = "#ff7777";
                ctx.fillStyle = "#ff7777";
                // Different radii for each corner, top-left clockwise to bottom-left
                ctx.beginPath();
                ctx.roundRect(b.position[0] * cellSize + gameState.cameraPosition[0] - 25, b.position[1] * cellSize + gameState.cameraPosition[1] - 25, 100, 10, [50, 50, 50, 50]);
                ctx.fill();
                ctx.stroke();
                ctx.strokeStyle = "#77ff77";
                ctx.fillStyle = "#77ff77";
                // Different radii for each corner, top-left clockwise to bottom-left
                ctx.beginPath();
                ctx.roundRect(b.position[0] * cellSize + gameState.cameraPosition[0] - 25, b.position[1] * cellSize + gameState.cameraPosition[1] - 25, 100 * (b.health / 1000), 10, [50, 50, 50, 50]);
                ctx.fill();
                ctx.stroke();
                ctx.fillStyle = `black`
                ctx.font = "12px Fortnite"
                ctx.fillText(`${~~b.health}/${1000}`, b.position[0] * cellSize + gameState.cameraPosition[0] + `${~~b.health}/${1000}`.length * 20 / 3 - 60, b.position[1] * cellSize + gameState.cameraPosition[1] - 16)

            }
        }



        //time
        ctx.fillStyle = `black`
        ctx.font = "20px Fortnite"
        var t = new Date(gameState.secondsRemaining * 1000).toISOString().substring(14, 19)
        ctx.fillText(t, canvas.width / 2 - t.length * 20 / 2, 50)


        ctx.fillText(`${gameState.players[gameState.id].scrap} scrap`, 10, 50)


    } catch (e) {
        console.log(e)
    }
}




var keysHeld = []


document.addEventListener('keydown', function (event) {

    keysHeld[event.key] = true

    // Check if the pressed key is W, A, S, or D
    if (event.key === 'w' || event.key === 'W') {
        socket.send(JSON.stringify({ "event": "move", "data": { "direction": "up" } }))
    } else if (event.key === 'a' || event.key === 'A') {
        socket.send(JSON.stringify({ "event": "move", "data": { "direction": "left" } }))
    } else if (event.key === 's' || event.key === 'S') {
        socket.send(JSON.stringify({ "event": "move", "data": { "direction": "down" } }))
    } else if (event.key === 'd' || event.key === 'D') {
        socket.send(JSON.stringify({ "event": "move", "data": { "direction": "right" } }))
    } else if (event.key === " " || event.key == "space") {
        socket.send(JSON.stringify({ "event": "launchProjectile", "data": {} }))
    }
    else if (event.key === " " || event.key == "Enter") {
        socket.send(JSON.stringify({ "event": "build", "data": {} }))
    }
});


document.addEventListener("keyup", function (event) {
    keysHeld[event.key] = false

    if (!keysHeld['w'] && !keysHeld['W'] && !keysHeld['A'] && !keysHeld['a'] && !keysHeld['s'] && !keysHeld['S'] && !keysHeld['d'] && !keysHeld['D']) socket.send(JSON.stringify({ "event": "move", "data": { "direction": "still" } }))

})