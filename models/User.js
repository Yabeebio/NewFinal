const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    nom : {type: String, required : true},
    prenom : {type: String, required : true},
    email : {type: String, required : true, unique : true},
    password : {type: String, required : true},
    tel : {type: String, required : true},
    admin : {type: Boolean, default: false}
})

module.exports = mongoose.model('User', userSchema);