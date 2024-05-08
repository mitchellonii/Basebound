const express = require('express');
const router = express.Router()
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const db = require("../../../db")




router.get('/', async (req, res) => {
    res.json(await db.login(req.session.passport.user.id))
})

router.post('/rename', express.json(), async (req, res) => {
    var u = await db.rename(req.session.passport.user.id, req.body.name)
    res.json(u)
})

router.get("/pfp", async (req, res) => {
    var url = req.session.passport.user.pfp
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error('Failed to fetch image');
    }
    const imageBuffer = await response.buffer();

    res.set('Content-Type', response.headers.get('content-type'));

    res.send(imageBuffer);

})

module.exports = router