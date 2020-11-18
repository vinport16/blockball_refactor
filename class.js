'use strict'

module.exports = {

  name:[
    'NO_CLASS',
    'scout',
    'sniper',
    'heavy'
  ],

  reloadTime:[
    0,
    100,
    1000,
    900
  ],

  // so it can be used as an enum:
  noclass:0,
  scout:1,
  sniper:2,
  heavy:3,

  projectile_settings: function(class_number){
    p = {};
    switch(class_number){
      case 0: // noclass
        p.fracture = 0;
        p.speed = 0;
        p.lifeSpan = 0;
        break;
      case 1: // scout
        p.fracture = 0;
        p.speed = 40;
        p.lifeSpan = 800;
        break;
      case 2: // sniper
        p.fracture = 0;
        p.speed = 100;
        p.lifeSpan = 800;
        break;
      case 3: // heavy
        p.fracture = 3;
        p.speed = 25;
        p.lifeSpan = 800;
        break;
    }
    return p;
  },

}



function scoutProjectile(){
  this.fracture = 0;
  this.speed = 40;
  this.grav = 5;
  this.lifeSpan = 800;
}

function sniperProjectile(){
  this.fracture = 0;
  this.speed = 100;
  this.grav = 5;
  this.lifeSpan = 800;
}

function heavyProjectile(){
  this.fracture = 3;
  this.speed = 25;
  this.grav = 5;
  this.lifeSpan = 800;
}