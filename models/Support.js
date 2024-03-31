const mongoose = require('mongoose');

const supportSchema = mongoose.Schema({
    email : {type: String, required : true},
    message : {type: String, required : true}, 
})

module.exports = mongoose.model('Support', supportSchema);