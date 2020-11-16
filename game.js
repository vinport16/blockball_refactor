'use strict'
var Map = require('./map.js');
var Player = require('./player.js');

module.exports = class Game{
  
  constructor(map){
    this.map = map;
    this.players = [];
    this.projectiles = [];
    
    // STEP SPEED
    this.wait = 20; // ms = 0.05 second = 50/sec

    this.classes = [
      "scout",
      "sniper",
      "heavy"
    ];

    this.reloadTime = {
      scout: 100,
      sniper: 1000,
      heavy: 900
    };

    this.reportEverything();
  }




  async reportEverything(){
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


}

var nextId = 0;


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}