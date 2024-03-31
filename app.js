var express = require('express');
var app = express();

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', 'https://frontend-final-five.vercel.app'); // Autoriser l'accès depuis n'importe quelle origine
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE'); // Autoriser les méthodes HTTP
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Autoriser certains en-têtes
    next();
});

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
app.use(cors({ credentials: true, origin: process.env.FRONTEND_URL }));

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
/* app.use(express.static('uploads')); */
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/') // DESTINATION DES IMAGES
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname); // CHANGER LE NOM DES IMAGES
    }
});

const upload = multer({ storage: storage });


// MODELE SETUP
const User = require('./models/User');
const Vente = require('./models/Vente');
const Support = require('./models/Support');

const { jwtDecode } = require('jwt-decode');

// INSCRIPTION

app.post('/api/inscription', function (req, res) {
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

            const accessToken = createTokens(user)
            res.cookie("access_token", accessToken, {
                maxAge: 1000 * 60 * 60 * 24 * 30, // 30 jours en ms
                httpOnly: true,
                secure: true,
                sameSite: 'None',
                path: '/'
            });
            console.log("Successfully logged in");
            res.redirect(process.env.FRONTEND_URL)
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
        })
});

// UPDATE

app.put('/profile/:id', (req, res) => {
    const Data = {
        nom: req.body.nom,
        prenom: req.body.prenom,
        email: req.body.email,
        password: req.body.password,
        tel: req.body.tel
    }

    User.updateOne({
        _id: req.params.id
    }, { $set: Data })
        .then(() => {
            /* res.json({ success: true, message: 'Profile updated successfully' }); */
            res.redirect(process.env.FRONTEND_URL + '/profile/' + req.params.id)
        })
        .catch((error) => {
            console.log(error);
            res.status(500).json({ success: false, message: 'Internal Server Error' });
        })
})

// DELETE PROFILE

app.delete('/deleteuser/:id', (req, res) => {
    User.findOneAndDelete({ _id: req.params.id })
        .then(() => {
            console.log("User deleted successfully");
            /* res.redirect(process.env.FRONTEND_URL) */
            res.redirect("https://lime-easy-beaver.cyclic.app/logout")
        })
        .catch((error) => {
            console.log(error);
        })
})

// POUR REDIMENSIONNER LES IMAGES RECUS

const sharp = require('sharp');

// ADD FOR SALES

app.post('/addSales', upload.array('images', 50), function (req, res) {
    if (!req.files || !req.files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
    }

    const images = req.files.map(file => file.originalname);

    req.files.forEach(file => {
        sharp(file.path)
            .resize({ width: 800, height: 600 }) // spécifiez les dimensions souhaitées
            .toFile('uploads/resized_' + file.originalname, (err, info) => {
                if (err) {
                    console.error("Error resizing image:", err);
                } else {
                    console.log("Resized image saved:", info);
                }
            });
    });

    const Data = new Vente({
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
    });

    Data.save()
        .then(() => {
            console.log("Car saved successfully");
            res.json({ redirect: '/buy' });
            /* res.redirect('http://localhost:3000/buy'); */
            /* res.status(200).json({result: 'Car saved successfully'}); */
        })
        .catch(error => {
            console.error(error);
            res.status(500).json({ error: "Internal Server Error" })
        })
});

app.get('/allsales', function (req, res) {
    Vente.find()
        .then((data) => {
            res.json(data);
        })
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
    const Data = new Support({
        email: req.body.email,
        message: req.body.message
    })

    Data.save()
        .then(() => {
            console.log('Message sended')
            /* res.redirect("http://localhost:3000/") */
            res.redirect("https://frontend-final-five.vercel.app/")
        })
        .catch((error) => {
            console.log(error);
        })
});

app.get('/allmessages', function (req, res) {
    Support.find()
        .then((data) => {
            res.json(data);
        })
});

// DELETE MESSAGE

app.delete('/deletemessage/:id', (req, res) => {
    Support.findOneAndDelete({ _id: req.params.id })
        .then(() => {
            console.log("Message deleted successfully");
            /* res.redirect("http://localhost:3000/message"); */
            res.redirect("https://frontend-final-five.vercel.app/")
        })
        .catch((error) => {
            console.log(error);
            res.status(500).json({ error: "Internal Server Error" });
        });
});


app.get('/allusers', function (req, res) {
    User.find()
        .then((data) => {
            res.json(data);
        })
});

// DELETE USER BY ADMIN

app.delete('/deletethisuser/:id', (req, res) => {
    User.findOneAndDelete({ _id: req.params.id })
        .then(() => {
            console.log("This user has been deleted successfully");
            /* res.redirect("http://localhost:3000/panelcontrol"); */
            res.redirect("https://frontend-final-five.vercel.app/panelcontrol");
        })
        .catch((error) => {
            console.log(error);
            res.status(500).json({ error: "Internal Server Error" });
        });
});


app.get('/logout', (req, res) => {
    res.clearCookie("access_token");
    res.redirect(process.env.FRONTEND_URL)
});

app.get('/getJwt', validateToken, (req, res) => {
    console.log('Requête vers /getJwt reçue');
    res.json(jwtDecode(req.cookies['access_token']));
});

var server = app.listen(5000, function () {
    console.log("Server listening on port 5000");
});