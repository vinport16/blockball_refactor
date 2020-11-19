'use strict'

var Class = require('./class.js');
var Projectile = require('./projectile.js');

module.exports = class Player{
  
  constructor(socket){
    this.id = nextId++;
    this.name = "player " + this.id;
    this.socket = socket;
    this.snowballCount = 0;
    this.kills = [];
    this.deaths = [];
    this.position = {x:0,y:0,z:1000};
    this.class = Class.scout;
    this.respawning = false;
    this.color = this.randomColor();

    socket.on("moved", this._moved);
    socket.on("player position", this._update_position);

  }

  setClass(c){
    this.class = c;
    this.socket.emit("set class", {name:Class.name[c], reloadTime:Class.reloadTime[c]});
    this.socket.emit("message", {from:"server", text:"Your class is now "+Class.name[c]});
  }

  move_to(position){
    this.position = position;
    this.socket.emit("moveTo", position);
  }

  create_projectile(game, angle){
    if(this.snowballCount > 0){
      this.snowballCount--;
      let p = Class.projectile_settings(this.class);
      
      let id = game.nextId++;
      let owner = this;

      let position = {};
      position.x = this.position.x;
      position.y = this.position.y + 1.7;
      position.z = this.position.z;

      let velocity = {};
      velocity.x = angle.dx * p.speed;
      velocity.y = angle.dy * p.speed + 1;
      velocity.z = angle.dz * p.speed;

      position.x += angle.dx * 0.5;
      position.y += angle.dy * 0.5;
      position.z += angle.dz * 0.5;

      let projectile = new Projectile(id, owner, position, velocity);
      projectile.fractures = p.fractures;

      console.log("its here", projectile.position);
      
      game.projectiles.push(projectile);
      game.move_projectile(projectile);
    }
  }

  randomColor(){
    return "hsl(" +(Math.random()*360)+ ", 50%, 50%)";
  }

  _moved(){
    this.respawning = false;
  }

  _update_position(position){
    if(!this.respawning){
      if(Math.random() > 0.99){
        console.log(position);
      }
      this.position = position;
    }
  }

}

var nextId = 0;