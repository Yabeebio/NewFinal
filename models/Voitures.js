const mongoose = require('mongoose');

const voitureSchema = mongoose.Schema({
    marque : {type: String, required : true},
    modele : {type: String, required : true},
    immat : {type: String, required : true, unique : true},
    serie : {type: String, required : true, unique : true},
})

module.exports = mongoose.model('Voiture', voitureSchema);