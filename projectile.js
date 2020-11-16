'use strict'

const GRAV = 5;
const MAX_LIFE = 800;

module.exports = class Projectile{
  
  constructor(position, velocity){
    this.position = position;
    this.velocity = velocity;

    this.life = MAX_LIFE;
    this.fracture = false;

  }

}