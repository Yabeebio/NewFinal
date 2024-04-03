const mongoose = require('mongoose');

const venteSchema = mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId, // Type ObjectId pour stocker l'ID de l'utilisateur
        ref: 'User' // Référence à votre modèle User pour associer l'annonce à un utilisateur
    },
    vehicule: { type: String, required: true },
    immat: { type: String, required: true, unique: true },
    serie: { type: String, required: true, unique: true },
    kilometrage: { type: Number, required: true },
    annee: { type: Date, required: true },
    energie: { type: String, required: true },
    puissance: { type: Number, required: true },
    ville: { type: String, required: true },
    code: { type: Number, required: true },
    description: { type: String },
    prix: { type: Number, required: true },
    images: { type: [String] },
});

module.exports = mongoose.model('Vente', venteSchema);