//#region map_properties
map = [];
matrix = 5; //size of map
field_size = 250; // size of one field
obj_types_count = 4; // types of objects
arena_size = (matrix*field_size)-1; // size of map

spawn_objects = 1;
id_pool_range = 255; // sqrt count of available id's for objects
//#endregion

//////////////////////////////////////////////////////////////////

//#region debug_options

debuging = 0; // debug tools like map fields borders

//#endregion

//////////////////////////////////////////////////////////////////

//#region game_properties
min_speed = 40; // start speed of player (m/s)
max_speed = 150; // max speed of player (m/s)
player_radius = 30; // player's hitbox
health = 100; // start health
weight = 1; // start weight
score = 0; // start score


//#endregion

///////////////////////////////////////////////////////////////////

//#region server_variables
id_pool = [];
z = 0;

var n = {
	start_pos : 0,
	end_pos: 1,
	players: 2,
	food: 3,
	holes: 4,
	fiz_obj: 5,
	marker: 6

}; // contains indexes of map
map_prop = obj_types_count+3;
var as_n = {
	3 : 0,
	2 : 1,
	4 : 2,
	5 : 3,
	6 : 4
}
var type_to_map = {
	1 : 2,
	0 : 3,
	2 : 4,
	3 : 5,
	4 : 6
}
var p_n = {
	name: 0,
	map_x: 1,
	map_y: 2,
	pos_x: 3,
	pos_y: 4,
	score: 5,
	health: 6,
	weight: 7,
	speed: 8,
	m_accel: 9,
	tru_accel: 10,
	cur_speed: 11,
	id_x: 12,
	id_y: 13


} // contains indexes of players array

players = new Map();
reverse_players = new Map();
send_queue = []; // data querries to process
data_queue = [];  // prepared data to send to client
positions = new Map(); // contains mouse position of every player
fiz_obj = new Map(); //all physics objects
players_actions = [];
player_queue = new Map();
player_queue.full = false;


function prop(mass = 1, accel = [0,0], x, y, type, id, prop = null) {
	this.mass = mass;
	this.accel = accel;
	this.prop = prop;
	this.x = x;
	this.y = y;
	this.type = type;
	this.map_type = type_to_map[type];
	this.min_speed = 0;
	this.max_speed = 0;
	this.friction_multiplier = 0;
	this.radius = 0;
	this.id = id;
	this.last_step = 0;
	switch(this.type){
		case 0:
			break;
		case 1:

			this.max_speed = 300;
			this.min_speed = 40;
			this.friction_multiplier = 0.5;
			this.radius = 30;
			break;
		case 3:
			this.max_speed = 300;
			this.min_speed = 40;
			this.friction_multiplier = 0.5;
			this.radius = 30;
			break;
	}

	this.max_force = () =>{
		return this.mass*this.max_speed;
	}
	this.get_map_obj = () =>{
		return map[this.x][this.y][this.map_type].get(this.id);
	}
	this.pos_x = () =>{
		return map[this.x][this.y][this.map_type].get(this.id)[0];
	}
	this.pos_y = () =>{
		return map[this.x][this.y][this.map_type].get(this.id)[1];
	}
	this.pos = () =>{
		return map[this.x][this.y][this.map_type].get(this.id);
	}
	this.mod_pos_x = (v) =>{
		map[this.x][this.y][this.map_type].get(this.id)[0] += v;
	}
	this.mod_pos_y = (v) =>{
		map[this.x][this.y][this.map_type].get(this.id)[1] += v;
	}
	this.move = () =>{
		o = this.get_map_obj();
		o[0] += this.accel[0] * game_clock;
		o[1] += this.accel[1] * game_clock;
		if(this.accel[0] > 0 && o[0] > map[this.x][this.y][n.end_pos][0])
			this.map_move_right();
		else if(this.accel[0] < 0 && o[0] < map[this.x][this.y][n.start_pos][0])
			this.map_move_left();
		if(this.accel[1] > 0 && o[1] > map[this.x][this.y][n.end_pos][1])
			this.map_move_down();
		else if(this.accel[1] < 0 && o[1] < map[this.x][this.y][n.start_pos][1])
			this.map_move_up();
		if(o[0] >= arena_size){
			o[0] = arena_size;
			this.stop_moving(0);
		}
		else if(o[0] <= 0){
			o[0] = 0;
			this.stop_moving(0);
		}
		if(o[1] >= arena_size){
			o[1] = arena_size;
			this.stop_moving(1);
		}
		else if(o[1] <= 0){
			o[1] = 0;
			this.stop_moving(1);
		}

	}
	this.map_move_right = () =>{
		if(this.y < matrix-1){
			map[this.x][this.y+1][this.map_type].set(this.id, map[this.x][this.y][this.map_type].get(this.id));
			map[this.x][this.y][this.map_type].delete(this.id);

			send_queue.push([3, this.type, this.x, this.y++, this.id]);
			if(this.type == 1){
				data_queue.push([reverse_players.get(this.id), new Uint8Array([(2<<4)+1])]);
				send_queue.push([0, this.id, this.x, this.y, 1]);

			}
		}
	}
	this.map_move_left = () =>{
		if(this.y > 0){
			map[this.x][this.y-1][this.map_type].set(this.id, map[this.x][this.y][this.map_type].get(this.id));
			map[this.x][this.y][this.map_type].delete(this.id);
			send_queue.push([3, this.type, this.x, this.y--, this.id]);
			if(this.type == 1){
				data_queue.push([reverse_players.get(this.id), new Uint8Array([2<<4])]);
				send_queue.push([0, this.id, this.x, this.y, 0]);
			}
		}
	}
	this.map_move_up = () =>{
		if(this.x > 0){
			map[this.x-1][this.y][this.map_type].set(this.id, map[this.x][this.y][this.map_type].get(this.id));
			map[this.x][this.y][this.map_type].delete(this.id);
			send_queue.push([3, this.type, this.x--, this.y, this.id]);
			if(this.type == 1){
				data_queue.push([reverse_players.get(this.id), new Uint8Array([(2<<4)+2])]);
				send_queue.push([0, this.id, this.x, this.y, 2]);
			}
		}
	}
	this.map_move_down = () =>{
		if(this.x < matrix-1){
			map[this.x+1][this.y][this.map_type].set(this.id, map[this.x][this.y][this.map_type].get(this.id));
			map[this.x][this.y][this.map_type].delete(this.id);
			send_queue.push([3, this.type, this.x++, this.y, this.id]);
			if(this.type == 1){
				data_queue.push([reverse_players.get(this.id), new Uint8Array([(2<<4)+3])])
				send_queue.push([0, this.id, this.x, this.y, 3]);
			}
		}
	}

	this.apply_friction = () =>{
		f = this.force();
		r_f = [(-f[0]/this.friction_multiplier)*game_clock, (-f[1]/this.friction_multiplier)*game_clock];
		this.apply_force(r_f);


	}
	this.force = () => {
		return [this.accel[0]*this.mass, this.accel[1]*this.mass];
	};
	this.apply_lim_force = (f) =>{
		t_f = this.force();
		max_force = this.max_force();
		ad_x = f[0]*this.min_speed*this.mass*(this.max_speed/7)*game_clock;
		ad_y = f[1]*this.min_speed*this.mass*(this.max_speed/7)*game_clock;
		f_s = Math.abs(t_f[0]) + Math.abs(t_f[1]);


		if(f_s > max_force){
			s = Math.abs(t_f[0] + ad_x) + Math.abs(t_f[1] + ad_y);
			if(s < f_s){
				ad_x += t_f[0];
				ad_y += t_f[1];
			}else{
				p = f_s/s;
				ad_x += t_f[0];
				ad_y += t_f[1];
				ad_x *= p;
				ad_y *= p;
			}
		}else{
			s = Math.abs(t_f[0] + ad_x) + Math.abs(t_f[1] + ad_y);
			if(s > max_force){
				p = max_force/s;
				ad_x += t_f[0];
				ad_y += t_f[1];
				ad_x *= p;
				ad_y *= p;
			}else{
				ad_x += t_f[0];
				ad_y += t_f[1];
			}
		}


		this.accel[0] = ad_x/this.mass;
		this.accel[1] = ad_y/this.mass;

	}
	this.stop_moving = (i) =>{
		this.accel[i] = 0;
	}
	this.apply_force = (f) => {
		t_f = this.force();
		t_f[0] += f[0];
		t_f[1] += f[1];
		this.accel[0] = t_f[0]/this.mass;
		this.accel[1] = t_f[1]/this.mass;
	};
	this.isMoving = () =>{
		return this.accel[1] != 0 || this.accel[0] != 0;
	}

};

Vector = {
	dot_prod : function (v1, v2){
		return v1[0]*v2[0]+v1[1]*v2[1];
	},
	add : function(v1, v2){
		return [v1[0]+v2[0], v1[1]+v2[1]];
	},
	sub : function(v1, v2){
		return [v1[0]-v2[0], v1[1]-v2[1]];
	},
	mlt : function(v1, f){
		return [v1[0]*f, v1[1]*f];
	},
	normalize : function(v){
		s = 1/(Math.abs(v[0]) + Math.abs(v[1]));
		return [v[0] * s, v[1] * s];
	},
	div : function(v, f){
		return [v[0] / f, v[1] / f];
	},
	normal : function(p, center, radius){
		return this.div(this.sub(p, center), radius)
	},
	crossVect: function(v){
		x = v[0];
		y = v[1];
		y1 = -x/y;
		return this.normalize([1, y1]);
	}


}
//#endregion

///////////////////////////////////////////////////////////////////
//#region game_clocks
game_clock = 0.01;
timeout = 10;

setInterval(client_sender, 10); // sends data to client from data_queue
setInterval(send_queue_preparing, 10); // prepares data to send, uses send_queue
setInterval(objects_update, 30);

//setInterval(main_game_clock, game_clock*1000);
setTimeout(main_game_clock, timeout);
next_step = true;
//#endregion
///////////////////////////////////////////////////////////////////

/* Reset = "\x1b[0m"
Bright = "\x1b[1m"
Dim = "\x1b[2m"
Underscore = "\x1b[4m"
Blink = "\x1b[5m"
Reverse = "\x1b[7m"
Hidden = "\x1b[8m"

FgBlack = "\x1b[30m"
FgRed = "\x1b[31m"
FgGreen = "\x1b[32m"
FgYellow = "\x1b[33m"
FgBlue = "\x1b[34m"
FgMagenta = "\x1b[35m"
FgCyan = "\x1b[36m"
FgWhite = "\x1b[37m"

BgBlack = "\x1b[40m"
BgRed = "\x1b[41m"
BgGreen = "\x1b[42m"
BgYellow = "\x1b[43m"
BgBlue = "\x1b[44m"
BgMagenta = "\x1b[45m"
BgCyan = "\x1b[46m"
BgWhite = "\x1b[47m"
 */

//#region map_preparing
const { PerformanceObserver, performance } = require('perf_hooks');
time = performance.now();
console.clear();
console.log("Preparing map...");
prepare_map();
prepare_server();
console.log("Map prepared in %s" + Math.round( (performance.now() - time)*10)/10 + "ms%s", "\x1b[42m", "\x1b[0m");
console.log("ID_POOL["+id_pool_range+"]["+id_pool_range+"]: " + id_pool.length * id_pool[255].length );


function prepare_map(){

	x = 0;
	y = 0;
	for(i = 0; i < matrix; i++){
		map[i] = [];
		x = 0;
		for(j = 0; j < matrix; j++){
			map[i][j] = [];
			map[i][j].push([x, y]);
			x += field_size-1;
			map[i][j].push([x, y+field_size-1])
			m = new Map();
			map[i][j].push(m);
			for(k = 0; k < obj_types_count; k++){
				m1 = new Map();
				map[i][j].push(m1);
			}
			x++;
		}
		y += field_size;
	}

}
function prepare_server(){

	for(i = 0; i <= id_pool_range; i ++){
		id_pool[i] = [];
		for(j = 0; j <= id_pool_range; j++){

			id_pool[i].push(j);
		}
	}
	if(spawn_objects)
	for(i = 0; i < matrix; i++){
		for(j = 0; j < matrix; j++){
				x = Math.floor((Math.random()*field_size));
				y = Math.floor((Math.random()*field_size));
				map[i][j][n.holes].set([z, (id_pool[z].splice(0,1))[0]], [x+map[i][j][n.start_pos][0], y+map[i][j][n.start_pos][1], 50] );
				if(id_pool[z].length == 0)
					z++;
				if(!debuging){
					for(k = 0; k < 5; k++){
						x = Math.floor((Math.random()*field_size));
						y = Math.floor((Math.random()*field_size));
						map[i][j][n.food].set([z, (id_pool[z].splice(0,1))[0]], [x+map[i][j][n.start_pos][0], y+map[i][j][n.start_pos][1]]);

						if(id_pool[z].length == 0)
							z++;
					}
				}else{
					for(k = 0; k < 2; k++){


						if(id_pool[z].length == 0)
							z++;
						x = Math.floor((Math.random()*field_size));
						y = 0;
						map[i][j][n.food].set([z, (id_pool[z].splice(0,1))[0]], [x+map[i][j][n.start_pos][0], y+map[i][j][n.start_pos][1]]);


						if(id_pool[z].length == 0)
							z++;
						x = Math.floor((Math.random()*field_size));
						y = 249;
						map[i][j][n.food].set([z, (id_pool[z].splice(0,1))[0]], [x+map[i][j][n.start_pos][0], y+map[i][j][n.start_pos][1]]);


						if(id_pool[z].length == 0)
							z++;
						x = 0;
						y = Math.floor((Math.random()*field_size));
						map[i][j][n.food].set([z, (id_pool[z].splice(0,1))[0]], [x+map[i][j][n.start_pos][0], y+map[i][j][n.start_pos][1]]);


						if(id_pool[z].length == 0)
							z++;
						x = 249;
						y = Math.floor((Math.random()*field_size));
						map[i][j][n.food].set([z, (id_pool[z].splice(0,1))[0]], [x+map[i][j][n.start_pos][0], y+map[i][j][n.start_pos][1]]);
					}
				}
		}

	}


	s = 0;
	for(i = 0; i <= id_pool_range; i++)
	s += id_pool[i].length;
	console.log("Available id count: "+s);
}
//#endregion


//////////////////////////////////////////////////////////////////////////////////////////////////

function spawn(x, y, pos_x, pos_y, t){
	while(id_pool[z].length == 0)
		{
			z++;
			if(z > id_pool_range)
				z = 0;
		}
	id_f = (id_pool[z].splice(0,1))[0];
	id = [z, id_f];
	map[x][y][type_to_map[t]].set(id, [pos_x, pos_y]);
	fiz_obj.set(id, new prop(10, [100,100], x, y, t, id));
	send_queue.push([3, t,x, y, id, [pos_x, pos_y]]);
}

function detect_collision(){
	for(var v of fiz_obj.values()){
		if(v.isMoving()){
			map_x = v.x;
			map_y = v.y;
			pos = v.pos();
			id = v.id;
			for(i = map_x-1; i <= map_x+1; i++)
				if(i >= 0 && i < matrix)
					for(j = map_y-1; j <= map_y+1; j++)
						if(j >= 0 && j < matrix){
							for(var [k, s] of map[i][j][n.players].entries()){
								if(id != k){
									o = fiz_obj.get(k);
									d = Vector.sub(s, pos);
									dif = Math.sqrt((Math.pow(d[0],2) + Math.pow(d[1],2))) - Math.sqrt(Math.pow(v.radius+o.radius, 2));
									if(dif <= 0 ){
										e = 1;
										v_h_p = Vector.normalize(d)
										if(dif < -10){
											v_normal = Vector.normalize(v.accel);
											o_normal = Vector.normalize(o.accel);
											vel_div_v = Vector.sub(v_normal,v_h_p);
											vel_div_o = Vector.sub(o_normal,v_h_p);
											if(Math.abs(vel_div_v[0]) < 0.9 && Math.abs(vel_div_v[1]) < 0.9 ){
												v.apply_lim_force([-v_normal[0]*Math.abs(v.accel[0]), -v_normal[1]*Math.abs(v.accel[1])]);
											}
											if(Math.abs(vel_div_o[0]) < 0.9 && Math.abs(vel_div_o[1]) < 0.9 ){
												o.apply_lim_force([o_normal[0]*Math.abs(o.accel[0]), o_normal[1]*Math.abs(o.accel[1])]);
											}
										}
										hit_point = Vector.add(Vector.mlt(v_h_p, v.radius), pos);
										n1 = Vector.normal(hit_point, pos, v.radius);
										rel_vel = Vector.sub(v.accel, o.accel);
										sth_w_normal = Vector.dot_prod(n1, rel_vel);
										if(sth_w_normal > 0){

											imp_scalar = -(1 + e) * sth_w_normal;
											imp_scalar /= 1/v.mass + 1/o.mass;
											impulse = Vector.mlt(n1, imp_scalar);

												v.apply_force(impulse);
												o.apply_force([-impulse[0],-impulse[1]]);
										}
									}
								}
							}

							for(var [k, s] of map[i][j][n.fiz_obj].entries()){
								if(id != k){
									o = fiz_obj.get(k);
									d = Vector.sub(s, pos);
									dif = Math.sqrt((Math.pow(d[0],2) + Math.pow(d[1],2))) - Math.sqrt(Math.pow(v.radius+o.radius, 2));
									if(dif <= 0 ){
										e = 1;
										v_h_p = Vector.normalize(d);
										v_boost = 1;
										o_boost = 1;
										if(dif < -10){

											v_normal = Vector.normalize(v.accel);
											o_normal = Vector.normalize(o.accel);
											vel_div_v = Vector.sub(v_normal, v_h_p);
											vel_div_o = Vector.sub(o_normal, v_h_p);
											if(Math.abs(vel_div_v[0]) < 0.9 && Math.abs(vel_div_v[1]) < 0.9){
												if(o.isMoving()){
												//	o_boost = 3;
												}else
													v.apply_lim_force([-v_normal[0]*Math.abs(v.accel[0]), -v_normal[1]*Math.abs(v.accel[1])]);
											}
											if(Math.abs(vel_div_o[0]) < 0.9 && Math.abs(vel_div_o[1]) < 0.9){
												if(v.isMoving()){
												//	v_boost = 3;
												}else
													o.apply_lim_force([o_normal[0]*Math.abs(o.accel[0]), o_normal[1]*Math.abs(o.accel[1])]);
											}
										}

										hit_point = Vector.add(Vector.mlt(v_h_p, v.radius), pos);
										n1 = Vector.normal(hit_point, pos, v.radius);
										rel_vel = Vector.sub(v.accel, o.accel);
										sth_w_normal = Vector.dot_prod(n1, rel_vel);
										if(sth_w_normal > 0){

											imp_scalar = -(1 + e) * sth_w_normal;
											imp_scalar /= 1/v.mass + 1/o.mass;
											impulse = Vector.mlt(n1, imp_scalar);

												v.apply_force(Vector.mlt(impulse, v_boost));
												o.apply_force(Vector.mlt([-impulse[0],-impulse[1]], o_boost));

										}
									}
								}
							}
						}
		}
	}

}

function make_food(){
if(spawn_objects)
  	for(i = 0; i< matrix; i++){
      	for(j = 0; j < matrix; j++){
			if(map[i][j][n.holes].size == 0){
				while(id_pool[z].length == 0)
				{
					z++;
					if(z > id_pool_range)
						z = 0;
				}
				x = Math.floor((Math.random()*field_size));
				y = Math.floor((Math.random()*field_size));
				id_f = (id_pool[z].splice(0,1))[0];
				id = [z, id_f];
				map[i][j][n.holes].set(id, [x+map[i][j][n.start_pos][0], y+map[i][j][n.start_pos][1], 50]);
				send_queue.push([3, 2, i, j, id, [x, y, 50]]);


			}
			if(map[i][j][n.food].size < 5)
				if(Math.round(Math.random())){
					while(id_pool[z].length == 0)
					{
							z++;
							if(z > id_pool_range)
								z = 0;
					}
					x = Math.floor((Math.random()*field_size));
					y = Math.floor((Math.random()*field_size));
					id_f = (id_pool[z].splice(0,1))[0];
					id = [z, id_f];
					map[i][j][n.food].set(id, [x+map[i][j][n.start_pos][0], y+map[i][j][n.start_pos][1]]);
					send_queue.push([3, 0, i, j, id, [x, y]]);

				}
      	}
  	}
}

function create_player(x, y, pos_x, pos_y, name, connection){

	while(id_pool[z].length == 0)
	{
		z++;
		if(z > id_pool_range)
			z = 0;
	}
	id_f = (id_pool[z].splice(0,1))[0];
	b = [pos_x+map[x][y][n.start_pos][0], pos_y+map[x][y][n.start_pos][1]];
	id = [z, id_f];
	map[x][y][n.players].set(id, b);
	prp = new prop(1, [0,0], x, y, 1, id);
	fiz_obj.set(id, prp);

	players.set(connection, [id, name, 0 ,100, prp]);

	reverse_players.set(id, connection);

	send_info(connection);
	console.log("Player " + name + " connected to game");
	send_queue.push([3, 1, x, y, id, [pos_x, pos_y]]);
	spawn(0, 0, 200, 200, 3);

}

function connect(name, connection){

  selected_filed_x = Math.floor((Math.random()*matrix));
  selected_filed_y = Math.floor((Math.random()*matrix));
  selected_position_x = Math.floor((Math.random()*field_size));
  selected_position_y = Math.floor((Math.random()*field_size));
  create_player(selected_filed_x, selected_filed_y, selected_position_x, selected_position_y, name, connection);

}

function food_update(id){
	//do zmiany ograniczenie sie do max 4 fragmentow mapy
	player = fiz_obj.get(id);
	x = player.x;
	y = player.y;
	for(i = x-1; i <= x+1; i++){
		if(i >= 0 && i < matrix){
			for(j = y-1; j <= y+1; j++){
				if(j >= 0 && j < matrix){
					for(var [k, v] of map[i][j][n.food]){
						dx = Math.abs(player.pos_x()-v[0])
            			dy = Math.abs(player.pos_y()-v[1])

						inside = false;

						if (dx + dy <= player_radius)
							inside = true;
						else if (dx > player_radius)
							inside = false;
						else if (dy > player_radius)
							inside = false;
						else if (dx^2 + dy^2 <= player_radius^2)
							inside = true;
						else
							inside = false;
						if(inside){

							send_queue.push([1, 0, i, j, k]);
							id_pool[k[0]].push(k[1]);
							map[i][j][n.food].delete(k);
							player.mass++;
							//console.log(player.mass)
						}

					}

				}
			}
		}
	}
}

function send_info(id){
	if(id.connected){

	player = fiz_obj.get(players.get(id)[0]);

	x = player.x;
	y = player.y;
	x_idx = 0;
	y_idx = 0;
	data_queue.push([id, new Uint8Array([0, obj_types_count+1, field_size, x, y, matrix-1])]);
	for(i = x-2; i <= x+2; i++){
		if(i >= 0 && i < matrix){
			for(j = y-2; j <= y+2; j++){
				if(j >= 0 && j < matrix){
					buffer = [];
					buffer.push(6<<4);
					buffer.push((x_idx<<3)+y_idx);

					for(var [k, v] of map[i][j][n.players]){
						if(k != players.get(id)[0]){
						buffer.push(1);
						buffer.push(k[0]);
						buffer.push(k[1]);
						buffer.push(v[0]-map[i][j][n.start_pos][0]);
						buffer.push(v[1]-map[i][j][n.start_pos][1]);
						}
					}

					for(s = 3; s < map_prop; s++)
						for(var [k, v] of map[i][j][s]){
							buffer.push(as_n[s]);
							buffer.push(k[0]);
							buffer.push(k[1]);
							buffer.push(v[0]-map[i][j][n.start_pos][0]);
							buffer.push(v[1]-map[i][j][n.start_pos][1]);
							for(h = 2; h < v.length; h++){
								buffer.push(v[h]);
							}
						}

					data_queue.push([id,new Uint8Array(buffer)]);

					}
					y_idx++;

				}
			}
			x_idx++;
			y_idx = 0;
		}
	}
}

function prepare_client_data(data){
	/*
			case 0:
				0: -y
				1: +y
				2: -x
				3: +x
	*/
	if(data[0] == 0){
	player = reverse_players.get(data[1]);
	if(player.connected){
	x = data[2];
	y = data[3];


		if(data[4] == 0){
			y_idx = y-2;
			e = false;
			if(y_idx < 0 || y_idx > matrix-1)
				e = true;

				for(i = x-2 ; i <= x+2; i++){
					rdy_data = [];
					rdy_data.push((6<<4)+1);
					rdy_data.push(((i-x+2)<<3))
					if(!e && (i >= 0 && i < matrix)){

						for(s = 2; s < map_prop; s++)
							for(var [k, v] of map[i][y_idx][s]){
								rdy_data.push(as_n[s]);
								rdy_data.push(k[0]);
								rdy_data.push(k[1]);
								rdy_data.push(v[0]-map[i][y_idx][n.start_pos][0]);
								rdy_data.push(v[1]-map[i][y_idx][n.start_pos][1]);
								for(h = 2; h < v.length; h++){
									rdy_data.push(v[h]);
								}
							}


						data_queue.push([player,new Uint8Array(rdy_data)]);

					}
			}
		}else if(data[4] == 1){

			y_idx = y+2;

			e = false;
			if(y_idx < 0 || y_idx > matrix-1)
				e = true;

			for(i = x-2 ; i <= x+2; i++){
				rdy_data = [];
				rdy_data.push((6<<4)+2);
				rdy_data.push(((i-x+2)<<3)+4)
				if(!e && (i >= 0 && i < matrix)){

					for(s = 2; s < map_prop; s++)
						for(var [k, v] of map[i][y_idx][s]){
							rdy_data.push(as_n[s]);
							rdy_data.push(k[0]);
							rdy_data.push(k[1]);
							rdy_data.push(v[0]-map[i][y_idx][n.start_pos][0]);
							rdy_data.push(v[1]-map[i][y_idx][n.start_pos][1]);
							for(h = 2; h < v.length; h++){
								rdy_data.push(v[h]);
							}
						}
						data_queue.push([player,new Uint8Array(rdy_data)]);
					}
				}

		}else if(data[4] == 2){

			x_idx = x-2;

			e = false;
			if(x_idx < 0 || x_idx > matrix-1)
				e = true;

			for(i = y-2 ; i <= y+2; i++){
				rdy_data = [];
				rdy_data.push((6<<4)+3);
				rdy_data.push(i-y+2);
				if(!e && (i >= 0 && i < matrix)){


						for(s = 2; s < map_prop; s++)
							for(var [k, v] of map[x_idx][i][s]){
								rdy_data.push(as_n[s]);
								rdy_data.push(k[0]);
								rdy_data.push(k[1]);
								rdy_data.push(v[0]-map[x_idx][i][n.start_pos][0]);
								rdy_data.push(v[1]-map[x_idx][i][n.start_pos][1]);
								for(h = 2; h < v.length; h++){
									rdy_data.push(v[h]);
								}
							}
						data_queue.push([player,new Uint8Array(rdy_data)]);
					}
				}

		}else if(data[4] == 3){

			x_idx = x+2;
			e = false;
			if(x_idx < 0 || x_idx > matrix-1)
				e = true;
			for(i = y-2 ; i <= y+2; i++){
				rdy_data = [];
				rdy_data.push((6<<4)+4);
				rdy_data.push((4<<3)+(i-y+2));
				if(!e && (i >= 0 && i < matrix)){

					for(s = 2; s < map_prop; s++)
						for(var [k, v] of map[x_idx][i][s]){
							rdy_data.push(as_n[s]);
							rdy_data.push(k[0]);
							rdy_data.push(k[1]);
							rdy_data.push(v[0]-map[x_idx][i][n.start_pos][0]);
							rdy_data.push(v[1]-map[x_idx][i][n.start_pos][1]);
							for(h = 2; h < v.length; h++){
								rdy_data.push(v[h]);
							}
						}
						data_queue.push([player,new Uint8Array(rdy_data)]);

					}
			}
		}
	}




	}else if(data[0] == 1){
		map_x = data[2];
		map_y = data[3];
		for(i = map_x-2; i <= map_x+2; i++)
			if(i >= 0 && i < matrix)
				for(j = map_y-2; j <= map_y+2; j++){
					if(j >= 0 && j < matrix){
							 if(data[1] != 1){
								for(var k of map[i][j][n.players].keys()){
									data_queue.push([reverse_players.get(k), new Uint8Array([(1<<4)+data[1], data[4][0], data[4][1]])]);
								}
							 }else{
								for(var k of map[i][j][n.players].keys()){
									if(k != data[4])
										data_queue.push([reverse_players.get(k), new Uint8Array([(1<<4)+data[1], data[4][0], data[4][1]])]);
								}
							}

						}
					}

	}else if(data[0] == 2){

	}else if(data[0] == 3){
		map_x = data[2];
		map_y = data[3];
		for(i = map_x-2; i <= map_x+2; i++)
			if(i >= 0 && i < matrix)
				for(j = map_y-2; j <= map_y+2; j++){
					if(j >= 0 && j < matrix){
						if(data[1] != 1){
							for(var k of map[i][j][n.players].keys()){
								data_queue.push([reverse_players.get(k), new Uint8Array([(3<<4)+data[1], (((map_x-i)+2)<<3)+(map_y-j)+2, data[4][0], data[4][1]].concat(data[5]))]);
							}
						}else{
							for(var k of map[i][j][n.players].keys()){
								if(k != data[4])
									data_queue.push([reverse_players.get(k), new Uint8Array([(3<<4)+data[1], (((map_x-i)+2)<<3)+(map_y-j)+2, data[4][0], data[4][1]].concat(data[5]))]);
							}
						}

					}
					}


	}else if(data[0] == 4){
		if(data[1].type == 1){
			player = data[1];
			map_x = player.x;
			map_y = player.y;
			x_pos = player.pos_x()-map[map_x][map_y][n.start_pos][0];
			y_pos = player.pos_y()-map[map_x][map_y][n.start_pos][1];
			id = player.id;
			r_x = (x_pos * 100) % 100;
			r_y = (y_pos * 100) % 100;
			data_queue.push([reverse_players.get(player.id), new Uint8Array([4<<4, x_pos, y_pos, r_x, r_y, player.mass, player.last_step])]);
			for(i = map_x-2; i <= map_x+2; i++)
				if(i >= 0 && i < matrix)
					for(j = map_y-2; j <= map_y+2; j++){
						if(j >= 0 && j < matrix)
							for(var k of map[i][j][n.players].keys()){
								if(k != id){
									p = reverse_players.get(k);
									data_queue.push([p, new Uint8Array([(5<<4)+1, (((map_x-i)+2)<<3)+(map_y-j)+2, id[0], id[1], x_pos, y_pos, r_x, r_y, player.mass])]);
								}
							}
					}



		}else{
			obj = data[1];
			map_x = obj.x;
			map_y = obj.y;
			x_pos = obj.pos_x()-map[map_x][map_y][n.start_pos][0];
			y_pos = obj.pos_y()-map[map_x][map_y][n.start_pos][1];
			id = obj.id;
			r_x = (x_pos * 100) % 100;
			r_y = (y_pos * 100) % 100;
			for(i = map_x-2; i <= map_x+2; i++)
				if(i >= 0 && i < matrix)
					for(j = map_y-2; j <= map_y+2; j++){
						if(j >= 0 && j < matrix)
							for(var k of map[i][j][n.players].keys()){
								p = reverse_players.get(k);
								data_queue.push([p, new Uint8Array([(5<<4)+obj.type, (((map_x-i)+2)<<3)+(map_y-j)+2, id[0], id[1], x_pos, y_pos, r_x, r_y, obj.mass])]);
							}
					}

		}
	}
}

function change_accel(id, l_accel){
	p = fiz_obj.get(players.get(id)[0]);
	p.apply_lim_force([l_accel[0], l_accel[1]]);

}

function perform_action(id, a){
	switch(a){
		case 0:
			accel = positions.get(id);
			p = fiz_obj.get(players.get(id)[0])
			accel = Vector.mlt(accel, p.mass*700 );
			p.apply_force(accel);
	}
}

time1 = Date.now();
function main_game_clock(){
	if(next_step){
	b = [];
	for(var [key, value] of client_step)
		b[b.length] = [key, value];
	lock_client_step = new Map(b);
	next_step = false;
	}

	accel_changer();
	action_timer();
	fiz_obj_pos_update();
	detect_collision();
	food_updator();
	make_food();

	avg_time =  Date.now() - time1 ;
	time1 = Date.now();
		if(avg_time > 10 )
			timeout -= (avg_time) % 10;
		else if(avg_time < 10)
			timeout += 10 - avg_time;
	setTimeout(main_game_clock, timeout);
}

function fiz_obj_pos_update(){
	for(var v of fiz_obj.values()){
		if(v.isMoving() ){
			v.apply_friction();
			v.move();
			//console.log(v.accel)
		}
	}
}
function food_updator(){
	for(var id of reverse_players.keys()){
        food_update(id);
    }
}
function accel_changer(){
	for(var [id, accel] of positions){
		change_accel(id, accel);
		players.get(id)[4].last_step = lock_client_step.get(id);
	}
}
function action_timer(){
	for(i = 0; i < players_actions.length; i++){
		perform_action(players_actions[i][0], players_actions[i][1]);
	}
	players_actions = [];
}


function objects_update(){
	for(var v of fiz_obj.values()){
		if(v.isMoving() || v.type == 1){
			send_queue.push([4, v]);
		}
	}
	next_step = true;
}

function send_queue_preparing(){
	for(var u = 0; u < send_queue.length; u++){
		prepare_client_data(send_queue[u])
	}
	send_queue = [];
}


function client_sender(){
	c = 0;
    data_queue.forEach((e)=>{
        if(e[0].connected){
			e[0].send(Buffer.from(e[1].buffer));
			c++;

		}else{
			c++;
			p = players.get(e[0]);
			if(p != undefined){
				p = p[0];
				pl = fiz_obj.get(p);
				fiz_obj.delete(p);
				players.delete(e[0]);
				positions.delete(e[0]);
				reverse_players.delete(p);
				send_queue.push([1, 1, pl.x, pl.y, pl.id]);

				map[pl.x][pl.y][n.players].delete(pl.id);

			}
		}
	})
	data_queue = [];
}

var http = require('http');
var web_socket = require("websocket").server;
var app = http.createServer(function(req, res){

}).listen(8080, function(){
    console.log("Waiting for players on 8080");
});

var wb_server = new web_socket({
    httpServer: app
});
app.setMaxListeners(Infinity);
wb_server.setMaxListeners(Infinity);

client_step = new Map();
lock_client_step = new Map();

wb_server.on('request', function(request) {
	var connection = request.accept(null, request.origin);

    connection.on('message', function(message) {

		mes = new Uint8Array(message.binaryData);
		if(mes[0] == 1){
			name = "";
			buf = mes.subarray(1, mes.length);
			for(i = 0; i < buf.length; i++){
				name += String.fromCharCode(buf[i]);
			}

			connect(name, connection);

		}else if(mes[0] == 0){
			//zostawiam, bo fajnie wyglada, ale trzeba zmienic zeby na pierwszym bajcie było wszystko
			x = (mes[1] & 1) ? -(mes[1]>>1) : (mes[1]>>1);
			y = (mes[2] & 1) ? -(mes[2]>>1) : (mes[2]>>1);
			positions.set(connection, [x/100, y/100]);
			client_step.set(connection, mes[3]);
		}else if(mes[0] == 2){
			players_actions.push([connection, 0]);
		}


      connection.on('close', function(connection) {

	  });

})
})

var express = require('express');
var hosting = express();

hosting.use(express.static('./'));

hosting.listen(3000, function(){
	console.log("Webserver on localhost:3000");
});
