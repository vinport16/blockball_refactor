'use strict'

module.exports = class Player{
  
  constructor(socket){
    this.id = nextId++;
    this.name = "player " + player.id;
    this.socket = socket;
    this.snowballCount = 20;
    this.kills = [];
    this.deaths = [];
    this.position = {x:0,y:0,z:1000};
    this.class = "scout";
    this.respawning = false;
    this.color = this.randomColor();
  }

  randomColor(){
    return "hsl(" +(Math.random()*360)+ ", 50%, 50%)";
  }

}

var nextId = 0;