const express = require('express');
const router = express.Router()

const db = require("../../db")
const game = require("../../game/main.js")
var globalWs;

router.get("/join", (req, res) => {
    var gameId = game.globalQueue.join(req.session.passport.user.id)
    res.redirect(`/game/play/${gameId}`)
})



router.get("/play/:id", (req, res) => {
    var g = game.ongoingGames.filter(h => h.id == req.params.id)
    if (g[0] == undefined) res.redirect("/")
    else if (!g[0].playersJoining.includes(req.session.passport.user.id)) res.send(401)
    else res.render("player", {})
})

router.ws("/play/:id", (ws, req) => {
    var g = game.ongoingGames.filter(h => h.id == req.params.id)
    if (!g[0].playersJoining.includes(req.session.passport.user.id)) return ws.close()


    //user is part of the game, initialise connection

    ws.forGame = req.params.id //used to bc data to



    g[0].upgradedConnections[req.session.passport.user.id] = ws



    g[0].confirmJoin(req.session.passport.user.id)


    ws.onclose = () => {
        delete g[0].upgradedConnections[req.session.passport.user.id];
        g[0].confirmLeave(req.session.passport.user.id)
    }
    ws.send(JSON.stringify({
        "event": "selfIdEvent", "data": { "id": req.session.passport.user.id }
    }))
    ws.onmessage = (m) => {
        g[0].handleMessage(req.session.passport.user.id, m)
    }
})


router.get("/over", (req, res) => {
    res.render("over", {})
})


module.exports = (ws) => {
    globalWs = ws
    return router
}