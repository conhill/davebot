// var mongoose = require('mongoose');

// var songsSchema = mongoose.Schema({
// 	link:{
// 		type: String,
// 		required: true
// 	},
// 	command:{
// 		type: String,
// 		required: true
// 	}
// });

// var Songs = module.exports = mongoose.model('Songs', songsSchema);

// //Get sound
// module.exports.getSong = function(callback, limit){
// 	Songs.find(callback).limit(limit);
// }

// module.exports.saveSong = function(song, callback){
// 	Songs.create(song, callback);
// }