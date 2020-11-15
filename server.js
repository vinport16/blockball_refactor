var fs = require('fs');
var express = require('express');
var sio = require('socket.io');
var app = express();
var http = require('http').createServer(app);
var io = sio(http);

var port; //runs on heroku or localhost:3030 

//Server Specific Values: 
var MAPFILE = "";
MAPFILE = process.argv[3];
var SERVER_NAME = 'UNSET SERVER NAME';
var SERVER_DESCRIPTION = "NO DESCRIPTION";
var ALLOWGAMERESTARTS = true;


var mapFileContents;
var map;
var colors;
var snowballPiles;

fs.appendFileSync('pids.txt', process.pid + "\n");

var configFile = process.argv[2];
if(configFile == undefined){
  //console.error()
  console.error("Please specify a config file to use in the form: npm start config.txt");
  process.exit(1);
}

fs.readFile(configFile, "utf-8", function(err, data) {
  if (err) {
    console.log(err);
    console.log("!!!\nPlease Create a config.txt file with the following format:");
    console.log("line 0: PORT NUMBER");
    console.log("line 1: SERVER NAME");
    console.log("line 2: SERVER DESCRIPTION");
    console.log("line 3: MAP FILE");
    console.log("line 4: true/false FOR GAME RESTARTS")
    console.log("--------");
  }else{
    content = data.split("\n");
    port = content[0];
    SERVER_NAME = content[1];
    SERVER_DESCRIPTION = content[2];
    MAPFILE = content[3];
    if(content[4] == "true"){
      ALLOWGAMERESTARTS = true;
    }else{
      ALLOWGAMERESTARTS = false;
    }
  }

  mapFileContents = json2contents(MAPFILE);
  map = json2map(mapFileContents.map);
  colors = mapFileContents.colors;
  spawnAreas = json2spawn(mapFileContents.specialObjects.spawnAreas);

  snowballPiles = json2SnowballPiles(mapFileContents.specialObjects.snowballPiles);


  console.log("running on port", port);

  http.listen(port);

});


// this allows cross origin JSON requests (to get status message)
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// serve files from these directories
app.use('/sprites', express.static('sprites'));
app.use('/map_editor', express.static('map_editor'));
app.use('/server_list', express.static('server_list'));

app.get('/socket.io/socket.io.js', function(req, res){
  res.sendFile(__dirname + '/node_modules/socket.io/socket.io.js');
});

app.get('/client/script.js', function(req, res){
  res.sendFile(__dirname + '/client/script.js');
});

app.get('/three.js', function(req, res){
  res.sendFile(__dirname + '/node_modules/three/three.js');
});

app.get('/three.module.js', function(req, res){
    res.sendFile(__dirname + '/client/three.module.js');
  });

app.get('/pointerlock.js', function(req, res){
    res.sendFile(__dirname + '/pointerlock.js');
});

app.get('/client/blockball.js', function(req, res){
    res.sendFile(__dirname + '/client/blockball.js');
});

app.get('/client/messaging.js', function(req, res){
    res.sendFile(__dirname + '/client/messaging.js');
});

app.get("/play", function(req, res){
  res.sendFile(__dirname + '/client/index.html');
});

app.get("/", function(req, res){
  res.sendFile(__dirname + '/index.html');
});

app.get("/status.json", function(req, res){
  let status = {
    name: SERVER_NAME,
    description: SERVER_DESCRIPTION,
    players: players.length,
    maxPlayers: 999,
  };
  res.send(JSON.stringify(status));
});

function json2contents(file_name){
  var fs = require('fs');
  var contents = fs.readFileSync(file_name).toString();
  const mapFileContents = JSON.parse(contents);
  return mapFileContents;
}

function json2SnowballPiles(snowballPiles){
  if(snowballPiles == [] || snowballPiles == undefined){
    snowballPiles = [];
    var numberOfSnowballs = Math.max(2, parseInt(map.length / 20 + map[0].length / 20 + map[0][0].length / 20));
    for(var i = 0; i < numberOfSnowballs; i++){
      var newSnowballPile = {};
      newSnowballPile.id = i;
      newSnowballPile.name = "SNOWBALLPILE" + newSnowballPile.id
      newSnowballPile.amount = parseInt(Math.random() * 10 + 1);
      newSnowballPile.show = true;
      newSnowballPile.position = {x: 0, y: 0, z: 0};
      respawnSnowballPile(newSnowballPile)
      snowballPiles.push(newSnowballPile);
    }
  }else{
    for(var i = 0; i < snowballPiles.length; i++){
      snowballPiles[i].id = i;
      snowballPiles[i].name = "SNOWBALLPILE" + snowballPiles[i].id;
  
      var tempSnowballPileY = snowballPiles[i].position.y;
      var tempSnowballPileZ = snowballPiles[i].position.z;
  
      snowballPiles[i].position.y = tempSnowballPileZ;
      snowballPiles[i].position.z = tempSnowballPileY;
  
      //leaving in the original position value in case we want them to respawn in the same spot every time.
      //Maybe thats someting that the map maker can decide.
      snowballPiles[i].originalPosition = {};
      snowballPiles[i].originalPosition.x = snowballPiles[i].position.x;
      snowballPiles[i].originalPosition.y = snowballPiles[i].position.y;
      snowballPiles[i].originalPosition.z = snowballPiles[i].position.z;
  
      snowballPiles[i].show = true;
  
    }
  }
  
  return snowballPiles;
}

function json2spawn(inputSpawn){
  if(inputSpawn.length == 0){
    return ["All Locations Valid"];
  }else{
    var spawnAreas = [];
    inputSpawn.forEach(area => {
      spawnAreas.push(area.value);
    });

    return spawnAreas;
  }
  
}

function cloneArray(inputArr){
  return JSON.parse(JSON.stringify(inputArr));
}

function json2map(inputMap){
  var map = [];
  map = inputMap;
  
  console.log("Map Loaded:",map[0][0].length, "by", map[0].length, "by", map.length);

  //check to make sure its a valid map
  if(map.length < 3){
    console.err("The map is too short to spawn the player. Please add a map with at least 3 levels.");
  }
  
  return map;
}

// STEP SPEED
var wait = 20; // ms = 0.05 second = 50/sec

var players = [];
var nextId = 0;

var projectiles = [];
var pSpeed = 40;
var pGrav = 5;
var pLife = 800;

var classes = [
  "scout",
  "sniper",
  "heavy"
];

var reloadTime = {
  scout: 100,
  sniper: 1000,
  heavy: 900
};


io.on("connection", function(socket){
  var player = {};
  player.id = nextId++;
  player.name = "player " + player.id;
  player.socket = socket;
  player.snowballCount = 20;
  player.kills = [];
  player.deaths = [];
  player.position = {x:0,y:0,z:1000};
  player.class = "scout";
  player.respawning = false;
  player.team = 0;
  player.color = randomPlayerColor();

  respawn(player);
  console.log("player "+player.id+" logged in");
  setClass(player, player.class);
  players.push(player);

  socket.on("setUser", function(user){
    if(player.name != user.name){
        console.log(player.name + " changed their name to " + user.name);
        player.name = user.name;
        updateLeaderboard();
    }

    //player.color = user.color; //no longer allow player to set their own color
    for(i in players){
        if(players[i].id != player.id){
            players[i].socket.emit("updatePlayer", {id:player.id, name: player.name, color:player.color, position: player.position});
        }
    }
  });

  socket.on("map", function(){
    socket.emit("map", map, colors);
    for(var s in snowballPiles){
      if(snowballPiles[s].show){
        socket.emit("create item", snowballPiles[s], "snowballPile");
      }
    }
    socket.emit("c")
    for(i in players){
      if(players[i].id != player.id){
        player.socket.emit("new player", {id:players[i].id, position:players[i].position, name:players[i].name, color: players[i].color});
        players[i].socket.emit("new player", {id:player.id, position:player.position, name:player.name, color: player.color});
      }
    }
  });

  socket.on("respawn", function() {
    respawn(player);
  })

  socket.on("playerFell", function(){
      player.deaths.push([player.id]);
      updateLeaderboard();
      respawn(player);
  });

  socket.on("respawned", function(){
      player.respawning = false;
  });

  socket.on("player position", function(position){
    if(!player.respawning){
      player.position = position;
      if(snowballPiles.length > 0){
        snowballCollisionCheck(player);
      }
    }
  });

  socket.on("change class", function(newClass){
    if(classes.includes(newClass)){
      setClass(player, newClass);
    }
  });

  socket.on("disconnect",function(){
    for(i in players){
      if(players[i].id == player.id){
        players.splice(i,1);
      }
      if(i < players.length){
        players[i].socket.emit("player left", player.id);
      }
    }
    console.log(player.name + " left");
    tellEveryone(player.name + " left");
    updateLeaderboard();
  });

  socket.on("launch", function(angle){
    if(player.snowballCount > 0){
      player.snowballCount--;
      var p = getNewProjectile(player.class);
      p.id = nextId++;
      p.owner = player;
      p.count = 0;

      p.position = {};
      p.position.x = player.position.x;
      p.position.y = player.position.y + 14;
      p.position.z = player.position.z;

      p.velocity = {};
      p.velocity.x = angle.dx * p.speed;
      p.velocity.y = angle.dy * p.speed + 1;
      p.velocity.z = angle.dz * p.speed;

      p.position.x += angle.dx * 10;
      p.position.y += angle.dy * 10;
      p.position.z += angle.dz * 10;

      if(p.position.x != NaN && p.position.y != NaN && p.position.z != NaN){
        projectiles.push(p);
        moveProjectile(p);
      }
    }
  });

  socket.on("message", function(message){
    for(i in players){
      players[i].socket.emit("message", {from:player.name, text:message});
    }
  });

});

function randomPlayerColor(){
  return "hsl(" +(Math.random()*360)+ ", 50%, 50%)";
}

function setClass(player, newClass){
  player.class = newClass;
  player.socket.emit("set class", {name:player.class, reloadTime:reloadTime[player.class]});
  player.socket.emit("message", {from:"server", text:"Your class is now "+newClass});
}

function tellEveryone(messageText){
  for(i in players){
    players[i].socket.emit("message", {from:"server", text:messageText});
  }
}

function announceHit(hitPlayer, oPlayer){
  hitPlayer.socket.emit("message", {from: "server", text: oPlayer.name + " hit you!"});
  oPlayer.socket.emit("message", {from: "server", text: "you hit " + hitPlayer.name + "!"});
}

function snowballCollisionCheck(player){
  for(var i in snowballPiles){
    if(snowballPiles[i].show){
      var smallPlayerPos = {x: player.position.x / 20.0, y: player.position.y / 20.0, z: player.position.z/20.0};
      //check for collision:
      if(smallPlayerPos.x > snowballPiles[i].position.x-0.5 && smallPlayerPos.x < snowballPiles[i].position.x-0.5 + 1){
        if(smallPlayerPos.y > snowballPiles[i].position.y - 1 && smallPlayerPos.y < snowballPiles[i].position.y + 1){
          if(smallPlayerPos.z > snowballPiles[i].position.z-0.5 && smallPlayerPos.z < snowballPiles[i].position.z-0.5 + 1){
            //there is a collision. 
            for(var p in players){
              players[p].socket.emit("remove item", snowballPiles[i]);
            }
            respawnSnowballPile(snowballPiles[i]);
            player.snowballCount += snowballPiles[i].amount;
            player.socket.emit("update snowball count", player.snowballCount);
          }
        }
      }
    }
  }
}

function respawnSnowballPile(snowballPile){
  var newPos = getValidSpawnLocation();
  snowballPile.position.x = newPos.x;
  snowballPile.position.y = newPos.y + 1;
  snowballPile.position.z = newPos.z;
  for(var p in players){
    players[p].socket.emit("create item", snowballPile, "snowballPile");
  }
}

function projCollisionWithMap(p, map){
  mapPos = {};
  mapPos.x = Math.floor((p.position.x+10)/20);
  mapPos.y = Math.floor((p.position.y+10)/20);
  mapPos.z = Math.floor((p.position.z+10)/20);

  if(mapPos.x >= 0 && mapPos.y >= 0 && mapPos.z >= 0){
    if(map.length > mapPos.y && map[0].length > mapPos.z && map[0][0].length > mapPos.x){
      if(map[mapPos.y][mapPos.z][mapPos.x] > 0){
        return true;
      }
    }
  }

  return false;
}

function projCollision(p,map){
  if(projCollisionWithMap(p,map)){
    return true;
  }
  
  for(i in players){
    var player = players[i].position;
    var dz = player.z - p.position.z;
    var dx = player.x - p.position.x;

    var bottom = player.y - (35/2);
    var top = player.y + (35/2);
    if(Math.sqrt(dz*dz + dx*dx) < 7.5 && p.position.y < top && p.position.y > bottom && p.owner.id != players[i].id){
      
      announceHit(player, p.owner);
      player.deaths.push(p.owner.id);
      p.owner.kills.push(player.id);
      
      respawn(player);

      if(ALLOWGAMERESTARTS && p.owner.kills.length >= 20){
        for(var i in players){
          players[i].socket.emit("restart screen");
          if(players[i].id != p.owner.id){
            players[i].socket.emit("message", {from:"server", text: "Game Over. " + player.name + " won! Press Play to start a new game."});
          }else{
            players[i].socket.emit("message", {from:"server", text:"You win! Press Play to start a new game."});
          }
        }
        restartGame();
      }
      updateLeaderboard();

      return true;
    }
  }
  return false;
}

function respawn(p){
  p.respawning = true;
  
  var newLocation = getValidSpawnLocation();

  //console.log("found new point");

  p.socket.emit("updateRespawnLocation", newLocation);
  p.position = {x:-1000, y:1000, z:-1000};
}

function isEmpty(x, y, z){
  mapPos = {x: x, y: y, z: z};
  if(mapPos.x >= 0 && mapPos.y >= 0 && mapPos.z >= 0){
    if(map.length > mapPos.y && map[0].length > mapPos.z && map[0][0].length > mapPos.x){
      if(map[mapPos.y][mapPos.z][mapPos.x] > 0){
        return false;
      }
    }
  }
  return true;
}

function getValidSpawnLocation(){
  var x, y, z = 0;
  while(true){

    y = Math.floor(Math.random()*map.length);
    z = Math.floor(Math.random()*map[0].length);
    x = Math.floor(Math.random()*map[0][0].length);

    if(!isEmpty(x,y,z) && isEmpty(x,y+1,z) && isEmpty(x,y+2,z)){
      return {x: x, y: y, z: z};
    }
  }
}

function announcePosition(p){
  for(i in players){
    players[i].socket.emit("projectile",{id:p.id, x:p.position.x, y:p.position.y, z:p.position.z});
  }
}

function announceBurst(p){
  for(i in players){
    players[i].socket.emit("projectile burst",{id:p.id, x:p.position.x, y:p.position.y, z:p.position.z});
  }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function normalize(v){
  let magnitude = Math.sqrt((v.x * v.x) + (v.y * v.y) + (v.z * v.z));
  return {x: v.x/magnitude, y: v.y/magnitude, z: v.z/magnitude};
}

function randomAngle(){
  let v = {};
  v.x = Math.random() - 0.5;
  v.y = Math.random() - 0.5;
  v.z = Math.random() - 0.5;
  return normalize(v);
}

function fracture(p){
  let num_fractures = 4;
  let fracture_speed = 10;
  for(let i = 0; i < num_fractures; i++){
    let newp = {};
    newp.id = nextId++;
    newp.owner = p.owner;
    newp.count = 0;

    newp.position = {};
    newp.position.x = p.position.x;
    newp.position.y = p.position.y;
    newp.position.z = p.position.z;

    newp.velocity = randomAngle();
    newp.velocity.x *= fracture_speed;
    newp.velocity.y *= fracture_speed;
    newp.velocity.z *= fracture_speed;

    newp.fracture = p.fracture - 1;
    projectiles.push(newp);
    moveProjectile(newp);
  }
}

function moveProjectileToHitLocation(p){
    // start moving the projectile backwards, out of the block
    let direction = -1;
    let fraction = 0.5;
    for(let i = 0; i < 5; i++){

      //move
      p.position.x += p.velocity.x * pSpeed/4 * wait/1000 * fraction * direction;
      p.position.y += p.velocity.y * pSpeed/4 * wait/1000 * fraction * direction;
      p.position.z += p.velocity.z * pSpeed/4 * wait/1000 * fraction * direction;

      if(projCollisionWithMap(p,map)){
        direction = -1;
      }else{
        direction = 1;
      }
      fraction = fraction/2;
    }
}

function getNewProjectile(type){
  if(type == "scout"){
    return new scoutProjectile();
  }else if(type == "sniper"){
    return new sniperProjectile();
  }else if(type == "heavy"){
    return new heavyProjectile();
  }
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
  this.speed = 30;
  this.grav = 6;
  this.lifeSpan = 800;
}



// calculate projectile collisions with higher precision than step speed
async function moveProjectile(p){
  var hit = false;
  while(!hit && p.count < pLife){
    await sleep(wait/4);

    p.velocity.y -= pGrav * wait/1000;

    p.position.x += p.velocity.x * pSpeed/4 * wait/1000;
    p.position.y += p.velocity.y * pSpeed/4 * wait/1000;
    p.position.z += p.velocity.z * pSpeed/4 * wait/1000;

    if(projCollision(p,map)){
      hit = true;
      if(projCollisionWithMap(p,map)){
        moveProjectileToHitLocation(p);
      }else{
        // hit was with player, do not find exact hit location
      }
      if(p.fracture > 0){
        fracture(p);
      }
    }

    p.count++;
  }

  announceBurst(p);

  // remove projectile from list
  for(var i in projectiles){
    if(projectiles[i].id == p.id){
      projectiles.splice(i,1);
    }
  }

}

function restartGame(){
  projectiles = [];

  resetPlayers();
  updateLeaderboard();
  
}

function resetPlayers(){
  for(var i in players){
    players[i].snowballCount = 20;
    players[i].kills = [];
    players[i].deaths = [];
    players[i].position = {x:0,y:0,z:1000};
    players[i].class = "scout";
    players[i].team = 0;
    players[i].respawning = false;

    setClass(player, player.class);

    respawn(player);
  }
}

function updateLeaderboard(){
  var leaderboard = "Leaderboard:<br>";
  var board = players.map(function(p){
    return {name:p.name,kills:p.kills,deaths:p.deaths};
  });
  board = board.sort(function(a,b){
    return (b.kills.length * b.kills.length / b.deaths.length) - (a.kills.length * a.kills.length / a.deaths.length);
  });

  //Add players to leaderboard string
  for(var i = 0; i < board.length; i++) {
    leaderboard += board[i].name + ": " + board[i].kills.length + " K, " + board[i].deaths.length + " D" + "<br>"
  }
  for(i in players){
    players[i].socket.emit("leaderboard",leaderboard);
  }
}


async function reportEverything(){
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

reportEverything();











