const mongoose = require('mongoose');

const venteSchema = mongoose.Schema({
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
})

module.exports = mongoose.model('Vente', venteSchema);