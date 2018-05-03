'use strict';

const Discord = require('discord.js');
const bot = new Discord.Client();
const mtg = require('mtgsdk');
const ytdl = require('ytdl-core');
var express = require('express');
const fs = require('fs');
var app = express();
var bodyParser = require('body-parser');
const opus = require('node-opus');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
//var lame = require('lame');
const recordingsPath = './recordings';
const decode = require('./decodeOpus.js');
const WitSpeech = require('node-witai-speech');

var isReady = true;
const streamOptions = {
  seek: 0,
  volume: .5
}

var listenStreams = new Map();

const rate = 48000;
const frame_size = 1920;
const channels = 2;
var listenReceiver = null;

//Songs = require('./models/songs');


//Alert for when bot is online
bot.on('ready', () => {
  console.log('I am ready!');
  //app.listen(3000);
  console.log('running on port 3000');
  // JoinChannel('374375554268397568');
  // let channel = bot.channels.get('374375554268397568');

  var JoinChannel = function(id) {
    let channel = bot.channels.get(id);
    channel.join()
      .then(function(connection) {

        //Rage Quit
        bot.on('voiceStateUpdate', (oldMember, newMember) => {
          let newUserChannel = newMember.voiceChannel
          let oldUserChannel = oldMember.voiceChannel
          if (isReady) {
            if (oldUserChannel === undefined && newUserChannel !== undefined) {

            } else if (newUserChannel === undefined) {
              isReady = false;
              const stream = ytdl('https://www.youtube.com/watch?v=2LXRKTjpDm8', {
                filter: 'audioonly'
              });

              const dispatcher = connection.playStream(stream, streamOptions);
              dispatcher.on("end", end => {
                isReady = true;
              });
            }
          }
        })


        bot.on('message', message => {
          //Generic !Dave command
          if (message.content.toLowerCase() === '!dave') {
            var rando = randomIntInc(1, 3);
            if (rando === 1) {
              message.reply('solo que');
              message.channel.send("solo quee", {
                tts: true
              })
            } else if (rando === 2) {
              message.reply('lingerie');
            } else {
              message.reply('*Ice cubes clattering in a glass*');
            }

          }

          if (message.content.toLowerCase().indexOf('!dave play') > -1) {
            playHype(message.content.split(' ')[message.content.split(' ').length - 1], '30s', 30);
          }


          //This seems to fail randomly
          if (message.content.toLowerCase() === '!dave mtg') {
            var rando22 = randomIntInc(1, 5000);

            mtg.card.find(rando22, 'all')
              .then(result2 => {
                const embed = new Discord.RichEmbed()
                  .setTitle(result2.card.name)
                  .setColor(0x00AE86)
                  .setDescription(result2.card.name)
                  .setImage(result2.card.imageUrl)
                  .setTimestamp()

                message.channel.send({
                  embed
                });
                return result2.card;
              });
          }

          if (message.content.toLowerCase() === '!dave hype' && message.author.username === "Dnoop") {
            var counter = 30;
            message.channel.send('Calling all Fraggers ');
            var rando = randomIntInc(1, 3);

            if (rando === 1) {
              playHype('https://www.youtube.com/watch?v=ze5W8cDHcsQ', "26s", 30);
            } else if (rando === 2) {
              playHype('https://www.youtube.com/watch?v=GoCOg8ZzUfg', "50s", 40)
            } else if (rando === 3) {
              playHype('https://www.youtube.com/watch?v=VDvr08sCPOc', '0s', 30)
            }
          }

          if (message.content.toLowerCase() === "!dave join") {

          }

        })



        function randomIntInc(low, high) {
          return Math.floor(Math.random() * (high - low + 1) + low);
        }

        function playHype(link, start, length, level = false) {
          var counter = length;
          const stream = ytdl(link, {
            begin: start,
          });
          console.log(streamOptions);
          const dispatcher = connection.playStream(stream, {
            seek: 0,
            volume: 0.1
          });
          var timer = setInterval(function() {
            counter--;
            if (counter === 0) {
              dispatcher.end();
              clearInterval(counter);
            }
          }, 1000);

        }



      }).catch(console.log);
  }
  //JoinChannel('189914746408009728');
  JoinChannel('189914746408009728');
  // 374375554268397568
  // JoinChannel('374375554268397568');
});
//374375554268397568


bot.login('MzM3MzU5Mjc0MjQwMTE0Njg4.DFJJ4w.TKEe--uuNwNhluzoWNFsfHafHwo');
// bot.login('Mzc0NzQ4ODY3MTQ2ODA5MzQ0.DNl0Rg.4oS3OZs_VHpaWQlDNQDBkhZ866E');