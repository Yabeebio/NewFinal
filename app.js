const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const multer = require('multer');
const multerS3 = require('multer-s3');
const AWS = require('aws-sdk');
const mongoose = require('mongoose');
const cors = require('cors');
const methodOverride = require('method-override');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const { createTokens, validateToken } = require('./JWT');
const User = require('./models/User');
const Vente = require('./models/Vente');
const Support = require('./models/Support');
const { jwtDecode } = require('jwt-decode');

// Configuration AWS
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
    region: process.env.AWS_REGION
});

// Configuration du middleware Multer pour le stockage S3
const upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: process.env.AWS_S3_BUCKET_NAME,
        acl: 'public-read',
        metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            cb(null, Date.now().toString() + '-' + file.originalname);
        }
    })
});

// Connexion MongoDB
require('dotenv').config();
const url = process.env.DATABASE_URL;
mongoose.connect(url)
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.log(err));

app.set('view engine', 'ejs');

// Accès aux données du host:5000
app.use(cors({ credentials: true, origin: process.env.FRONTEND_URL }));

// Method put & delete pour express (pas reconnu nativement)
app.use(methodOverride('_method'));

// Middleware pour parser les données du corps des requêtes
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Middleware pour parser les cookies
app.use(cookieParser());

// INSCRIPTION
app.post('/api/inscription', function (req, res) {
    const userData = {
        nom: req.body.nom,
        prenom: req.body.prenom,
        email: req.body.email,
        password: bcrypt.hashSync(req.body.password, 10),
        tel: req.body.tel,
        admin: req.body.admin
    };

    const newUser = new User(userData);

    newUser.save()
        .then(() => {
            console.log("User saved");
            res.redirect(process.env.FRONTEND_URL + '/connexion');
        })
        .catch(err => { console.log(err); });
});

// CONNEXION
app.post('/api/connexion', function (req, res) {
    User.findOne({
        email: req.body.email
    })
        .then(user => {
            if (!user) {
                console.log("No user found for email:", req.body.email);
                return res.status(404).send("No user found for the provided email.");
            }
            if (!bcrypt.compareSync(req.body.password, user.password)) {
                console.log("Invalid password for email:", req.body.email);
                return res.status(401).send("Invalid password for the provided email.");
            }

            const accessToken = createTokens(user);
            res.cookie("access_token", accessToken, {
                maxAge: 1000 * 60 * 60 * 24 * 30, // 30 jours en ms
                httpOnly: true,
                secure: true,
                sameSite: 'None',
                path: '/'
            });
            console.log("Successfully logged in");
            res.redirect(process.env.FRONTEND_URL);
        })
        .catch(error => {
            res.status(500).send("Internal Server Error");
        });
});

// GET USER
app.get("/profile/:id", (req, res) => {
    User.findOne({
        _id: req.params.id
    })
        .then((data) => {
            res.json(data);
        })
        .catch((error) => {
            res.status(404).json({ error: error });
        });
});

// UPDATE
app.put('/profile/:id', (req, res) => {
    const userData = {
        nom: req.body.nom,
        prenom: req.body.prenom,
        email: req.body.email,
        password: req.body.password,
        tel: req.body.tel
    };

    User.updateOne({
        _id: req.params.id
    }, { $set: userData })
        .then(() => {
            res.redirect(process.env.FRONTEND_URL + '/profile/' + req.params.id);
        })
        .catch((error) => {
            console.log(error);
            res.status(500).json({ success: false, message: 'Internal Server Error' });
        });
});

// DELETE PROFILE
app.delete('/deleteuser/:id', (req, res) => {
    User.findOneAndDelete({ _id: req.params.id })
        .then(() => {
            console.log("User deleted successfully");
            res.redirect("https://lime-easy-beaver.cyclic.app/logout");
        })
        .catch((error) => {
            console.log(error);
        });
});

// ADD FOR SALES
app.post('/addSales', upload.array('images', 50), function (req, res) {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
    }

    const images = req.files.map(file => file.originalname);

    const venteData = {
        vehicule: req.body.vehicule,
        immat: req.body.immat,
        serie: req.body.serie,
        kilometrage: req.body.kilometrage,
        annee: req.body.annee,
        energie: req.body.energie,
        puissance: req.body.puissance,
        ville: req.body.ville,
        code: req.body.code,
        description: req.body.description,
        prix: req.body.prix,
        images: images
    };

    const newVente = new Vente(venteData);

    newVente.save()
        .then(() => {
            console.log("Car saved successfully");
            res.json({ redirect: '/buy' });
        })
        .catch(error => {
            console.error(error);
            res.status(500).json({ error: "Internal Server Error" });
        });
});

// GET ALL SALES
app.get('/allsales', function (req, res) {
    Vente.find()
        .then((data) => {
            res.json(data);
        })
        .catch((error) => {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        });
});

// HISTORIQUE DES ANNONCES DE L'UTILISATEUR
app.get('/api/annonces', validateToken, (req, res) => {
    const userId = req.user.id;
    Vente.find({ userId: userId })
        .then((annonces) => {
            res.json(annonces);
        })
        .catch((error) => {
            console.error('Error retrieving user annonces:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        });
});

// RECUPERER UNE SEULE ANNONCE SELON L'ID
app.get('/sale/:id', function (req, res) {
    Vente.findOne({
        _id: req.params.id
    })
        .then((data) => {
            if (!data) {
                return res.status(404).json({ error: 'Sale not found' });
            }
            res.json(data);
        })
        .catch((error) => {
            console.error('Error retrieving sale:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        });
});

// RECHERCHE VEHICULE
app.get('/api/search', async (req, res) => {
    const query = req.query.query;
    try {
        const results = await Vente.find({ vehicule: { $regex: query, $options: 'i' } });
        res.json(results);
    } catch (error) {
        console.error('Error searching for vehicles:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ADD MESSAGE
app.post('/api/contacter', function (req, res) {
    const supportData = {
        email: req.body.email,
        message: req.body.message
    };

    const newSupport = new Support(supportData);

    newSupport.save()
        .then(() => {
            console.log('Message sended');
            res.redirect("https://frontend-final-five.vercel.app/");
        })
        .catch((error) => {
            console.log(error);
            res.status(500).json({ error: "Internal Server Error" });
        });
});

// GET ALL MESSAGES
app.get('/allmessages', function (req, res) {
    Support.find()
        .then((data) => {
            res.json(data);
        })
        .catch((error) => {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        });
});

// DELETE MESSAGE
app.delete('/deletemessage/:id', (req, res) => {
    Support.findOneAndDelete({ _id: req.params.id })
        .then(() => {
            console.log("Message deleted successfully");
            res.redirect("https://frontend-final-five.vercel.app/");
        })
        .catch((error) => {
            console.log(error);
            res.status(500).json({ error: "Internal Server Error" });
        });
});

// GET ALL USERS
app.get('/allusers', function (req, res) {
    User.find()
        .then((data) => {
            res.json(data);
        })
        .catch((error) => {
            console.error(error);
            res.status(500).json({ error: 'Internal Server Error' });
        });
});

// DELETE USER BY ADMIN
app.delete('/deletethisuser/:id', (req, res) => {
    User.findOneAndDelete({ _id: req.params.id })
        .then(() => {
            console.log("This user has been deleted successfully");
            res.redirect("https://frontend-final-five.vercel.app/panelcontrol");
        })
        .catch((error) => {
            console.log(error);
            res.status(500).json({ error: "Internal Server Error" });
        });
});

// LOGOUT
app.get('/logout', (req, res) => {
    res.clearCookie("access_token");
    res.redirect(process.env.FRONTEND_URL);
});

// Get JWT
app.get('/getJwt', validateToken, (req, res) => {
    console.log('Requête vers /getJwt reçue');
    res.json(jwtDecode(req.cookies['access_token']));
});

const port = process.env.PORT || 5000;
const server = app.listen(port, function () {
    console.log("Server listening on port " + port);
});
