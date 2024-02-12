const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    marque : {type: String, required : true},
    modele : {type: String, required : true},
    immat : {type: String, required : true, unique : true},
    serie : {type: String, required : true, unique : true},
    rent : {type: Boolean}
})

module.exports = mongoose.model('User', userSchema);