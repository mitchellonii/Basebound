const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const MongoStore = require('connect-mongo');
const path = require("path")
const db = require("./db")

var session = require('express-session');

require('dotenv').config()
const app = express();
var expressWs = require('express-ws')(app);

app.set('views', './views');
app.set('view engine', 'ejs');






app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URL_SESSIONS })
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'http://localhost:5041/auth/callback' // Replace with  callback URL
},
    (accessToken, refreshToken, profile, done) => {
        return done(null, { id: profile.id, pfp: profile.photos[0].value });
    }
));
passport.serializeUser(function (user, done) {
    done(null, user);
});

passport.deserializeUser(function (user, done) {
    done(null, user);
});

function checkAuth(req, res, next) {
    if (req.isAuthenticated()) next()
    else res.redirect("/auth")
}







app.get('/', checkAuth, async (req, res) => {
    res.render('index', { user: await db.login(req.session.passport.user.id) });
});

app.get('/auth',
    passport.authenticate('google', { scope: ['email'] })
);

app.get('/auth/callback',
    passport.authenticate('google', { failureRedirect: '/auth' }),
    (req, res) => {
        res.redirect('/');
    }
);

app.get('/logout', (req, res) => {
    req.logout(() => {
        res.redirect('/');
    });
});

app.get("/favicon.ico", (req, res) => {
    res.sendFile(path.join(__dirname, 'favicon.ico'))
})



const api = require("./routes/api")
const game = require("./routes/game")(expressWs)

app.use('/api', checkAuth, api)
app.use("/game", checkAuth, game)


app.use("/static", express.static("./static"))





const PORT = process.env.PORT || 5041;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});




