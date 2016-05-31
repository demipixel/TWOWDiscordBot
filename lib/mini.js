'use strict';

const config = require('config');

const admins = config.get('admins');

let game = null;
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

module.exports = function(mainServer, chat, localData, idFromName, DEMIPIXEL_ID) {

  function message(user, userID, channelID, message, pm) {
    if (message == 'create') {
      if (admins.indexOf(userID) == -1 && userID != DEMIPIXEL_ID) chat(channelID, '<@'+userID+'>: You cannot create Mini TWOWs!');
      else if (pm) chat(channelID, 'Try doing this in #games @');
      else if (game) chat(channelID, '<@'+userID+'>: There is already a game running!');
      else {
        game = new Mini(user, userID, channelID);
        chat(channelID, '<@'+userID+'> has started a Mini TWOW game!\n'+
                        'Use `!mini join` to join!\n'+
                        'Use `!mini leave` to leave\n'+
                        'Use `!mini spec` to spectate the game (voting only)');
      }
    } else if (message == 'join') {
      if (!game) chat(channelID, '<@'+userID+'>: No game is running yet!');
      else game.join(userID, channelID);
    } else if (message == 'leave') {
      if (!game) chat(channelID, '<@'+userID+'>: No game is running yet!');
      else game.leave(userID, channelID);
    } else if (message == 'spec') {
      if (!game) chat(channelID, '<@'+userID+'>: No game is running yet!');
      else game.joinSpec(userID, channelID);
    } else if (message == 'start') {
      if (!game) chat(channelID, '<@'+userID+'>: No game is running yet!');
      else game.start(userID, channelID);
    } else if (message.indexOf('prompt ') == 0) {
      if (!game) chat(channelID, '<@'+userID+'>: No game is running yet!');
      else game.newRound(userID, channelID, message.replace('prompt ', ''));
    } else if (message.indexOf('vote') == 0) {
      if (!pm) chat(channelID, '<@'+userID+'>: This is a PM-Only command!');
      else if (!game) chat(channelID, 'No game is running yet!');
      else if (game.partA) chat(channelID, 'It is not voting time yet! Participants can submit with `!mini submit response`');
      else if (!game.getPlayer(userID)) chat(channelID, 'You can\'t vote unless you a player or spectator!\nTry `!mini spec`.');
      else if (!message.match(/^vote .+/)) {
        chat(channelID, 'Proper format: `!mini vote <Options>`\ne.g. `!mini vote BFCADEG`');
      } else {
        game.getPlayer(userID).vote(message.match(/^vote (.+)/)[1]);
      }
    } else if (message.indexOf('submit') == 0) {
      if (!pm) chat(channelID, '<@'+userID+'>: This is a PM-Only command!');
      else if (!game) chat(channelID, 'No game is running yet!');
      else if (!game.getPlayer(userID, false)) chat(channelID, 'You can\'t submit unless you a player!\nTry `!mini join` next game.');
      else if (!game.getPlayer(userID).alive) chat(channelID, 'You were disqualified, so you can no longer submit responses.');
      else if (!message.match(/^submit .+/)) {
        chat(channelID, 'Proper format: `!mini submit <Options>`\ne.g. `!mini submit Anything relating to the prompt in ten words or fewer!`');
      } else {
        game.getPlayer(userID).resp = message.match(/^submit (.+)/)[1];
        game.getPlayer(userID).chat('Responsed saved.');
      }
    } else if (message == 'options' || message == 'option') {
      if (!pm) chat(channelID, '<@'+userID+'>: This is a PM-Only command!');
      else if (game.partA) chat(channelID, 'It is not voting time yet! Participants can submit with `!mini submit response`');
      else if (!game.getPlayer(userID)) chat(channelID, 'You can\'t get options unless you a player or spectator!\nTry `!mini spec`.');
      else {
        game.getPlayer(userID).tellVote();
      }
    } else if (message.indexOf('wins') == 0) {
      if (!message.match(/^wins (.+)/)) chat(channelID, '<@'+userID+'>: Correct usage is !mini wins <user>\n(e.g. !mini wins <@'+DEMIPIXEL_ID+'>)');
      else {
        const user = idFromName(message.match(/^wins (.+)/)[1]);
        if (!user) {
          chat(channelID, '<@'+userID+'>: Could not find that user!');
        } else {
          const userData = localData.user();
          chat(channelID, '<@'+user+'> has '+(userData.miniWins||0)+' Mini TWOW wins!');
        }
      }
    }
  }

  class Mini {

    constructor(creator, creatorID, channelID) {
      this.creatorName = creator;
      this.creator = creatorID;
      this.channel = channelID;
      this.created = Date.now();
      this.players = [];
      this.specs = [];
      this.started = false;
      this.ended = false;

      this.maxVoteOptions = 8;
      this.safe = 0.8; // 60% safe
      this.round = 0;
      this.partA = true;
      this.roundStarted = 0;
      this.prompt = '';
    }

    start(id, c) {
      if (id != this.creator) this.chat('Only the creator can start the game.', id, c);
      else if (this.started == true) this.chat('The game is already started!', id, c);
      else {
        this.started = true;
        this.chat('The game is started, no new players are allowed!');
      }
    }

    newRound(id, c, prompt) {
      if (id != this.creator) { this.chat('Only the creator can start a new round!', id, c); return; }
      else if (this.started == false) { this.chat('The game hasn\'t started yet! Use `!mini start`.', id, c); return; }

      this.round++;
      this.partA = true;
      this.roundStarted = Date.now();
      this.chat('**Round '+this.round+'** prompt ('+this.getAlivePlayers().length+' players):\n**'+prompt+'**\n'+
                'You have 2 minutes!\n'+
                'If you are a player, send me a private message: `!mini submit <response>`\n'+
                'e.g. `!mini submit Anything relating to the prompt in ten words or fewer!`');
      this.prompt = prompt;

      this.getAlivePlayers().forEach((player, index) => {
        player.gotPoints = 0;
        player.gotVotes = 0;
        player.resp = null;
        setTimeout(() => {
          player.chat('You need to submit a response: `!mini submit <response>`\n'+
                      'e.g. `!mini submit Anything relating to the prompt in ten words or fewer!`\n\n'+
                      'Prompt: **'+prompt+'**');
        }, (index+1)*1000);
      });

      this.players.concat(this.specs).forEach(user => {
        if (user.spec && !user.votedLastTime) {
          this.specs = this.specs.filter(spec => spec.id != user.id);
          user.chat('You haven\'t voted twice in a row so you were removed from spectator!\nYou can rejoin with `!mini spec`.');
          return;
        }
        if (user.spec) user.votedLastTime = user.voteStr != null;
        user.voteStr = null;
        user.voteOptions = null;
      });

      var self = this;
      setTimeout(() => { self.newVoting() }, 120*1000);
    }

    newVoting() {
      if (this.ended) return;
      const noResponse = [];
      this.getAlivePlayers().forEach(player => {
        if (!player.resp) {
          player.lose('You did not submit a response!');
          noResponse.push(player);
          this.specs.push(player);
          player.spec = true;
        }
      });
      this.players = this.players.filter(player => player.resp);
      this.chat('Round '+this.round+' voting has begun!\nPrompt: '+this.prompt+'\n'+
      (noResponse.length ? 'I did not receive a response from: '+noResponse.map(player => '<@'+player.id+'>').join(', ')+'\n' : '')+
      'Remember, you viewers can vote whether you\'re a contestant or not!\n'+
      'If you\'re not a player or spectator, to vote use `!mini spec`\n'+
      'There are 2 minutes to vote! Get going!\n'+
      'If you did NOT get the options, use `!mini options`. Sometimes options can take a little bit to get sent to you, though.');
      this.roundStarted = Date.now();
      this.partA = false;

      this.players.concat(this.specs).forEach((user,index) => {
        user.giveVoteOptions();

        setTimeout(() => {
          user.tellVote();
        }, index*1000);
      });

      const self = this;
      setTimeout(() => {
        this.chat('Drumroll please...');
        setTimeout(() => self.results(), 5*1000);
      } , 120*1000);
    }

    results() {
      var bestPossible = Math.min(this.getAlivePlayers(), this.maxVoteOptions) - 1;
      this.players.concat(this.specs).forEach(user => {
        if (user.voteStr) {
          for (var i = 0; i < user.voteStr.length; i++) {
            const voted = user.voteOptions[user.voteStr[i]];
            voted.gotVotes++;
            voted.gotPoints += Object.keys(user.voteOptions).length - i - 1;
          }
        }
      });
      this.getAlivePlayers().forEach(player => {
        player.ratio = player.gotPoints/player.gotVotes;
      });

      const sorted = this.getAlivePlayers().sort((a, b) => a.ratio < b.ratio);

      const displaySorted = sorted.map((player, index) => {
        var rank = index + 1;
        return '['+rank+'] <@'+player.id+'>: '+player.resp+' ('+player.gotVotes+' votes, '+Math.round(player.ratio/bestPossible*1000)/1000+')';
      });

      var aliveLeft = 0;
      var str = '**RESULTS**\n\n';
      var size = displaySorted.length - 1;

      for (var i = 0; i < displaySorted.length; i++) {
        str += displaySorted[i]+'\n';
        if (i == 0) str += '= = = = = = = = = = = = = = = = =\n';
        else if ((i+1)/size > this.safe && i/size <= this.safe) {
          str += '= = = = = = = = = = = = = = = = =\n';
          str += 'DANGER ZONE\n';
          str += '= = = = = = = = = = = = = = = = =\n';
        } else if (i/size > this.safe) {
          sorted[i].alive = false;
        }
        if (i/size <= this.safe) aliveLeft++;
      }

      if (aliveLeft == 1) {
        str += '\n\n**WINNER: <@'+sorted[0].id+'>! CONGRATULATIONS!**';
        const userData = localData.user(sorted[0].id);
        userData.miniWins = (userData.miniWins || 0) + 1;
        localData.save();
        str += '\n<@'+sorted[0].id+'> now has '+userData.miniWins+' win'+(userData.miniWins>1?'s':'')+'!';
        this.ended = true;
        game = null;
      } else {
        str += '\nThere are **'+aliveLeft+' players** left!';
      }

      this.chat(str);
    }

    join(id, c) {
      if (this.getPlayer(id, false)) this.chat('You are already in the game!', id, c);
      else if (this.started == true) this.chat('The game has already started!', id, c);
      else {
        this.chat('Adding <@'+id+'> to the game!');
        this.players.push(new Player(id, false, this));
        this.specs = this.players.filter(p => p.id != id);
      }
    }

    joinSpec(id, c) {
      if (this.getPlayer(id, true)) this.chat('You are already spectating!', id, c);
      else {
        if (this.players.filter(p => p.id == id).length != 0) {
          this.chat('<@'+id+'> left the game to spectate!');
          this.players = this.players.filter(p => p.id != id);
        } else {
          this.chat('You are now spectating', id, c);
        }
        const user = new Player(id, true, this);
        this.specs.push(user);
        if (this.partA == false) {
          user.giveVoteOptions();
          user.tellVote();
        }
      }
    }

    leave(id, c) {
      if (!this.getPlayer(id)) this.chat('You are not in the current game!', id, c);
      else {
        this.players = this.players.filter(p => p.id != id);
        this.specs = this.players.filter(p => p.id != id);
        this.chat('You are no longer playing.', id, c);
      }
    }

    getAlivePlayers() {
      return this.players.filter(p => p.alive);
    }

    getPlayer(id, spec) {
      if (spec == undefined) return this.players.concat(this.specs).filter(p => p.id == id)[0] || null;
      else if (spec == false) return this.players.filter(p => p.id == id)[0] || null;
      else return this.specs.filter(p => p.id == id)[0] || null;
    }

    chat(str, id, c) {
      chat(c || this.channel, (id && c != id ? '<@'+id+'>: ':'')+str);
    }
  }

  class Player {

    constructor(id, spec, game) {
      this.id = id;
      this.game = game;
      this.spec = spec || false;
      this.alive = true;
      this.resp = null;

      this.gotVotes = 0;
      this.gotPoints = 0;
      this.ratio = 0;

      this.votedLastTime = true;
      this.voteStr = null;
      this.voteOptions = null;
    }

    vote(str) {
      str = str.toLowerCase();
      for (var i = 0; i < str.length; i++) {
        if (!this.voteOptions[str[i]]) {
          this.chat(str[i]+' is not a valid vote option!');
          return;
        } else if (str.slice(0, i).indexOf(str[i]) != -1) {
          this.chat('You voted for '+str[i]+' twice!');
          return;
        }
      }
      if (str.length != Object.keys(this.voteOptions).length) {
        this.chat('You must vote on each option!');
        return;
      }
      this.chat('Vote saved');
      this.voteStr = str;
    }

    giveVoteOptions() {
      this.voteOptions = {};
      const rand = this.game.getAlivePlayers();
      shuffle(rand);
      for (var i = 0; i < Math.min(rand.length, this.game.maxVoteOptions); i++) {
        this.voteOptions[alphabet[i].toLowerCase()] = rand[i];
      } 
    }

    tellVote() {
      this.chat('Time to vote! Vote using `!mini vote <options>` e.g. `!mini vote ABCGFED`\n'+
                'Prompt: '+this.game.prompt+'\n\n'+
                Object.keys(this.voteOptions).map(opt => {
                  return opt.toUpperCase()+'. '+this.voteOptions[opt].resp+' ('+this.voteOptions[opt].resp.split(' ').length+' words)'
                }).join('\n'));
    }

    lose(reason) {
      this.chat('You were disqualified!'+(reason?' '+reason:''));
    }

    chat(str) {
      chat(this.id, str);
    }
  }

  return {
    message: message
  };
}


function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}