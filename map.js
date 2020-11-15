'use strict'

module.exports = class Map{

  // grid dimensions are grid[y][z][x]

  constructor(file_name){
    let fs = require('fs');
    let contents = fs.readFileSync(file_name).toString();
    let allInfo = JSON.parse(contents);
    
    this.grid = allInfo.map;

    Object.defineProperty(this, "size_x", {
      value: this.grid[0][0].length,
      writable: false
    });
    Object.defineProperty(this, "size_y", {
      value: this.grid.length,
      writable: false
    });
    Object.defineProperty(this, "size_z", {
      value: this.grid[0].length,
      writable: false
    });


    this.colors = allInfo.colors;
    
    console.log("Map Loaded:",this.grid[0][0].length, "by", this.grid[0].length, "by", this.grid.length);

    //check to make sure its a valid map
    if(!this.is_valid()){
      console.error("The map is too short to spawn the player. Please add a map with at least 3 levels.");
    }
    
  }

  is_valid(){
    return this.size_y > 3;
  }

  // call with (x, y, z) or (position)
  get(...args){
    let position = args_to_pos(args);

    if(this.is_in_bounds(position)){
      return this.grid[position.y][position.z][position.x];
    }else{
      return 0;
    }
  }

  // call with (x, y, z) or (position)
  is_empty(...args){
    let mapPos = args_to_pos(args);
    return !this.is_in_bounds(mapPos) || this.grid[mapPos.y][mapPos.z][mapPos.x] < 0.5
  }

  // call with (x, y, z) or (position)
  is_in_bounds(...args){
    let mapPos = args_to_pos(args);
    return (mapPos.x >= 0 && mapPos.y >= 0 && mapPos.z >= 0) && (this.size_y > mapPos.y && this.size_z > mapPos.z && this.size_x > mapPos.x);
  }

  is_valid_spawn_location(...args){
    let mapPos = args_to_pos(args);
    return !this.is_empty(mapPos) && this.is_empty(mapPos.x, mapPos.y+1, mapPos.z) && this.is_empty(mapPos.x, mapPos.y+2, mapPos.z);
  }


  hello(){
    console.log("hello!");
  }

}


// PRIVATE METHODS



// call with [x, y, z] or [position]
// returns {x y z} position object
function args_to_pos(...args){
  if(args[0].length == 1){
    return args[0][0];
  }else if(args[0].length == 3){
    return {x:args[0][0], y:args[0][1], z:args[0][2]};
  }else{
    console.error("wrong number of arguments for position");
    return;
  }
}






