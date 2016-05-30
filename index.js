const config = require('config');
const DiscordClient = require('discord.io');
const moment = require('moment');
const emoji = require('node-emoji');
const mathjs = require('mathjs');

const bot = new DiscordClient({
    autorun: true,
    email: config.get('discord.email'),
    password: config.get('discord.password'),
});

const localData = require('./lib/data')('./data');

var mainServer;
const chat = (id, message, noEmoji) => {
  bot.sendMessage({
    to: id,
    message: !noEmoji ? emoji.emojify(message) : message
  });
};
const idFromName = (name) => {
  name = name.replace(/[@<>]/g, '').toLowerCase();
  return Object.keys(mainServer.members).reduce((chosen, id) => {
    return (mainServer.members[id].nick || '').toLowerCase() == name || id == name ? id : chosen;
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
});

bot.on('message', function(user, userID, channelID, message, rawEvent) {
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
  } else if ((math !== null || message.indexOf('!debug') == 0) && (math ? math.toString() : '') != message.replace(/"/g, '')) {
    var show = message.indexOf('!debug') == 0;
    sayMath(userID, message, math, show ? mathError : null, channelID, show);
  } else if (message == '!git') {
    chat(channelID, 'https://github.com/demipixel/twowdiscordbot');
  } else if (message == '!help') {
    chat(channelID, '`!hey, !info, !hug <user>, !joined <user>, any math expression, !debug <math expr>`');
  }
});

function parsePM(user, userID, channelID, message, rawEvent) {
  if (userID != DEMIPIXEL_ID) return;
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
    if (output) chat(channelID, '<@'+userID+'>\n'+arr.slice(0, 5).join('\n')+(arr.length > 5 ? '\n...' : ''));
  } else if (typeof math != 'function' || debug) {
    chat(channelID, '<@'+userID+'>: '+math);
  }
}