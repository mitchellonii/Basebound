const mongoose = require('mongoose');
require("dotenv").config();

const db = mongoose.createConnection(process.env.MONGODB_URL_DATA);
db.on('error', console.error.bind(console, 'connection error:'));



var User

db.once('open', function () {
    const userSchema = new mongoose.Schema({
        GID: String,
        username: String,
        characters: Object,
        builds: Object,
        coins: Number,
        gems: Number,
        wins: Number,


    });
    User = db.model('User', userSchema);
});


async function login(GID) {
    var u = await User.findOne({ GID: GID })
    if (u == null) {
        var nu = new User({
            GID: GID,
            username: process.env.DEFAULT_NAME,
            characters: { case: 0 },
            builds: { wall: 0 },
            coins: 0,
            gems: 100,
            wins: 0
        })

        nu.save()
        return nu
    }
    else return u
}

async function rename(GID, name) {
    var u = await User.findOne({ GID: GID })
    if (u == null) return
    u.username = name
    u.save()
    return u
}

async function addWin(GID) {
    var u = await User.findOne({ GID: GID })
    if (u == null) return
    u.wins += 1
    u.save()
    return u
}
async function addCoins(GID, amount) {
    var u = await User.findOne({ GID: GID })
    if (u == null) return
    u.coins += amount
    u.save()
    return u
}



module.exports = {
    login,
    rename,
    addWin,
    addCoins
}