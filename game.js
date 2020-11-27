'use strict'
var Map = require('./map.js');
var Player = require('./player.js');
var Class = require('./class.js');
var Projectile = require('./projectile.js');

const GRAV = 5;

module.exports = class Game{
  
  constructor(map){
    this.nextId = 0;

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
    player.snowballCount = 1000;
    player.setClass(Class.scout);
    this.respawn_player(player);
    console.log("player "+player.id+" logged in");
    
    this.players.push(player);
    return player;

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
    
    let x = -1;
    let y = -1;
    let z = -1;
    while(!this.map.is_valid_spawn_location(x, y, z)){

      y = Math.floor(Math.random()*this.map.size_y);
      z = Math.floor(Math.random()*this.map.size_z);
      x = Math.floor(Math.random()*this.map.size_x);
    }

    player.move_to({x: x, y: y, z: z});
  }

  player_fell(player){
    player.deaths.push([player.id]);
    this.update_leaderboard();
    this.respawn_player(player);
  }

  set_user(player, info){
    if(player.name != info.name){
        console.log(player.name + " changed their name to " + info.name);
        player.name = info.name;
        this.update_leaderboard();
    }

    //player.color = info.color; //no longer allow player to set their own color

    this.send_to_all_but(player.socket, "updatePlayer", {id:player.id, name: player.name, color:player.color, position: player.position});
  }

  send_map_to(player){
    player.socket.emit("map", this.map.grid, this.map.colors);

    //also send all the items

    for(let i in this.items){
      let item = this.items[i];
      if(item.show){
        player.socket.emit("create item", item, item.type); //TODO make items (snowball piles and flags) !!!!!!!!!!!!
      }
    }

    //also send all the player info

    for(let i in this.players){
      let otherPlayer = this.players[i];
      if(otherPlayer.id != player.id){
        player.socket.emit("new player", {id:otherPlayer.id, position:otherPlayer.position, name:otherPlayer.name, color: otherPlayer.color});
        otherPlayer.socket.emit("new player", {id:player.id, position:player.position, name:player.name, color: player.color});
      }
    }
  }

  change_class(player, className){
    if(Class.name.indexOf(className) != -1){
      player.setClass(Class.name.indexOf(className));
    }
  }

  disconnect(player){
    
    // remove player from players
    this.players.splice(this.players.indexOf(player),1);

    // let everyone know
    this.send_to_all("player left", player.id);
    console.log(player.name + " left");
    this.send_to_all("message", player.name + " left");
    this.update_leaderboard();
  }

  update_player_position(player, position){
    player.update_position(position);
    // check for collision with items TODO !!!!
  }

  launch(player, angle){
    player.create_projectile(this, angle);
  }

  _does_hit_player(p){
    for(let i in this.players){
      let player = this.players[i];
      
      var dz = player.z - p.position.z;
      var dx = player.x - p.position.x;
      var bottom = player.y - (35/2);
      var top = player.y + (35/2);

      if(Math.sqrt(dz*dz + dx*dx) < 7.5 && p.position.y < top && p.position.y > bottom && p.owner.id != player.id){
        return player;
      }
    }
    return false;
  }



  async move_projectile(p){
    var hit = false;

    while(!hit && p.age < p.max_age){
      await sleep(this.wait/4);

      p.velocity.y -= GRAV * this.wait/1000;

      p.position.x += p.velocity.x/4 * this.wait/1000;
      p.position.y += p.velocity.y/4 * this.wait/1000;  // this physics... maybe re figure this out
      p.position.z += p.velocity.z/4 * this.wait/1000;

      let hitPlayer = this._does_hit_player(p);
      if(hitPlayer){
        hit = true;

        hitPlayer.socket.emit("message", {from: "server", text: p.owner.name + " hit you!"});
        p.owner.socket.emit("message", {from: "server", text: "you hit " + hitPlayer.name + "!"});

        hitPlayer.deaths.push(p.owner.id);
        p.owner.kills.push(hitPlayer.id);
        this.respawn_player(hitPlayer);
        this.update_leaderboard();

      }else if(!this.map.is_empty(p.position)){
        hit = true;

        p.move_to_hit_location(this.map);
      }

      if(hit && p.fractures > 0){
        p.fracture(this);
      }

      p.age++;
    }

    this.send_to_all("projectile burst",{id:p.id, x:p.position.x, y:p.position.y, z:p.position.z});

    // remove projectile from list
    this.projectiles.splice(this.projectiles.indexOf(p),1);

  }

  async report_everything(){
    while(true){
      await sleep(this.wait);
      // make structure that holds all object position data
      let things = {};

      // players have ids and positions
      things.players = [];
      for(var i in this.players){
        let player = this.players[i];
        things.players.push({id:player.id, position:player.position});
      }

      // projectiles have ids and positions
      things.projectiles = [];
      for(var i in this.projectiles){
        let p = this.projectiles[i];
        things.projectiles.push({id:p.id, x:p.position.x, y:p.position.y, z:p.position.z});
      }

      this.send_to_all("objects",things);

    }
  }

  send_to_all(label, payload){
    for(let i in this.players){
      this.players[i].socket.emit(label,payload);
    }
  }

  send_to_all_but(socket, label, payload){
    for(let i in this.players){
      if(this.players[i].socket != socket){
        this.players[i].socket.emit(label,payload);
      }
    }
  }

}


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}