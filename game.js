'use strict'
var Map = require('./map.js');
var Player = require('./player.js');
var Class = require('./class.js');

module.exports = class Game{
  
  constructor(map){
    this.map = map;
    this.players = [];
    this.projectiles = [];
    this.items = [];
    
    // STEP SPEED
    this.wait = 20; // ms = 0.05 second = 50/sec

    this.report_everything();
  }

  new_player(socket){
    let player = new Player(socket);
    player.snowballCount = 20;
    player.setClass(Class.scout);
    this.respawn_player(player);
    console.log("player "+player.id+" logged in");
    
    players.push(player);

    socket.on("playerFell", _player_fell(player));
    socket.on("setUser", _set_user(info, player));
    socket.on("map", _send_map(player));
  }

  update_leaderboard(){
    var leaderboard = "Leaderboard:<br>";
    var board = this.players.map(function(p){
      return {name:p.name,kills:p.kills,deaths:p.deaths};
    });
    board = board.sort(function(a,b){
      return (b.kills.length * b.kills.length / b.deaths.length) - (a.kills.length * a.kills.length / a.deaths.length);
    });

    // Add players to leaderboard string
    for(var i = 0; i < board.length; i++) {
      leaderboard += board[i].name + ": " + board[i].kills.length + " K, " + board[i].deaths.length + " D" + "<br>"
    }

    this.send_to_all("leaderboard",leaderboard);
  }

  

  respawn_player(player){
    player.respawning = true;
    
    let newPosition = {};

    let x, y, z = 0;
    while(true){

      y = Math.floor(Math.random()*this.map.size_y);
      z = Math.floor(Math.random()*this.map.size_z);
      x = Math.floor(Math.random()*this.map.size_x);

      if(this.map.is_valid_spawn_location(x, y, z)){
        newPosition = {x: x, y: y, z: z};
      }
    }

    player.move_to(newPosition);
  }

  _player_fell(player){
    player.deaths.push([player.id]);
    this.update_leaderboard();
    respawn_player(player);
  }

  _set_user(info, player){
    if(player.name != info.name){
        console.log(player.name + " changed their name to " + info.name);
        player.name = info.name;
        this.update_leaderboard();
    }

    //player.color = info.color; //no longer allow player to set their own color

    send_to_all_but(player.socket, "updatePlayer", {id:player.id, name: player.name, color:player.color, position: player.position});
  }

  _send_map(player){
    player.socket.emit("map", this.map.grid, this.map.colors);

    //also send all the items

    for(let i in this.items){
      let item = this.items[i];
      if(item.show){
        player.socket.emit("create item", item, item.type); //TODO make items (snowball piles and flags) !!!!!!!!!!!!
      }
    }

    //also send all the player info

    for(i in this.players){
      let otherPlayer = this.players[i];
      if(otherPlayer.id != player.id){
        player.socket.emit("new player", {id:otherPlayer.id, position:otherPlayer.position, name:otherPlayer.name, color: otherPlayer.color});
        otherPlayer.socket.emit("new player", {id:player.id, position:player.position, name:player.name, color: player.color});
      }
    }
  }


  async report_everything(){
    while(true){
      await sleep(wait);
      // make structure that holds all object position data
      let things = {};

      // players have ids and positions
      things.players = [];
      for(var i in players){
        let player = players[i];
        things.players.push({id:player.id, position:player.position});
      }

      // projectiles have ids and positions
      things.projectiles = [];
      for(var i in projectiles){
        let p = projectiles[i];
        things.projectiles.push({id:p.id, x:p.position.x, y:p.position.y, z:p.position.z});
      }

      // send every player all of the objects
      for(var i in players){
        player = players[i];
        player.socket.emit("objects",things);
      }

    }
  }

  send_to_all(label, payload){
    for(i in this.players){
      this.players[i].socket.emit(label,payload);
    }
  }

  send_to_all_but(socket, label, payload){
    for(i in this.players){
      if(this.players[i].socket != socket){
        this.players[i].socket.emit(label,payload);
      }
    }
  }

}

var nextId = 0;


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}