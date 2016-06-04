'use strict';

const config = require('config');
const gm = require('gm');

const admins = config.get('admins');

let game = null;
let queue = [];
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const NO_NEXT = '*If you do not see the next response, type `next`*';

module.exports = function(mainServer, chat, localData, idFromName, bot, clever, DEMIPIXEL_ID) {

  function message(user, userID, channelID, message, pm) {
    const cmd = message.toLowerCase();
    if (cmd == 'create') {
      if (admins.indexOf(userID) == -1 && userID != DEMIPIXEL_ID && userID != queue[0] && queue.length) chat(channelID, '<@'+userID+'>: '+
                        'You cannot create a game at this time. Try `!mini queue`.');
      else if (pm) chat(channelID, 'Try doing this in #games');
      else if (game) chat(channelID, '<@'+userID+'>: There is already a game running!');
      else {
        game = new Mini(user, userID, channelID);
        queue = queue.filter(id => id != userID);
      }
    } else if (cmd == 'queue') {
      if (game && game.creator == userID) chat(channelID, '<@'+userID+'>: You are already running a game!');
      else if (queue.indexOf(userID) != -1) chat(channelID, '<@'+userID+'>: You are at position '+(queue.indexOf(userID)+1)+' in the queue.');
      else if (queue.length == 0 && !game) game = new Mini(user, userID, channelID);
      else {
        queue.push(userID);
        chat(channelID, '<@'+userID+'>: #'+(queue.length)+' in the queue.\n'+
                        'You will be notified when it is your turn. You must create a game within 60 seconds of being notified.');
      }
    } else if (cmd == 'remove') {
      if (queue.indexOf(userID) == -1) chat(channelID, '<@'+userID+'>: You are not in the queue.');
      else {
        queue = queue.filter(id => id != userID);
        chat(channelID, '<@'+userID+'>: I removed you from the queue!');
      }
    } else if (cmd == 'join') {
      if (!game) chat(channelID, '<@'+userID+'>: No game is running yet!');
      else game.join(userID, channelID);
    } else if (cmd == 'leave') {
      if (!game) chat(channelID, '<@'+userID+'>: No game is running yet!');
      else game.leave(userID, channelID);
    } else if (cmd == 'quit') {
      if (!game) chat(channelID, '<@'+userID+'>: No game is running yet!');
      else game.quit(userID, channelID);
    } else if (cmd == 'end') {
      if (!game) chat(channelID, '<@'+userID+'>: No game is running yet!');
      else game.end(userID, channelID);
    } else if (cmd == 'clever') {
      if (!game) chat(channelID, '<@'+userID+'>: No game is running yet!');
      else game.clever(userID, channelID);
    } else if (cmd == 'hyper') {
      if (!game) chat(channelID, '<@'+userID+'>: No game is running yet!');
      else game.hyper(userID, channelID);
    } else if (cmd.indexOf('allow') == 0) {
      if (!game) chat(channelID, '<@'+userID+'>: No game is running yet!');
      else if (!cmd.match(/allow .+/)) chat(channelID, '<@'+userID+'>: Correct format is `!mini allow <user>`');
      else game.allow(userID, message.match(/allow (.+)/i)[1], channelID);
    } else if (cmd == 'spec') {
      if (!game) chat(channelID, '<@'+userID+'>: No game is running yet!');
      else game.joinSpec(userID, channelID);
    } else if (cmd == 'start') {
      if (!game) chat(channelID, '<@'+userID+'>: No game is running yet!');
      else game.start(userID, channelID);
    } else if (cmd.indexOf('prompt') == 0) {
      if (!game) chat(channelID, '<@'+userID+'>: No game is running yet!');
      else if (!message.match(/prompt (.+)/i)) chat(channelID, '<@'+userID+'>: Correct usage is `!mini prompt <Prompt>`');
      else game.newRound(userID, channelID, message.match(/prompt (.+)/i)[1]);
    } else if (cmd.indexOf('vote') == 0 /*'abnext'.indexOf(message.toLowerCase()) > -1 && pm*/) {
      if (!pm) chat(channelID, '<@'+userID+'>: This is a PM-Only command!');
      else if (!game) chat(channelID, 'No game is running yet!');
      else if (game.partA) chat(channelID, 'It is not voting time yet! Participants can submit with `!mini submit response`');
      else if (!game.getPlayer(userID)) chat(channelID, 'You can\'t vote unless you a player or spectator!\nTry `!mini spec`.');
      else if (!message.match(/^vote .+/i)) {
        chat(channelID, 'Proper format: `!mini vote <Options>`\ne.g. `!mini vote BFCADEG`');
      } else {
        game.getPlayer(userID).vote(message.match(/^vote (.+)/i)[1]/*message*/);
      }
    } else if (cmd.indexOf('submit') == 0 || cmd.indexOf('submit2') == 0) {
      if (!pm) chat(channelID, '<@'+userID+'>: This is a PM-Only command!');
      else if (!game) chat(channelID, 'No game is running yet!');
      else if (!game.getPlayer(userID, false)) chat(channelID, 'You can\'t submit unless you a player!\nTry `!mini join` next game.');
      else if (!game.getPlayer(userID).alive) chat(channelID, 'You were disqualified, so you can no longer submit responses.');
      else if (!game.partA || !game.prompt) chat(channelID, 'It is not submission time yet');
      else if (!message.match(/^submit2? .+/i)) {
        chat(channelID, 'Proper format: `!mini submit <Options>`\ne.g. `!mini submit Anything relating to the prompt in ten words or fewer!`');
      } else {
        const match = message.match(/^submit(2)? (.+)/i);
        if (match[1] && !game.getPlayer(userID).doubleResponse) {
          chat(channelID, 'You do not have the double response prize!');
        } else if (match[2].length > 200) {
          game.getPlayer(userID).resp = null;
        } else {
          const player = game.getPlayer(userID)
          player.chat('Responsed saved. ('+countWords(match[2])+' words)');
          player[match[1] ? 'resp2' : 'resp'] = match[2];
        }
      }
    } else if (cmd == 'options' || cmd == 'option') {
      if (!pm) chat(channelID, '<@'+userID+'>: This is a PM-Only command!');
      else if (!game) chat(channelID, 'No game is running yet!');
      else if (game.partA) chat(channelID, 'It is not voting time yet! Participants can submit with `!mini submit response`');
      else if (!game.getPlayer(userID)) chat(channelID, 'You can\'t get options unless you a player or spectator!\nTry `!mini spec`.');
      else {
        game.getPlayer(userID).tellVote();
      }
    } else if (cmd.indexOf('wins') == 0) {
      if (!message.match(/^wins (.+)/i)) chat(channelID, '<@'+userID+'>: Correct usage is !mini wins <user>\n(e.g. !mini wins <@'+bot.id+'>)');
      else {
        const user = idFromName(message.match(/^wins (.+)/i)[1]);
        if (!user) {
          chat(channelID, '<@'+userID+'>: Could not find that user!');
        } else {
          chat(channelID, '<@'+user+'> has '+(localData.user(userID).miniWins||0)+' Mini TWOW wins!');
        }
      }
    } else if (cmd == 'voteoff') {
      if (!game) chat(channelID, 'No game is running yet!');
      else game.voteoff(userID, channelID);
    } else if (cmd == 'help') {
      chat(channelID, '<@'+userID+'> Mini TWOW Commands\n`join`: Join game\n`spec`: Join spectator\n`leave`: Leave game or spectator\n'+
        '`vote`: PM-Only command. Vote on entries\n`options`: Get options if they were not sent to you.\n'+
        '`voteoff`: Vote the current creator off. Use sparingly! (Can be PMed)\n\n**Queue Commands**\n'+
        '`queue`: Add yourself to the queue.\n`remove`: Remove yourself from the queue.\n\n**Creator-Only Commands**\n'+
        '`create`: Create game (anyone with permission)\n`start`: Start the game (nobody else can join)\n'+
        '`allow <user>`: Allow a user to join after the game has ended\n'+
        '`prompt <prompt>`: Give a prompt for a new round!\n`quit`: Quit being leader, randomly assigned to someone else.\n`end`: End the game\n\n'+
        '`clever`: Anybody ranked below <@'+bot.id+'> loses! Set before `start`\n`hyper`: Response time is now 60 sec, vote time is 75 sec!');
    } else if (cmd == '') {
      chat(channelID, '<@'+userID+'>: Try `!mini help`');
    } else {
      chat(channelID, '<@'+userID+'>: Unknown command');
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
      this.allowed = [];
      this.started = false;
      this.ended = false;
      this.voteoff = [];

      this.maxVoteOptions = 8;
      this.safe = 0.8; // 60% safe
      this.round = 0;
      this.partA = false;
      this.roundStarted = 0;
      this.prompt = null;

      this.responseTime = 2*60;
      this.voteTime = 3*60;

      this.cleverMode = false;
      this.cleverBot = null;

      this.hyperMode = false;

      this.checkNotIdle(5*60*1000);
      this.chat('<@'+this.creator+'> has started a Mini TWOW game!\n'+
                        'Use `!mini join` to join!\n'+
                        'Use `!mini leave` to leave\n'+
                        'Use `!mini spec` to spectate the game (voting only)');
    }

    start(id, c) {
      if (id != this.creator) this.chat('Only the creator can start the game.', id, c);
      else if (this.started == true) this.chat('The game is already started!', id, c);
      else if (this.getAlivePlayers().length < 2) this.chat('You need at least two players to start the game!', id, c);
      else {
        this.started = true;
        this.chat('The game is started, no new players are allowed!');
        this.checkNotIdle(5*60*1000);
        this.cleverBot = new Player(bot.id, false, this);
        this.cleverBot.isBot = true;
        this.players.push(this.cleverBot);
      }
    }

    newRound(id, c, prompt) {
      if (id != this.creator) { this.chat('Only the creator can start a new round!', id, c); return; }
      else if (!this.started) { this.chat('The game hasn\'t started yet! Use `!mini start`.', id, c); return; }
      else if (this.prompt) { this.chat('A round has already started!', id, c); return; }
      else if (this.ended) { this.chat('The game is over!', id, c); return; }

      this.round++;
      this.partA = true;
      this.roundStarted = Date.now();
      this.chat('**Round '+this.round+'** prompt ('+this.getAlivePlayers(true).length+' players):\n**'+prompt+'**\n'+
                'You have '+Math.round(this.responseTime/60*100)/100+' minutes!\n'+
                'If you are a player, send me a private message: `!mini submit <response>`\n'+
                'e.g. `!mini submit Anything relating to the prompt in ten words or fewer!`');
      this.prompt = prompt;

      const self = this;
      if (this.cleverBot && this.cleverBot.alive) {
        for (var i = 0; i < 2; i++) {
          ((respType) => {
            clever.write(self.prompt, (resp) => {
              resp = resp ? resp.message.trim() : null;
              if (!resp) self.chat('CLEVERBOT ERROR ' + resp);
              else {
                if (resp.split(' ').length > 10) {
                  clever.write(self.prompt, (resp) => {
                    resp = resp ? resp.message.trim() : null;
                    if (!resp) self.chat('CLEVERBOT ERROR ' + resp);
                    else {
                      if (resp.split(' ').length > 10) {
                        clever.write(self.prompt, (resp) => {
                          resp = resp ? resp.message.trim() : null;
                          if (!resp) self.chat('CLEVERBOT ERROR ' + resp);
                          else self.cleverBot[respType] = resp.split(' ').slice(0, 10).join(' ');
                        })
                      }
                      else self.cleverBot[respType] = resp;
                    }
                  });
                }
                else self.cleverBot[respType] = resp;
              }
            });
          })(i == 0 ? 'resp' : 'resp2');
        }
      }

      this.getAlivePlayers().forEach((player, index) => {
        player.gotPoints = 0;
        player.gotVotes = 0;
        player.gotPoints2 = 0;
        player.gotVotes2 = 0;
        player.resp = null;
        player.resp2 = null;
        setTimeout(() => {
          player.chat('You need to submit a response: `!mini submit <response>`\n'+
                      'e.g. `!mini submit Anything relating to the prompt in ten words or fewer!`\n'+
                      (player.doubleResponse ? 'You have the double response prize which means you can '+
                        'submit a second response with `!mini submit2 <response>`.\n' : '')+'\n'+
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
        user.Os = null;
      });

      setTimeout(() => {
        const needToSubmit = this.getAlivePlayers().filter(player => player.resp == null);
        self.chat((self.hyperMode ? 10 : 30)+' seconds remaining!'+(needToSubmit.length > 0 ? '\nI still needs submissions from: '+
                    needToSubmit.map(player => '<@'+player.id+'>').join(', ') : ''));
      }, (this.responseTime - (this.hyperMode ? 10 : 30))*1000);
      setTimeout(() => { self.newVoting() }, this.responseTime*1000);

      setTimeout(() => {
        if (!self.cleverBot) return;
        if (!self.cleverBot.resp && !self.cleverBot.resp2) {
          self.cleverBot.resp = 'A valiant effort...';
        } else if (!self.cleverBot.resp && self.cleverBot.resp2 || self.cleverBot.resp == self.cleverBot.resp2) {
          self.cleverBot.resp = self.cleverBot.resp2;
          self.cleverBot.resp2 = null;
        }
      }, 7*1000);
    }

    newVoting() {
      if (this.ended) return;
      const noResponse = [];
      this.getAlivePlayers().forEach(player => {
        if (!player.resp) {
          player.lose('You did not submit a response!');
          noResponse.push(player);
          player.alive = false;
          player.spec = true;
        }
      });

      noResponse.forEach((player, index) => {
        player.positions.push(this.getAlivePlayers().length + index);
      });

      if (!this.hyperMode) {
        if (this.getAlivePlayers(true).length <= 3) this.voteTime = 1*60;
        else if (this.getAlivePlayers(true).length <= 5) this.voteTime = 2*60;
      }

      this.chat('**Round '+this.round+'** voting has begun!\n**Prompt: '+this.prompt+'**\n'+
      (noResponse.length ? 'I did not receive a response from: '+noResponse.map(player => '<@'+player.id+'>').join(', ')+'\n' : '')+
      'Remember, you viewers can vote whether you\'re a contestant or not!\n'+
      'If you\'re not a player or spectator, to vote use `!mini spec`\n'+
      'There are '+Math.round(this.voteTime/60*100)/100+' minutes to vote! Get going!\n'+
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
        self.chat((self.hyperMode ? 10 : 30)+' seconds remaining!');
      }, (this.voteTime - (this.hyperMode ? 10 : 30))*1000);
      setTimeout(() => {
        self.chat('Drumroll please...');
        setTimeout(() => self.results(), 5*1000);
      }, this.voteTime*1000);
    }

    results() {
      this.players.concat(this.specs).forEach(user => {
        if (user.voteStr) {
          const used = [];
          for (var i = 0; i < user.voteStr.length; i++) {
            const voted = user.voteOptions[user.voteStr[i]];
            if (!voted) return;
            used.push(voted);
            if (used.indexOf(voted) < i) {
              voted.gotVotes2++;
              voted.gotPoints2 += (user.voteStr.length - i - 1) / (user.voteStr.length - 1);
            } else {
              voted.gotVotes++;
              voted.gotPoints += (user.voteStr.length - i - 1) / (user.voteStr.length - 1);
            }
          }
        }
      });
      this.getAlivePlayers(true).forEach(player => {
        const secondRatio = player.gotVotes2 ? player.gotPoints2/player.gotVotes2 : 0;
        player.ratio = player.gotPoints/player.gotVotes;
        if (secondRatio > player.ratio) {
          player.ratio2 = player.ratio;
          player.ratio = secondRatio;
          const tmpVotes = player.gotVotes;
          player.gotVotes = player.gotVotes2;
          player.gotVotes2 = tmpVotes;
          player.resp = player.resp2;
        } else {
          player.ratio2 = secondRatio;
        }
      });

      const sorted = this.getAlivePlayers(true).sort((a, b) => b.ratio - a.ratio);

      sorted[0].wins++;

      const displaySorted = sorted.map((player, index) => {
        var rank = index + 1;
        return '['+rank+'] <@'+player.id+'>: '+player.resp+' ('+player.gotVotes+' votes, '+Math.round(player.ratio*1000)/10+'%)'+
          (player.resp2 ? '\n    Response 2: '+player.resp2+' ('+player.gotVotes2+' votes, '+Math.round(player.ratio2*1000/10)+'%)':'');
      });

      var aliveLeft = 0;
      var str = '**RESULTS**\n';
      str += 'Prompt: '+this.prompt+'\n\n';
      var size = displaySorted.length - 1;
      var botPos = sorted.length;

      if (!this.cleverMode) str += 'Winner: <@'+sorted[0].id+'> ('+(sorted[0].wins==1?'First win this season':'Win #'+sorted[0].wins+' this season')+')\n\n';
      for (var i = 0; i < displaySorted.length; i++) {
        sorted[i].positions.push(i);
        if (sorted[i].isBot && this.cleverMode) {
          str += '= = = = = = = = = = = = = = = = =\n';
          botPos = i;
        }
        str += displaySorted[i]+'\n';
        if (i == 0 && !this.cleverMode) str += '= = = = = = = = = = = = = = = = =\n';
        else if (((i+1)/size > this.safe && i/size <= this.safe && !this.cleverMode) || (this.cleverMode && sorted[i].isBot && i != displaySorted.length-1)) {
          str += '= = = = = = = = = = = = = = = = =\n';
          str += '<@&188240087065165824>\n'; // "ELIMINATED"
          str += '= = = = = = = = = = = = = = = = =\n';
        } else if ((i/size > this.safe && !this.cleverMode) || (this.cleverMode && i > botPos)) {
          sorted[i].alive = false;
        }
        if ((i/size <= this.safe && !this.cleverMode) || (this.cleverMode && i < botPos)) aliveLeft++;
      }

      if (aliveLeft <= 1) {
        const winner = sorted[0].isBot && this.cleverMode ? sorted[1] : sorted[0];
        str += '\n\n**WINNER: <@'+winner.id+'>! CONGRATULATIONS!**';
        const userData = localData.user(winner.id);
        userData.miniWins = (userData.miniWins || 0) + 1;
        localData.save();
        str += '\n<@'+winner.id+'> now has '+userData.miniWins+' win'+(userData.miniWins>1?'s':'')+'!';
        this.endGame();
      } else {
        str += '\nThere are **'+aliveLeft+' players** left!';
        this.checkNotIdle(4*60*1000);
      }

      this.players.forEach(player => {
        player.doubleResponse = false;
      });

      if (aliveLeft >= 6) sorted[0].doubleResponse = true;

      this.prompt = null;
      this.chat(str);
      this.generateImage();
    }

    checkNotIdle(time, round) {
      const self = this;
      if (time) {
        const oldRound = this.round;
        setTimeout(function() {
          self.checkNotIdle(null, oldRound);
        }, time);
        return;
      }
      if (this.round == round && !this.ended) {
        this.chat('Creator has been idle for too long. A new leader is being chosen...\n'+this.newRandomCreator());
      }
    }




    join(id, c) {
      if (this.getPlayer(id, false)) this.chat('You are already in the game!', id, c);
      else if (this.started == true && this.allowed.indexOf(id) == -1) this.chat('The game has already started!', id, c);
      else {
        this.chat('Adding <@'+id+'> to the game!');
        this.players.push(new Player(id, false, this));
        this.specs = this.players.filter(p => p.id != id);
        this.allowed = this.allowed.filter(i => i != id);
      }
    }

    joinSpec(id, c) {
      if (this.getPlayer(id, true)) this.chat('You are already spectating!', id, c);
      else {
        if (this.getPlayer(id, false) && this.started) {
          this.chat('Warning, the game has started! Try `!mini leave`.', id, c);
          return;
        }
        if (this.getPlayer(id, false)) {
          this.chat('<@'+id+'> left the game to spectate!');
          this.players = this.players.filter(p => p.id != id);
        } else {
          this.chat('You are now spectating', id, c);
        }
        const user = new Player(id, true, this);
        this.specs.push(user);
        if (this.partA == false && this.prompt) {
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

        if (this.started && this.getAlivePlayers().length == 1) {
          const winner = this.getAlivePlayers()[0];
          this.chat('<@'+winner.id+'> has won!');
          this.endGame();
        }
      }
    }

    voteoff(id, c) {
      if (this.voteoff.indexOf(id) > -1) this.chat('You have already voted!', id, c);
      else {
        this.voteoff.push(id);
        if (this.voteoff.length > Math.max(3, this.players.length/3)) {
          this.chat('The current prompter has been voted off! A new prompter is being chosen...\n'+this.newRandomCreator());
        } else {
          this.chat('More votes are required to vote off the current prompter.', id, c);
        }
      }
    }

    quit(id, c) {
      if (id != this.creator) this.chat('Only the creator can quit the prompter position.', id, c);
      else {
        this.chat('<@'+this.creator+'> has quit being prompter! A new prompter is being assigned...\n'+this.newRandomCreator());
      }
    }

    end(id, c) {
      if (id != this.creator) this.chat('Only the creator can end the game.', id, c);
      else {
        this.chat('<@'+this.creator+'> has force-ended the game.');
        this.endGame();
      }
    }

    clever(id, c) {
      if (id != this.creator) this.chat('Only the creator can modify options.', id, c);
      else {
        this.cleverMode = !this.cleverMode;
        this.chat('<@'+this.creator+'>: Clever mode is now '+(this.cleverMode?'ON':'OFF'));
      }
    }

    hyper(id, c) {
      if (id != this.creator) this.chat('Only the creator can modify options.', id, c);
      else {
        this.hyperMode = !this.hyperMode;
        if (this.hyperMode) {
          this.responseTime = 60;
          this.voteTime = 75;
        } else {
          this.responseTime = 2*60;
          this.voteTime = 3*60;
        }
        this.chat('<@'+this.creator+'>: Hyper mode is now '+(this.hyperMode?'ON':'OFF'));
      }
    }

    allow(id, targetId, c) {
      if (id != this.creator) this.chat('Only the creator can allow other people.', id, c);
      else {
        const target = idFromName(targetId);
        if (!target) this.chat('That user does not exist!', id, c);
        else if (this.allowed.indexOf(target) != -1) this.chat('That user is already allowed.', id, c);
        else {
          this.allowed.push(target);
          this.chat('<@'+target+'> is now allowed to join after start.');
        }
      }
    }





    newRandomCreator() {
      const active = this.getAlivePlayers();
      const oldCreator = this.creator;
      if (active.length == 0 || (active.length == 1 && active[0].id == oldCreator)) {
        this.endGame();
        return 'Game is ending, no other possible leaders.';
      }
      while (this.creator == oldCreator) {
        this.creator = active[Math.floor(Math.random()*active.length)].id;
      }
      return 'New leader is <@'+this.creator+'>! Make a new prompt using `!mini prompt <Prompt here>`';
    }


    getAlivePlayers(includeBot) {
      return this.players.filter(p => p.alive && (includeBot || !p.isBot));
    }

    getPlayer(id, spec) {
      if (spec == undefined) return this.players.concat(this.specs).filter(p => p.id == id)[0] || null;
      else if (spec == false) return this.players.filter(p => p.id == id)[0] || null;
      else return this.specs.filter(p => p.id == id)[0] || null;
    }

    chat(str, id, c) {
      chat(c || this.channel, (id && c != id ? '<@'+id+'>: ':'')+str);
    }

    endGame(force) {
      if (this.ended && !force) return;
      this.ended = true;
      game = null;
      if (queue.length > 0) {
        this.chat('<@'+queue[0]+'>: It is now your turn to be the Mini TWOW creator! Use `!mini create`. You have 60 seconds!');
        const self = this;
        const oldId = queue[0];
        setTimeout(() => {
          if (queue[0] == oldId) {
            self.chat('<@'+oldId+'> did not respond in time!');
            queue.splice(0, 1);
            self.endGame(true);
          }
        }, 60*1000);
      } else if (force) {
        this.chat('No one is left in the queue.');
      }
    }

    generateImage() {
      const PADDING = 20;
      const PLAYER_HEIGHT = 50;
      const ROUND_WIDTH = 100;
      const HEIGHT = PADDING*2 + (this.players.length-1)*PLAYER_HEIGHT;
      const WIDTH = PADDING*2 + 200 + this.round*ROUND_WIDTH;
      const img = gm(WIDTH, HEIGHT, '#ffffff')
                    .fontSize(20);

      // Draw lines
      for (var i = 0; i < this.round+1; i++) {
        this.players.forEach(player => {
          if (player.positions[i] != undefined && player.positions[i+1] != undefined) {
            img.stroke(player.color, 2)
               .fill(player.color)
               .drawLine(PADDING + ROUND_WIDTH*i - 2, PADDING + player.positions[i]*PLAYER_HEIGHT - 2,
                     PADDING + ROUND_WIDTH*(i+1) - 2, PADDING + player.positions[i+1]*PLAYER_HEIGHT) - 2
          }
        });
      }

      // Draw usernames
      this.players.forEach(player => {
        if (player.positions[0] == undefined) return;
        console.log('Drawing',mainServer.members[player.id].username,mainServer.members[player.id]);
        img.fill('#000')
           .fontSize(20)
           .stroke('#0000', 0)
           .drawText(PADDING + (this.round-0.5)*ROUND_WIDTH, PADDING + player.positions[player.positions.length-1]*PLAYER_HEIGHT, mainServer.members[player.id] ? 
                                                                                    ((mainServer.members[player.id].nick && mainServer.members[player.id].nick.trim()) || 
                                                                                    (mainServer.members[player.id].username && mainServer.members[player.id].username.trim()) || 
                                                                                      'Unknown Player') :
                                                                                    'Unknown Player');
      });

      // Draw circles
      for (var i = 0; i < this.round; i++) {
        this.players.forEach(player => {
          if (player.positions[i] != undefined) {
            let x = PADDING + ROUND_WIDTH*i;
            let y = PADDING + player.positions[i]*PLAYER_HEIGHT;
            if (player.alive || player.positions[i+1] != undefined) {
              img.fill(player.color);
            } else {
              img.fill('#a00');
            }
            img.stroke('#555', 3)
               .drawCircle(x-4, y-4, x+4, y+4);
          }
        });
      }

      const self = this;
      const dir = __dirname;
      img.write(dir + '/graph.png', err => {
        if (err) {
          self.chat('Error creating graph!');
          console.log(err);
        } else {
          bot.uploadFile({
            to: self.channel,
            file: dir + '/graph.png',
            filename: 'graph.png',
            message: 'Here is a graph of the current players!'
          });
        }
      });
    }
  }

  class Player {

    constructor(id, spec, game) {
      this.id = id;
      this.game = game;
      this.spec = spec || false;
      this.alive = true;
      this.resp = null;
      this.resp2 = null;
      this.wins = 0;
      this.isBot = false;

      this.gotVotes = 0;
      this.gotPoints = 0;
      this.ratio = 0;

      this.gotVotes2 = 0;
      this.gotPoints2 = 0;

      this.votedLastTime = true;
      this.voteStr = null;
      this.voteOptions = null;
      this.doubleResponse = false;
      /*this.voteOptions2 = null;
      this.totalVoteOptions2 = 0;*/

      this.positions = [];
      this.color = '#aaa';
    }

    vote(str) {
      //return this.vote2(str);
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

    /*vote2(str) {
      str = str.toLowerCase();
      if (str == 'next') { this.tellVote2(); return; }
      else if (str != 'a' && str != 'b') { this.chat('You must vote with `A` or `B`.'); return; }
      else if (this.voteOptions2.length == 0) { this.chat('There are no combinations left to vote on!'); return; }
      const index = str == 'a' ? 0 : 1;
      this.voteOptions2[0][index].gotVotes++;
      this.voteOptions2[0][index].gotPoints++;

      this.voteOptions2[0][(index+1)%2].gotVotes++;

      this.voteOptions2.splice(0, 1);
      this.chat('**Vote saved**'+(this.totalVoteOptions2 - this.voteOptions2.length == 8?'\n__You have voted on 8 combinations.'+
                      ' You can continue if you wish, but you have reached the recommended number of votes.__':'')+'\n'+
                      (this.voteOptions2.length>0?'\n'+this.tellVote2(true)+'\n'+NO_NEXT:'**There are no more combos left!**'));
      this.votedLastTime = true;
    }*/

    giveVoteOptions() {
      //return this.giveVoteOptions2();
      this.voteOptions = {};
      const rand = this.game.getAlivePlayers(true).concat(this.game.getAlivePlayers(true).filter(player => !!player.resp2)).filter(i => !!i); // Allow bot!
      shuffle(rand);
      for (var i = 0; i < Math.min(rand.length, this.game.maxVoteOptions); i++) {
        this.voteOptions[alphabet[i].toLowerCase()] = rand[i];
      }
    }

    /*giveVoteOptions2() {
      this.voteOptions2 = [];
      const active = this.game.getAlivePlayers();
      for (var i = 0; i < active.length-1; i++) {
        for (var j = i+1; j < active.length; j++) {2
          if (Math.random() > 0.5) this.voteOptions2.push([active[i], active[j]]);
          else this.voteOptions2.push([active[j], active[i]]);
        }
      }
      shuffle(this.voteOptions2);
      this.totalVoteOptions2 = this.voteOptions2.length;
    }*/

    tellVote() {
      //return this.tellVote2();
      if (!this.voteOptions) return;
      const used = [];
      this.chat('Time to vote! Vote using `!mini vote <options>` e.g. `!mini vote ABCGFED`\n'+
                'Prompt: '+this.game.prompt+'\n\n'+
                Object.keys(this.voteOptions).map((opt, index) => {
                  var tooLong = countWords(this.voteOptions[opt].resp) > 10;

                  used.push(this.voteOptions[opt]);
                  var resp = used.indexOf(this.voteOptions[opt]) == index ? 'resp' : 'resp2';

                  return opt.toUpperCase()+'. '+this.voteOptions[opt][resp]+' ('+(tooLong?'**':'')+countWords(this.voteOptions[opt][resp])+' words'+(tooLong?'**':'')+')'
                }).join('\n'));
    }

    /*tellVote2(getStr) {
      if (this.voteOptions2.length == 0) this.chat('There are no combinations left to vote on!');
      else {
        const str = '**Prompt: '+this.game.prompt+'**\nWhich is better? Respond with `A` or `B`.\n\n'+
                      this.voteOptions2[0].map((player, index) => {
                        var tooLong = countWords(player.resp) > 10;
                        return (index==0?'A. ':'B. ')+player.resp+' ('+(tooLong?'**':'')+countWords(player.resp)+' words'+(tooLong?'**':'')+')';
                      }).join('\n');
        if (getStr) return str;
        else this.chat(str);
      }
    }*/

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

function countWords(str) {
  return str.replace(/[.,\-+/*"()\[\]]/gi, ' ').split(' ').filter(word => !!word).length; // Not empty words
}