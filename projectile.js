'use strict'

const MAX_AGE = 800;
const NUM_FRACTURES = 4;
const FRACTURE_SPEED = 10;

module.exports = class Projectile{
  
  constructor(id, owner, position, velocity){
    this.id = id;
    this.owner = owner;

    this.position = position;
    this.velocity = velocity;

    this.age = 0;
    this.max_age = MAX_AGE;
    this.fracture = false;

  }

  speed(){
    return math.sqrt(this.velocity.x**2 + this.velocity.y**2 + this.velocity.z**2);
  }

  move_to_hit_location(map){
    // start moving the projectile backwards, out of the block
    let direction = -1;
    let fraction = 0.5;
    for(let i = 0; i < 5; i++){

      //move
      this.position.x += this.velocity.x / this.speed() * fraction * direction;
      this.position.y += this.velocity.y / this.speed() * fraction * direction;
      this.position.z += this.velocity.z / this.speed() * fraction * direction;

      if(projCollisionWithMap(p,map)){
        direction = -1;
      }else{
        direction = 1;
      }
      fraction = fraction/2;
    }
  }

  fracture(game){

    for(let i = 0; i < NUM_FRACTURES; i++){
      
      let id = game.nextId++;
      let owner = this.owner;

      let position = {};
      position.x = this.position.x;
      position.y = this.position.y;
      position.z = this.position.z;

      let velocity = this.random_angle();
      velocity.x *= FRACTURE_SPEED;
      velocity.y *= FRACTURE_SPEED;
      velocity.z *= FRACTURE_SPEED;

      let newp = new Projectile(id, owner, position, velocity);
      newp.fracture = this.fracture - 1;

      game.projectiles.push(newp);
      game.move_projectile(newp);
    }
  }

  normalize(v){
    let magnitude = Math.sqrt((v.x * v.x) + (v.y * v.y) + (v.z * v.z));
    return {x: v.x/magnitude, y: v.y/magnitude, z: v.z/magnitude};
  }

  random_angle(){
    let v = {};
    v.x = Math.random() - 0.5;
    v.y = Math.random() - 0.5;
    v.z = Math.random() - 0.5;
    return this.normalize(v);
  }

}