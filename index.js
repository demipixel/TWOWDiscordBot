const config = require('config');
const DiscordClient = require('discord.io');
const moment = require('moment');
const emoji = require('node-emoji');
const mathjs = require('mathjs');
const CleverBot = require('cleverbot-node');
const Youtube = require('youtube-api');

const bot = new DiscordClient({
    autorun: true,
    token: config.get('discord.token'),
});

const clever = new CleverBot();
CleverBot.prepare(function() {
  console.log('CleverBot is online');
});

const auth = Youtube.authenticate({
  type: 'key',
  key: config.get('youtube.key')
});

const localData = require('./lib/data')('./data');
var mini;

var mainServer;
const chat = (id, message, noEmoji) => {
  bot.sendMessage({
    to: id,
    message: !noEmoji ? emoji.emojify(message) : message
  });
};
const idFromName = (name) => {
  name = name.replace(/[@<>]/g, '').toLowerCase().trim();
  return Object.keys(mainServer.members).reduce((chosen, id) => {
    return (mainServer.members[id].nick || '').toLowerCase() == name || id == name || id == name.slice(1) ? id.trim() : chosen;
  }, null);
}
const channelFromName = (name) => {
  return Object.keys(mainServer.channels).reduce((chosen, id) => {
    return mainServer.channels[id].name == name ? id : chosen;
  }, null);
}
const chooseRandom = (arr) => {
  return arr[Math.floor(Math.random()*arr.length)];
}
const DEMIPIXEL_ID = '125696820901838849';

bot.on('ready', function() {
  console.log(bot.username + ' [' + bot.id + '] has started up!');
  mainServer = bot.servers[config.get('discord.server')];
  mini = require('./lib/mini')(mainServer, chat, localData, idFromName, bot, clever, DEMIPIXEL_ID);

  bot.setPresence({
    game: 'Mini TWOW'
  });
});

bot.on('disconnect', bot.connect);

bot.on('message', function(user, userID, channelID, message, rawEvent) {
  if (!mainServer) return;
  var channel = mainServer.channels[channelID];
  if (!channel) channel = bot.directMessages[channelID];
  if (!channel) return;
  var pm = !channel.name;
  if (!pm) console.log('['+userID+']', user, channel.name+':', message);
  else console.log('['+userID+']', user, 'PM:', message);
  if (userID == bot.id) return;
  if (pm) parsePM(user, userID, channelID, message, rawEvent);

  var math = null;
  var mathError = null;
  try {
    math = mathjs.eval(message.replace('!debug ', '').trim(), {});
  } catch (e) {
    mathError = e;
  }

  if (message == '!hey') {
    chat(channelID, 'Hey there, <@'+userID+'>!');
  } else if (message == '!info') {
    chat(channelID, 'Hey! I\'m the TWOW Discord Bot created by <@'+DEMIPIXEL_ID+'>! Send any suggestions or feedback to him :)');
  } else if (message == '!hug' || message.indexOf('!hug ') == 0) {
    var match = message.match(/!hug (.*)/);
    var name = (match ? match[1] : '').replace(/[@<>]/g, '');
    var id = idFromName(name);
    if (!match || !match[1]) chat(channelID, '<@'+userID+'> hugs himself!');
    else if (!id) chat(channelID, '<@'+userID+'> couldn\'t find '+name+' in the room so he hugs himself!');
    else if (id == userID) chat(channelID, '<@'+userID+'> gives himself a big warm hug!');
    else if (id == bot.id) chat(channelID, 'I wuv you too, <@'+userID+'>');
    else chat(channelID, '<@'+userID+'> hugs <@'+id+'>!');
  } else if (message.match(/!joined .+/)) {
    var match = message.match(/!joined (.+)/);
    var id = idFromName(match[1]);
    if (id == null) chat(channelID, 'Couldn\'t find '+match[1].replace(/[@<>]/g, '')+'!');
    else chat(channelID, '<@'+id+'> joined this discord '+moment(mainServer.members[id].joined_at).fromNow()+'.');
  } else if ((math !== null || message.indexOf('!debug') == 0) && (math != undefined ? math.toString() : '') != message.replace(/"/g, '')) {
    var show = message.indexOf('!debug') == 0;
    sayMath(userID, message, math, show ? mathError : null, channelID, show);
  } else if (message == '!git') {
    chat(channelID, 'https://github.com/demipixel/TWOWDiscordBot');
  } else if (message == '!help') {
    chat(channelID, '`!hey, !info, !git, !hug <user>, !joined <user>, any math expression, !debug <math expr>, !chat`');
  } else if (message.match(/^!chat .+/)) {
    sayCleverBot(message.match(/!chat (.+)/)[1], userID, channelID);
  } else if (message.match(/^!bet .+/)) {
    chat(channelID, 'Lol gotcha');
  } else if (message.match(/^!mini/i)) {
    mini.message(user, userID, channelID, message.replace('!mini', '').trim(), pm);
  } else if (pm && (message.toLowerCase() == 'a' || message.toLowerCase() == 'b' || message.toLowerCase() == 'next')) {
    mini.message(user, userID, channelID, message, pm);
  }
});

function parsePM(user, userID, channelID, message, rawEvent) {
  if (userID != DEMIPIXEL_ID) return;
  if (message.indexOf('say ') == 0) {
    var match = message.match(/say ([^ ]+) (.+)/);
    if (!match) {
      chat(userID, 'Format: `say <channel> <message>`');
      return;
    }
    var channel = channelFromName(match[1]);
    if (!channel) {
      chat(userID, 'That is not a valid channel!');
      return;
    }
    chat(channel, match[2]);
  }
}




var sayMath = (userID, str, math, mathError, channelID, debug) => {
  if (mathError) {
    chat(channelID, '<@'+userID+'>: '+mathError);
    return;
  } else if (math == null) return;
  else if (str == 'e' && !debug) return;
  if (math.entries) {
    math = math.entries;
    var output = math.reduce((str, m) => {
      if (typeof m != 'function' || debug) return str + m.toString() + '\n';
      else return str;
    }, '');
    var arr = output.split('\n');
    if (output) chat(channelID, '<@'+userID+'>\n'+arr.slice(0, 5).map(str=>str.trim().slice(0,900).trim()+(str.trim().length > 900 ? '...' : '')).join('\n')+(arr.length > 5 ? '\n...' : ''));
  } else if (typeof math != 'function' || debug) {
    chat(channelID, '<@'+userID+'>: '+math);
  }
}

var sayCleverBot = (str, userID, channelID) => {
  clever.write(str, (resp) => {
    if (!resp) {
      chat(channelID, '<@'+userID+'>, I don\'t know how to respond...');
    }
    else chat(channelID, '<@'+userID+'>, '+resp.message.replace(/\*/g, '\\*'));
  });
}

var lastChecked = [];
function checkChannel(channelId) {
  Youtube.activities.list({
    part: 'snippet',
    channelId: config.get('youtube.channels')[channelId]
  }, (err, data) => {
    if (err) {
      if (err.code != 'ENOTFOUND' && err.code != 503 && err.code != 'EAI_AGAIN') console.log(JSON.stringify(err));
    } else {
      if (!data) { console.log('Didn\'t get data!'); return; }
      else if (!data[0]) return;
      if (data[0].snippet.type != 'upload') return;
      if (data[0].snippet.publishedAt == lastChecked[channelId]) return;

      var time = (new Date(data[0].snippet.publishedAt)).getTime();
      if (Date.now() - time < 1000*60*2) { // Last 2 minutes
        lastChecked[channelId] = data[0].snippet.publishedAt;
        if (data[0].snippet.liveBroadcastContent != 'none' && typeof data[0].snippet.liveBroadcastContent != 'undefined') return;

        var id = data[0].snippet.thumbnails.default.url.match(/\/vi\/(.*?)\//i);
        if (!id) {
          console.log('Invalid ID!');
          console.log(data[0]);
          return;
        } else {
          id = id[1];
        }
        // Now we have a video!
        const url = 'https://www.youtube.com/watch?v=' + id;
        const channelName = config.get('youtube.channelNames')[channelId];

        chat(config.get('discord.announce'), '@everyone A new "'+channelName+'" video is out!\n'+url);
      }
    }
  });
}

for (var i = 0; i < config.get('youtube.channels').length; i++) {
  ((index) => {
    setInterval(() => {
      checkChannel(index);
    }, 5*1000);
  })(i);
}