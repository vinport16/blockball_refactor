import { PointerLockControls } from '../pointerlock.js';
var camera, scene, renderer, controls;
var myMap;
var moveForward = false;
var moveBackward = false;
var moveLeft = false;
var moveRight = false;
var canJump = false;
var prevTime = performance.now();
var velocity = new THREE.Vector3();
var terminalVelocityY = -25;
var direction = new THREE.Vector3();
var vertex = new THREE.Vector3();
var color = new THREE.Color();
var sprint = false;
var startTime = Date.now();
var playerJustFell = false;
var loadStatus = 1;
var playerClass = "scout";
var reloadTime = 10000;
var playerSnowballCount = 1000;

var players = {};
var projectiles = {};

var path = []; // future locatifons (in order)
var target = false;
var graph = [];

init();
animate();

function init() {
    camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.05, 150 );
    camera.position.y = 10;
    scene = new THREE.Scene();
    //scene.background = new THREE.Color( 0x44ff00 );
    scene.background = new THREE.MeshLambertMaterial({ color: 0x663333 });
    scene.fog = new THREE.Fog( 0x99ff88, 100, 150 );
    var light = new THREE.HemisphereLight( 0xeeeeff, 0x777788, 0.75 );
    light.position.set( 0.5, 1, 0.75 );
    scene.add( light );

    add_crosshair(camera);

    controls = new PointerLockControls( camera );
    var blocker = document.getElementById( 'blocker' );
    var instructions = document.getElementById( 'instructions' );
    var leaderboard = document.getElementById( 'leaderboard' );
    var startButton = document.getElementById('startButton' );

    startButton.addEventListener( 'click', function () {
        var username = document.getElementById('userName').value;
        socket.emit("setUser", {name:username});
        controls.lock();
    }, false );

    document.getElementById('userName').value = "robot";
    socket.emit("setUser", {name:"robot"});

    controls.addEventListener( 'lock', function () {
        instructions.style.display = 'none';
        leaderboard.style.display = '';
        blocker.style.display = 'none';
    } );
    controls.addEventListener( 'unlock', function () {
        blocker.style.display = 'block';
        instructions.style.display = '';
        leaderboard.style.display = '';
    } );
    controls.getObject().position.x = 10;
    controls.getObject().position.y = 6;
    controls.getObject().position.z = 10;
    socket.emit("respawn");
    scene.add( controls.getObject() );
    var onClick = function ( event ) {
        if(loadStatus > 0.999 && controls.isLocked && playerSnowballCount > 0){
            var vector = new THREE.Vector3( 0, 0, - 1 );
            vector.applyQuaternion( camera.quaternion );
            
            socket.emit("launch", {dx:vector.x, dy:vector.y, dz:vector.z});
            loadStatus = 0;

            playerSnowballCount--;
            document.getElementById('snowballCount').innerHTML = playerSnowballCount;
        }
    }
    var onKeyDown = function ( event ) {
        switch ( event.keyCode ) {
            case 69: // e
                // shoot
                if(!playerJustFell){
                  onClick(event);
                }
                break;
            case 88: //x, change class
                if(playerClass == "scout"){
                  socket.emit("change class", "sniper");
                }else if(playerClass == "sniper"){
                  socket.emit("change class", "heavy");
                }else if(playerClass == "heavy"){
                  socket.emit("change class", "scout");
                }
                break;
            case 77: //m, change mode
                
                break;
        }
    };
    var onKeyUp = function ( event ) {
        switch ( event.keyCode ) {
            case 16: // shift
                camera.fov = 75;
                controls.speedFactor = 0.002;
                camera.updateProjectionMatrix();
            case 38: // up
            case 87: // w
                startTime = Date.now();
                sprint = false;
                moveForward = false;
                break;
            case 37: // left
            case 65: // a
                moveLeft = false;
                break;
            case 40: // down
            case 83: // s
                moveBackward = false;
                break;
            case 39: // right
            case 68: // d
                moveRight = false;
                break;
        }
    };

    document.addEventListener( 'keydown', onKeyDown, false );
    document.addEventListener( 'keyup', onKeyUp, false );
    document.addEventListener( 'click', onClick, false);


    var light = new THREE.DirectionalLight(0xffffff, 1);
        light.castShadow = true;
        light.shadowCameraVisible = true;
        light.shadow.camera.near = 100;
        light.shadow.camera.far = 200;
        light.shadow.camera.left = -20; // CHANGED
        light.shadow.camera.right = 20; // CHANGED
        light.shadow.camera.top = 20; // CHANGED
        light.shadow.camera.bottom = -20; // CHANGED

        light.position.set(-60, 200, 100); // CHANGED
        scene.add(light);
    //
    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setClearColor (0xffaadd, 1);
    document.body.appendChild( renderer.domElement );
    //
    window.addEventListener( 'resize', onWindowResize, false );
}

function add_crosshair(camera) {
  var material = new THREE.LineBasicMaterial({ color: 0xAAFFAA });
  // crosshair size
  var x = 0.005, y = 0.005;

  var geometry = new THREE.Geometry();

  // crosshair
  geometry.vertices.push(new THREE.Vector3(0, y, 0));
  geometry.vertices.push(new THREE.Vector3(0, -y, 0));
  geometry.vertices.push(new THREE.Vector3(0, 0, 0));
  geometry.vertices.push(new THREE.Vector3(x, 0, 0));
  geometry.vertices.push(new THREE.Vector3(-x, 0, 0));

  var crosshair = new THREE.Line( geometry, material );

  // place it in the center
  var crosshairPercentX = 50;
  var crosshairPercentY = 50;
  var crosshairPositionX = (crosshairPercentX / 100) * 2 - 1;
  var crosshairPositionY = (crosshairPercentY / 100) * 2 - 1;

  crosshair.position.x = crosshairPositionX * camera.aspect;
  crosshair.position.y = crosshairPositionY;

  crosshair.position.z = -0.25;

  camera.add( crosshair );
}
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

function getFromMap(mapPos){
    if(mapPos.x >= 0 && mapPos.y >= 0 && mapPos.z >= 0){
        if(mAP.length > mapPos.y && mAP[0].length > mapPos.z && mAP[0][0].length > mapPos.x){
            return mAP[mapPos.y][mapPos.z][mapPos.x];
        }
    }
    return 0;
}

function isColliding(position){
    var collidingWith = [];
    var checkspots = [];
    var mapPos = {};
    mapPos.x = ((position.x));
    mapPos.y = ((position.y-0.75));
    mapPos.z = ((position.z));
    mapPos.ox = false;
    mapPos.oz = false;

    let radius = (0.375);

    if(mapPos.x % 1 > 1-radius){
        mapPos.ox = mapPos.x+1;
    }else if(mapPos.x % 1 < radius){
        mapPos.ox = mapPos.x-1;
    }

    if(mapPos.z % 1 > 1-radius){
        mapPos.oz = mapPos.z+1;
    }else if(mapPos.z % 1 < radius){
        mapPos.oz = mapPos.z-1;
    }

    checkspots.push({x:Math.floor(mapPos.x),y:Math.floor(mapPos.y),z:Math.floor(mapPos.z)});
    if(mapPos.ox){checkspots.push({x:Math.floor(mapPos.ox),y:Math.floor(mapPos.y),z:Math.floor(mapPos.z)});}
    if(mapPos.oz){checkspots.push({x:Math.floor(mapPos.x),y:Math.floor(mapPos.y),z:Math.floor(mapPos.oz)});}
    if(mapPos.ox && mapPos.oz){checkspots.push({x:Math.floor(mapPos.ox),y:Math.floor(mapPos.y),z:Math.floor(mapPos.oz)});}

    checkspots.push({x:Math.floor(mapPos.x),y:Math.floor(mapPos.y)+1,z:Math.floor(mapPos.z)});
    if(mapPos.ox){checkspots.push({x:Math.floor(mapPos.ox),y:Math.floor(mapPos.y)+1,z:Math.floor(mapPos.z)});}
    if(mapPos.oz){checkspots.push({x:Math.floor(mapPos.x),y:Math.floor(mapPos.y)+1,z:Math.floor(mapPos.oz)});}
    if(mapPos.ox && mapPos.oz){checkspots.push({x:Math.floor(mapPos.ox),y:Math.floor(mapPos.y)+1,z:Math.floor(mapPos.oz)});}

    var collision = false;

    for(var i in checkspots){
        if(getFromMap(checkspots[i]) > 0){
            collision = true;
            collidingWith.push(checkspots[i]);
            return true;
        }
    }
    return false;
}

function distance( v1, v2 )
{
    var dx = v1.x - v2.x;
    var dy = v1.y - v2.y;
    var dz = v1.z - v2.z;

    return Math.sqrt( dx * dx + dy * dy + dz * dz );
}

function select_target(players, position){
    if(players.length < 1){
        return false;
    }

    let closest = players[0];
    players.forEach(function(player, p){
        if(distance(position, player.position) < distance(position, closest.position)){
            closest = player;
        }
    });

    return closest;
}

function launch_angle(dx, dy, v0, g){
    let s1 = Math.atan(
        (v0**2 + Math.sqrt(v0**4 - g * (2*dy*(v0**2) + g*(dx**2))))
        /(g*dx)
        );

    let s2 = Math.atan(
        (v0**2 - Math.sqrt(v0**4 - g * (2*dy*(v0**2) + g*(dx**2))))
        /(g*dx)
        );

    // best angle in raidians (or NaN if not possible)
    // prefer angle closer to 0 (horizontal)
    return Math.min(s1, s2);
}


function exact_hit(position, target){
    //position should be vector3

    let proj_speed = 40; // assume scout class. blocks/sec
    let gravity = 20; // value from server. blocks/sec/sec

    // establish delta Y, delta X (also get the XZ direction)
    let direction = target.clone().sub(position);
    let angleXZ = new THREE.Vector3(1,0,0).angleTo(direction.clone().setY(0));

    let deltaY = direction.y;
    let deltaX = direction.clone().setY(0).length();

    let angleXY = launch_angle(deltaX, deltaY, proj_speed, gravity);

    /*
Y
|
|
|         _ ---_ 
|      *         T
|    *
|  /
|_P____________________X
   */

    // check if shot is impossible (too far away)
    if(!angleXY){
        return false;
    }

    // get correct angle to shoot at
    let angle_vector = new THREE.Vector3(1,0,0);

    angle_vector.applyAxisAngle(new THREE.Vector3(0,0,1), angleXY);

    if(direction.z > 0){
        angle_vector.applyAxisAngle(new THREE.Vector3(0,-1,0), angleXZ);
    }else{
        angle_vector.applyAxisAngle(new THREE.Vector3(0,1,0), angleXZ);
    }
    

    return(angle_vector);
}

function can_hit_from(position, target){
    
    let proj_speed = 40; // assume scout class. blocks/sec
    let gravity = 20; // value from server. blocks/sec/sec

    let XZdistance = position.clone().sub(target).setY(0).length();

    let exact_hit_angle = exact_hit(position, target);

    // check if there is no possible hit angle (target too far away)
    if(!exact_hit_angle){
        return false;
    }

    let velocity = exact_hit_angle.normalize().multiplyScalar(proj_speed);

    let time_in_air = XZdistance/proj_speed;

    // proj starts at 0.8 above player position
    let proj_p = position.clone().add(new THREE.Vector3(0,0.8,0));

    let clear = true;
    let step_speed = 60; // per sec

    for(let i = 0; i < step_speed * time_in_air && clear; i++) {
        clear = getFromMap(proj_p.clone().floor()) == 0;
        velocity.add(new THREE.Vector3(0,-gravity/step_speed,0));
        proj_p.add(velocity.clone().multiplyScalar(1/step_speed));
    }

    return clear;
}

function key(position){
    return "x" + position.k + "y" + position.i + "z" + position.j;
}

function make_path(position, target){

    // convert world coordinates to map coordinates
    let pos = {i:Math.floor(position.y - 1.5), j:Math.floor(position.z), k:Math.floor(position.x)};

    if(!graph[pos.i][pos.j][pos.k] || graph[pos.i][pos.j][pos.k].length < 1){
        console.warn("bot has entered an untraversible position");
        socket.emit("respawn");
        return [];
    }

    // bredth first search for position with clear shot at target
    // if no clear shot is found, just move closer to target

    let num_nodes_to_explore = 200;
    pos.parent = false; // root node of path
    let explored = {};
    explored[key(pos)] = true;
    let to_explore = [pos];
    let best_node = pos;

    for(let i = 0; i < num_nodes_to_explore && to_explore.length > 0; i++){
        
        let node = to_explore.splice(0,1)[0];

        // check if you can hit the target
        let player_position = new THREE.Vector3(node.k, node.i, node.j).add(new THREE.Vector3(0,1.5,0))
        
        if(can_hit_from(player_position, target)){
            best_node = node;
            to_explore = []; // end search
        }else{
            // check if this is the new closest to player
            if(player_position.clone().sub(target).length() < (new THREE.Vector3(best_node.k, best_node.i, best_node.j).add(new THREE.Vector3(0,1.5,0)).clone().sub(target)).length()){
                best_node = node;
            }

            // add (not yet explored) children to to_explore
            let choices = graph[node.i][node.j][node.k];
            choices.forEach(function(choice, c){
                if(!explored[key(choice)]){
                    // lets make a shallow copy
                    let copy = {};
                    copy.i = choice.i;
                    copy.j = choice.j;
                    copy.k = choice.k;
                    // record parent
                    copy.parent = node;

                    to_explore.push(copy);
                    explored[key(copy)] = true;
                }
            });
        }
    }

    // construct path backwards from best_node
    // (not including first node (current position))
    let newPath = [];
    let node = best_node;
    while(node.parent){
        // convert map coordinates to world coordinates (+0.5)
        newPath.push(new THREE.Vector3(node.k+0.5, node.i+1.5, node.j+0.5));
        node = node.parent;
    }
    
    return newPath.reverse();

}

function animate() {
    requestAnimationFrame( animate );
    if(controls.getObject().position.y <= 2) {
      if(!playerJustFell){
        playerJustFell = true;
        velocity.y = 0;
        // controls.getObject().position.y = 1000;
        // controls.getObject().position.z = -500;
        socket.emit("playerFell")
      }
    }

    // move while pointer is not locked

    if ( true){//controls.isLocked === true ) {

        let time = performance.now();

        var originalPosition = controls.getObject().position.clone();

        // check for new target
        target = select_target(Object.values(players), originalPosition);

        // make a new path sometimes (more expensive, less frequent)
        // also make sure ur not in an invalid position when u do it
        if(Math.random() > 0.95 && !isColliding(originalPosition) && target){
            path = make_path(originalPosition, target.model.position.clone());

            let g = new THREE.Geometry();
            path.forEach(function(point, p){
                g.vertices.push(
                    new THREE.Vector3(point.x,point.y-1,point.z),
                );
            });

            scene.add(new THREE.Line(g, new THREE.LineBasicMaterial({color: 0x22aa22})));

        }
        
        if(path.length > 0){
            // u can move x far = (speed/deltaTime)
            let speed = 1; // blocks/sec
            let dist = speed/(time-prevTime);

            // DISTANCE MUST BE LESS THAN 1 BLOCK
            // (speed must be less than one block/frame)

            if(distance(originalPosition, path[0]) <= dist){
                // move there
                controls.getObject().position.x = path[0].x;
                controls.getObject().position.y = path[0].y;
                controls.getObject().position.z = path[0].z;

                // subtract from distance
                dist = dist - distance(originalPosition, path[0]);

                // pop that position out of the list
                path.splice(0,1);

            }

            if(path.length > 0){
                // move as far as u can towards next position
                let move = (path[0].clone().sub(controls.getObject().position)).normalize().multiplyScalar(dist);                
                let np = controls.getObject().position.add(move);

                

            }
            
            

        }

        
        
        if(!!target && loadStatus >= 1 && can_hit_from(controls.getObject().position.clone(), target.model.position.clone())){
            // calculate perfect trajectory
            let angle = exact_hit(controls.getObject().position.clone(), target.model.position.clone());

            // shoot at em
            socket.emit("launch", {dx:angle.x, dy:angle.y, dz:angle.z});

            loadStatus = 0;

        }
        
        
        


        // update reload status and bar
        loadStatus += (time-prevTime)/1000;//reloadTime;
        loadStatus = Math.min(loadStatus, 1);
        document.getElementById( 'status-bar' ).style.width = (loadStatus * 100) + "%";

        prevTime = time;

    }
    renderer.render( scene, camera );
}

var mAP = [[[]]];

socket.on("map", function(map, colors){
    mAP = map;

    var floorGeometry = new THREE.PlaneBufferGeometry( 2000, 2000, 100, 100 );
    var position = floorGeometry.attributes.position;
    // objects
    var boxGeometry = new THREE.BoxGeometry( 20, 20, 20 );
    //boxGeometry = boxGeometry.toNonIndexed(); // ensure each face has unique vertices
    //position = boxGeometry.attributes.position;

    var allBoxes = new THREE.Geometry();

    map.forEach(function(layer, i) {
        layer.forEach(function(line, j) {
            line.forEach(function(char, k) {
                if(map[i][j][k] > 0){
                  var boxMaterial;
                    var colorInfo = colors[map[i][j][k]];
                    //colorInfo in the format: ["#FFFFFF", 0.2]
                    var material = new THREE.MeshLambertMaterial({color: colorInfo[0]});
                    //Mix up the given color by adding a random number to the lightness. 
                    //The random number is within the givene color lightness +- range. 
                    material.color.offsetHSL(0,0, Math.random() * colorInfo[1] * 2 - colorInfo[1] )
                    boxMaterial = material;

                    var box = new THREE.BoxGeometry( 1, 1, 1 );
                    
                    var p = {};
                    p.x = k + 0.5;
                    p.y = i + 0.5;
                    p.z = j + 0.5;

                    // move box
                    box.translate(p.x,p.y,p.z);

                    var sides = makeSides(map,i,j,k,p);
                    var vbox = new THREE.Geometry();

                    for(var s in sides){
                        vbox.merge(sides[s]);
                    }

                    vbox.computeFaceNormals();
                    vbox.computeVertexNormals();
                    for(var s in vbox.faces){
                        vbox.faces[s].color = boxMaterial.color;
                        
                    }
                    allBoxes.merge(vbox);
                }
            });
        });
    });
    let mat = new THREE.MeshLambertMaterial({ vertexColors: THREE.FaceColors });
    var m = new THREE.Mesh(allBoxes, mat);
    // only render front side of shapes
    //m.material.side = THREE.DoubleSide; //uncomment to render both sides
    scene.add(m);

    // draw paths
    //scene.add(create_grid(map));
    create_grid(map);
});


function noBlockAt(x){
    return x == undefined || x == 0 || x < 0;
}

/**
    im sorry that this function is dumb but I don't care
    it works
**/
function makeSides(map,i,j,k,p){
    let sides = [];
    if(map[i+1] == undefined || noBlockAt(map[i+1][j][k])){
        // +y
        var square = new THREE.Geometry();
        square.vertices.push(new THREE.Vector3(p.x+0.5, p.y+0.5, p.z+0.5));
        square.vertices.push(new THREE.Vector3(p.x+0.5, p.y+0.5, p.z-0.5));
        square.vertices.push(new THREE.Vector3(p.x-0.5, p.y+0.5, p.z-0.5));
        square.vertices.push(new THREE.Vector3(p.x-0.5, p.y+0.5, p.z+0.5));
        square.vertices.push(new THREE.Vector3(p.x+0.5, p.y+0.5, p.z+0.5));

        square.faces.push(new THREE.Face3(0, 1, 2));
        square.faces.push(new THREE.Face3(0, 2, 3));

        sides.push(square);
    }
    if(map[i-1] == undefined || noBlockAt(map[i-1][j][k])){
        // -y
        var square = new THREE.Geometry();
        square.vertices.push(new THREE.Vector3(p.x+0.5, p.y-0.5, p.z+0.5));
        square.vertices.push(new THREE.Vector3(p.x+0.5, p.y-0.5, p.z-0.5));
        square.vertices.push(new THREE.Vector3(p.x-0.5, p.y-0.5, p.z-0.5));
        square.vertices.push(new THREE.Vector3(p.x-0.5, p.y-0.5, p.z+0.5));
        square.vertices.push(new THREE.Vector3(p.x+0.5, p.y-0.5, p.z+0.5));

        square.faces.push(new THREE.Face3(0, 2, 1));
        square.faces.push(new THREE.Face3(0, 3, 2));

        sides.push(square);
    }
    if(map[i][j+1] == undefined || noBlockAt(map[i][j+1][k])){
        // +z
        var square = new THREE.Geometry();
        square.vertices.push(new THREE.Vector3(p.x+0.5, p.y+0.5, p.z+0.5));
        square.vertices.push(new THREE.Vector3(p.x+0.5, p.y-0.5, p.z+0.5));
        square.vertices.push(new THREE.Vector3(p.x-0.5, p.y-0.5, p.z+0.5));
        square.vertices.push(new THREE.Vector3(p.x-0.5, p.y+0.5, p.z+0.5));
        square.vertices.push(new THREE.Vector3(p.x+0.5, p.y+0.5, p.z+0.5));

        square.faces.push(new THREE.Face3(0, 2, 1));
        square.faces.push(new THREE.Face3(0, 3, 2));

        sides.push(square);
    }
    if(map[i][j-1] == undefined || noBlockAt(map[i][j-1][k])){
        // -z
        var square = new THREE.Geometry();
        square.vertices.push(new THREE.Vector3(p.x+0.5, p.y-0.5, p.z-0.5));
        square.vertices.push(new THREE.Vector3(p.x+0.5, p.y+0.5, p.z-0.5));
        square.vertices.push(new THREE.Vector3(p.x-0.5, p.y+0.5, p.z-0.5));
        square.vertices.push(new THREE.Vector3(p.x-0.5, p.y-0.5, p.z-0.5));
        square.vertices.push(new THREE.Vector3(p.x+0.5, p.y-0.5, p.z-0.5));

        square.faces.push(new THREE.Face3(0, 2, 1));
        square.faces.push(new THREE.Face3(0, 3, 2));

        sides.push(square);
    }
    if(map[i][j][k+1] == undefined || noBlockAt(map[i][j][k+1])){
        // +x
        var square = new THREE.Geometry();
        square.vertices.push(new THREE.Vector3(p.x+0.5, p.y+0.5, p.z+0.5));
        square.vertices.push(new THREE.Vector3(p.x+0.5, p.y+0.5, p.z-0.5));
        square.vertices.push(new THREE.Vector3(p.x+0.5, p.y-0.5, p.z-0.5));
        square.vertices.push(new THREE.Vector3(p.x+0.5, p.y-0.5, p.z+0.5));
        square.vertices.push(new THREE.Vector3(p.x+0.5, p.y+0.5, p.z+0.5));

        square.faces.push(new THREE.Face3(0, 2, 1));
        square.faces.push(new THREE.Face3(0, 3, 2));

        sides.push(square);
    }
    if(map[i][j][k-1] == undefined || noBlockAt(map[i][j][k-1])){
        // -x
        var square = new THREE.Geometry();
        square.vertices.push(new THREE.Vector3(p.x-0.5, p.y-0.5, p.z+0.5));
        square.vertices.push(new THREE.Vector3(p.x-0.5, p.y-0.5, p.z-0.5));
        square.vertices.push(new THREE.Vector3(p.x-0.5, p.y+0.5, p.z-0.5));
        square.vertices.push(new THREE.Vector3(p.x-0.5, p.y+0.5, p.z+0.5));
        square.vertices.push(new THREE.Vector3(p.x-0.5, p.y-0.5, p.z+0.5));

        square.faces.push(new THREE.Face3(0, 2, 1));
        square.faces.push(new THREE.Face3(0, 3, 2));

        sides.push(square);
    }
    return sides;
}

function create_grid(map){
    
    var geom = new THREE.Geometry();
    
    map.forEach(function(layer, i) {
        graph.push([]);
        layer.forEach(function(line, j) {
            graph[i].push([]);
            line.forEach(function(char, k) {
                graph[i][j].push(false);
                if( is_traversable(i,j,k) ){
                    record_edges(i, j, k, graph);
                }
            });
        });
    });

    graph.forEach(function(layer, i) {
        layer.forEach(function(line, j) {
            line.forEach(function(char, k) {

                if(char){
                    char.forEach(function(edge, e){
                        let g = new THREE.Geometry();
                        g.vertices.push(
                            new THREE.Vector3(k+0.5, i+0.5, j+0.5),
                            new THREE.Vector3(edge.k+0.5, edge.i+0.5, edge.j+0.5)
                        );

                        geom.merge(g);
                    });
                    
                }
            });
        });
    });


    return(new THREE.LineSegments(geom, new THREE.LineBasicMaterial({color: 0x4400ff})));

}

function record_edges(i, j, k, graph){
    let links = [];

    // link forward, backwards, left, right
    if(is_traversable(i, j+1, k)){
        links.push({i:i, j:j+1, k:k});
    }
    if(is_traversable(i, j-1, k)){
        links.push({i:i, j:j-1, k:k});
    }
    if(is_traversable(i, j, k+1)){
        links.push({i:i, j:j, k:k+1});
    }
    if(is_traversable(i, j, k-1)){
        links.push({i:i, j:j, k:k-1});
    }

    // link stairs up
    if(is_traversable(i+1, j+1, k)){
        links.push({i:i+1, j:j+1, k:k});
    }
    if(is_traversable(i+1, j-1, k)){
        links.push({i:i+1, j:j-1, k:k});
    }
    if(is_traversable(i+1, j, k+1)){
        links.push({i:i+1, j:j, k:k+1});
    }
    if(is_traversable(i+1, j, k-1)){
        links.push({i:i+1, j:j, k:k-1});
    }

    // link stairs down
    if(is_traversable(i-1, j+1, k)){
        links.push({i:i-1, j:j+1, k:k});
    }
    if(is_traversable(i-1, j-1, k)){
        links.push({i:i-1, j:j-1, k:k});
    }
    if(is_traversable(i-1, j, k+1)){
        links.push({i:i-1, j:j, k:k+1});
    }
    if(is_traversable(i-1, j, k-1)){
        links.push({i:i-1, j:j, k:k-1});
    }

    graph[i][j][k] = links;
}

function is_traversable(i, j, k){
    return( getFromMap({x:k, y:i, z:j}) == 0 && getFromMap({x:k, y:i+1, z:j}) == 0 && getFromMap({x:k, y:i-1, z:j}) > 0 );
}

function drawPlayer(player){
    var cylinderGeometry = new THREE.CylinderBufferGeometry( 0.375, 0.375, 1.75, 10);
    cylinderGeometry = cylinderGeometry.toNonIndexed(); // ensure each face has unique vertices

    var material = new THREE.MeshLambertMaterial({ color: player.color });
    
    // to give the player a star texture, use newMaterial:
    //const loader = new THREE.TextureLoader();
    //let newMaterial = new THREE.MeshBasicMaterial({color: player.color, map: loader.load('/sprites/Star.png')});

    var model = new THREE.Mesh( cylinderGeometry, material );
    model.position.x = player.position.x;
    model.position.y = player.position.y;
    model.position.z = player.position.z;
    model.name = "MODEL FOR: " + player.id;

    player.userName = player.name;

    updatePlayerNameTag(player);

    player.model = model;
    players[player.id] = player;
    scene.add(model);
}


//Move this to a draw player function and call it from update player when player properties change
socket.on("new player", function(player){
    drawPlayer(player);
});

function updatePlayerColor(player){
    player.model.material.color.set(player.color);
}

function updatePlayerNameTag(player){
    if(player.usernameLabel){
        removeEntity(player.usernameLabel);
    }
    player.usernameLabel = makeTextSprite(player.userName);
    player.usernameLabel.position.set(player.position.x, player.position.y + 0.75, player.position.z);
    player.usernameLabel.name = "USERNAME FOR: " + player.id;
    scene.add( player.usernameLabel );
}

socket.on("updatePlayer", function(player){
    var p = players[player.id];
    p.name = player.name;
    p.userName = player.name;
    p.color = player.color;
    updatePlayerColor(p);
    updatePlayerNameTag(p);
});

function flash(player, color){
    player.flash = true;
    let flash = function(){
        if(player.flash){
            let original_color = player.color;
            player.color = color;
            updatePlayerColor(player);
            setTimeout(function(){
                player.color = original_color;
                updatePlayerColor(player);
                setTimeout(flash, 100);
            }, 100);
        }
    }
    flash();
}

socket.on("flash player", function(player_id, color){
    flash(players[player_id], color);
});

socket.on("stop flash", function(player_id){
    players[player_id].flash = false;
});

socket.on("set class", function(newClass){
    playerClass = newClass.name;
    reloadTime = newClass.reloadTime;
});

function removeEntity(object) {
    var selectedObject = scene.getObjectByName(object.name);
    scene.remove( selectedObject );
}

function makeTextSprite( message )
{
    var canvas = document.createElement('canvas');
    canvas.width = 256; // width and height must be powers of 2
    canvas.height = 256;
    var context = canvas.getContext('2d');
    var fontsz = 32;
    context.font = "Bold " + fontsz + "px " + "Ariel";
    
    // get size data (height depends only on font size)
    var metrics = context.measureText( message );
    var textWidth = metrics.width;
    
    // background color
    context.fillStyle   = "rgba(" + 255 + "," + 200 + ","
                                  + 100 + "," + 0.4 + ")";
    // border color
    context.strokeStyle = "rgba(" + 0 + "," + 0 + ","
                                  + 0 + "," + 0 + ")";
    roundRect(context, canvas.width/2 - textWidth/2, 0, textWidth, fontsz * 1.4, 6);
    // 1.4 is extra height factor for text below baseline: g,j,p,q.
    
    // text color
    context.fillStyle = "rgba(0, 0, 0, 1.0)";
    context.textAlign = "center";
    context.fillText( message, canvas.width/2, fontsz);
    
    // canvas contents will be used for a texture
    var texture = new THREE.Texture(canvas) 
    texture.needsUpdate = true;
    var spriteMaterial = new THREE.SpriteMaterial( 
        { map: texture} );
    var sprite = new THREE.Sprite( spriteMaterial );
    sprite.scale.set(30,25,1.0);
    sprite.center = new THREE.Vector2(0.5,0.5);

    return sprite;  
}

// function for drawing rounded rectangles
function roundRect(ctx, x, y, w, h, r) 
{
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.lineTo(x+w-r, y);
    ctx.quadraticCurveTo(x+w, y, x+w, y+r);
    ctx.lineTo(x+w, y+h-r);
    ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
    ctx.lineTo(x+r, y+h);
    ctx.quadraticCurveTo(x, y+h, x, y+h-r);
    ctx.lineTo(x, y+r);
    ctx.quadraticCurveTo(x, y, x+r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();   
}

function updatePlayer(player){
    var p = players[player.id];
    p.model.position.x = player.position.x;
    p.model.position.y = player.position.y;
    p.model.position.z = player.position.z;
   
    p.usernameLabel.position.x = player.position.x;
    p.usernameLabel.position.y = (player.position.y) + 0.75;
    p.usernameLabel.position.z = player.position.z;
}

socket.on("player left", function(id){
    scene.remove(players[id].model);
    scene.remove(players[id].usernameLabel);
    delete players[id];
});

function createProjectile(p){
    var geometry = new THREE.SphereBufferGeometry( 0.1, 0.25, 0.25 );
    var material = new THREE.MeshLambertMaterial( {color: 0xaaaaaa} );
    var sphere = new THREE.Mesh( geometry, material );

    sphere.position.x = p.x;
    sphere.position.y = p.y;
    sphere.position.z = p.z;

    p.object = sphere;
    scene.add( sphere );
    projectiles[p.id] = p;
}

function updateProjectile(p){
    if(projectiles[p.id] == null){
        createProjectile(p);
    }else{
        var o = projectiles[p.id].object;
        o.position.x = p.x;
        o.position.y = p.y;
        o.position.z = p.z;
    }
}


socket.on("objects",function(things){
    let p = things.players;
    for(var i in p){
        if(players[p[i].id] != null){
            updatePlayer(p[i]);
        }
    }

    p = things.projectiles;
    for(var i in p){
        updateProjectile(p[i]);
    }
});

socket.on("moveTo", function(position){
    console.log("gettin moved");

    // clear the path. gonna need a new one.
    path = [];

    controls.getObject().position.x = position.x;
    controls.getObject().position.y = (position.y + 1.5);
    controls.getObject().position.z = position.z;
    playerJustFell = false;
    socket.emit("moved", {});
});

socket.on("projectile burst", function(p){
    if(!projectiles[p.id]){
        createProjectile(p);
    }
    var o = projectiles[p.id].object;
    o.position.x = p.x;
    o.position.y = p.y;
    o.position.z = p.z;

    o.material = new THREE.MeshLambertMaterial( {color: 0xFF5511} );
    setTimeout(function(){
        scene.remove(projectiles[p.id].object);
    }, 1500);

});

socket.on("create item", function(item, type){
  if(!scene.getObjectByName(item.name)){
    let spriteMap;
    if(type == "flag"){
      spriteMap = new THREE.TextureLoader().load( "/sprites/Star.png" );
    }else if(type == "snowballPile"){
      //TODO: change this sprite
      spriteMap = new THREE.TextureLoader().load( "/sprites/snowballPile.png" );
    }
    let spriteMaterial = new THREE.SpriteMaterial( { map: spriteMap } );
    let sprite = new THREE.Sprite( spriteMaterial );

    sprite.position.x = item.position.x;
    sprite.position.y = item.position.y;
    sprite.position.z = item.position.z;

    //console.log(sprite.position);

    sprite.name = item.name;
    //sprite.id = item.id;
    sprite.scale.set(1,1,0.05);
    scene.add(sprite);
  }
});

socket.on("remove item", function(f){
  removeEntity(f);
});

socket.on("update snowball count", function(count){
  playerSnowballCount = count;
  document.getElementById('snowballCount').innerHTML = playerSnowballCount;
});

socket.on("leaderboard", function(board) {
    document.getElementById('leaderboard').innerHTML = board;
});

socket.on("restart screen", function(){
  controls.unlock();
});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendDataToServer(){
    while("Vincent" > "Michael"){
        await sleep(20);
        socket.emit("player position",{x:controls.getObject().position.x, y:(controls.getObject().position.y -0.75), z:controls.getObject().position.z});
    }
}

socket.emit("map");
sendDataToServer();
