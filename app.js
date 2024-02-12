var express = require('express');
var app = express();

var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
require('dotenv').config();

// Connexion MongoDB
var mongoose = require('mongoose');
const url = process.env.DATABASE_URL;

mongoose.connect(url)
    .then(console.log("Mongodb connected"))
    .catch(err => console.log(err));

app.set('view engine', 'ejs');

// Accès aux données du host:5000
const cors = require('cors');
app.use(cors({ credentials : true, origin: process.env.FRONTEND_URL }));

// Method put & delete pour express (pas reconnu nativement)
const methodOverride = require('method-override');
app.use(methodOverride('_method'));

// Bcrypt : Pour hasher les mots de passes
const bcrypt = require('bcrypt');

// Cookie parser

const cookieParser = require('cookie-parser');
app.use(cookieParser());

// Import JWT (Token)
const { createTokens, validateToken } = require('./JWT');

// Multer
const multer = require('multer');
app.use(express.static('uploads'));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/') // DESTINATION DES IMAGES
    },
    filename : (req, file, cb) => {
        cb(null, file.originalname); // CHANGER LE NOM DES IMAGES
    }
});

const upload = multer({ storage });





// USER SETUP
const User = require('./models/User');
const { jwtDecode } = require('jwt-decode');

// INSCRIPTION

app.post('/api/inscription', function (req, res){
    const Data = new User({
        nom: req.body.nom,
        prenom: req.body.prenom,
        email: req.body.email,
        password: bcrypt.hashSync(req.body.password, 10),
        tel: req.body.tel,
        admin: req.body.admin
    })

    Data.save()
        .then(() => {
            console.log("User saved");
            res.redirect(process.env.FRONTEND_URL + '/connexion');
        })
        .catch(err => { console.log(err);});
});

// CONNEXION

app.post('/api/connexion', function (req, res){
    User.findOne({
        username: req.body.username
    })
    .then(user => {
        if (!user){
            return res.status(404).send("No user found");
        }
        if (!bcrypt.compareSync(req.body.password, user.password)){
            return res.status(404).send("Invalid password");
        }

    const accessToken = createTokens(user)
    res.cookie("access_token", accessToken, {
        maxAge: 1000 * 60 * 60 * 24 * 30, // 30 jours en ms
        httpOnly: true
    });
    res.redirect(process.env.FRONTEND_URL)
    })
    .catch(error => { console.log(error); });

});

app.get('/logout', (req, res) => {
    res.clearCookie("access-token");
    res.redirect(process.env.FRONTEND_URL)
});

app.get('/getJwt', validateToken, (req, res) => {
    res.json(jwtDecode(req.cookies['access_token']));
});

var server = app.listen(5000, function () {
    console.log("Server listening on port 5000");
});