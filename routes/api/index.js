const express = require('express');
const router = express.Router()

const db = require("../../db")





const account = require("./account")

router.use("/account", account)



module.exports = router