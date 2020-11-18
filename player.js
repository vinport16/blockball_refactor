'use strict'

var Class = require('./class.js');

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

  randomColor(){
    return "hsl(" +(Math.random()*360)+ ", 50%, 50%)";
  }

  _moved(){
    this.respawning = false;
  }

  _update_position(position){
    if(!this.respawning){
      this.position = position;
    }
  }

}

var nextId = 0;