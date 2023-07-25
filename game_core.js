//graphics settings

depth = 1;
show_server_state = 0;
show_prediction = 0;
server = 0;
function show_ghosts(){

  ob = new obj(null, 1, 0, 0, 2, 2);
  objects.set(null, ob);
  testobj = new obj("test", 4, 0 ,0 ,2,2);
  objects.set("test", testobj);
  show_server_state = 1;
  show_prediction = 1;
}
//testing

//local player values
name = "marcinek";
player_id = "";
active_key = "";
started = false;
p_accel = [0,0];
middlex = window.innerWidth/2;
middley = window.innerHeight/2;
screen_width = window.innerWidth;
screen_height = window.innerHeight;
x_scale = screen_width / 88;
y_scale = screen_height /50;
y_scale = x_scale;
w = document.getElementById("mainWindow");
ctx = w.getContext("2d");
back = document.getElementById("back")
b_ctx = back.getContext("2d");
front = document.getElementById("front")
f_ctx = front.getContext("2d");

hole = new Image();
hole.src = "hole_texture.png";
hole_pat = ctx.createPattern(hole, "repeat");

function start(){
    nick = document.getElementById('nick');
    name = nick.value;
    nick.style.display = "none";
    document.getElementById('name').style.display = "none";
    w.style.display = "block";
    back.style.display = "block";
    front.style.display = "block";
    document.body.style.backgroundColor = "gray";
    document.body.style.backgroundImage = "none"
    hole_pat = ctx.createPattern(hole, "repeat");

    s_btn = document.getElementById('st_btn');
    s_btn.style.display = "none";

    c = document.createElement('canvas');
    c.style.position = "absolute";
    c.style.zIndex = "6";
    c.width = 100;
    c.height = 100;
    //c.style.opacity = 0.9;
    document.body.appendChild(c);
    cctx = c.getContext('2d');
    ctx.fillStyle = "black";
    packets = 0;
    len = 0;
    frames = 0;
    time1 = performance.now();
    setInterval(() => {
        if(performance.now() - time1  >= 1000){
        cctx.clearRect(0, 0,w.width, 40);
        cctx.fillStyle = "white";
        cctx.fillText("Packets p/s: " + packets, 10, 10);
        cctx.fillText("Kbytes p/s: " + Math.round(len/1000), 10, 20);
        cctx.fillText("Fps: " + frames, 10, 30);
        cctx.fillText("Latency: " + fiz_player.latency, 10, 40);
        //cctx.fillText(diff[0] + " " + diff[1], 10, 30);
        frames = 0 ;
        packets = 0;
        len = 0;
        time1 = performance.now()
        }

    }, 10)


    window.requestAnimationFrame(new_render);
    connect();
}
resize();

last_pos = [0,0];
diff = [0,0];
yhm2 = 0;
//initial data
buf_size = 0;
field_size = 0;
player_field = [0, 0];
map_border = 0;
arena_size = 0;
global_index = 0;
//////////

player = null;
fiz_player = null;
objects = new Map();
fiz_objects = new Map();

game_clock = 0.01;

timeout = 10;
setTimeout(game_loop, timeout)
time = Date.now();
function game_loop(){
  if(started){
    fiz_player.follow_ghost();
    fiz_player.apply_lim_force(fiz_player.dir);
    fiz_player.apply_friction();
    //fiz_player.move();
    for(var v of fiz_objects.values())
        if(v.can_project){
          v.move();
          v.project();
        }
    //fiz_player.project();
    detect_collision();
    fiz_player.save_state(fiz_player.dir);

  }


	avg_time =  Date.now() - time ;
  time = Date.now();
  if(avg_time > 10 )
    timeout -= (avg_time) % 10;
  else if(avg_time < 10)
    timeout += 10 - avg_time;
  setTimeout(game_loop, timeout);
}

function circular_buffer(){
  this.array = new Array(256);
  this.i = 0;
  this.size = 256;
  this.increment = () =>{
    this.i = (this.i+1) % this.size;
  }
  this.for_dec = (i) =>{
    if(i-1 < 0){
      return this.size-1;
    }else{
      return i-1;
    }
  }
  this.for_inc = (i) =>{
    return (i+1) % this.size;
  }
  this.push = (arg) =>{
    this.array[this.i] = arg;
    this.increment();
  }
  this.get = (arg) =>{
    index = arg % this.size;
    return this.array[index];
  }
  this.get_size_mlt = () =>{
    return Math.floor(this.i/this.size);
  }
  this.set = (arg) =>{
    index = arg % this.size;
    this.array[index] = arg;
  }
  this.step = () =>{
    return this.for_dec(this.i % this.size);
  }
  this.get_last = () =>{
    return this.array[this.step()];
  }
}
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
function detect_collision(){
	for(var v of fiz_objects.values()){
		if(v.isMoving()){
			pos = [v.predicted_x, v.predicted_y];
			id = v.id;
			for(var s of fiz_objects.values()){
				if(s.id != id){
					o = s;
					d = Vector.sub([s.predicted_x, s.predicted_y], pos);
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


function fiz_obj(id, type, x, y, obj, mass = 1){
  this.id = id;
  this.mass = mass;
  this.obj = obj;
  this.accel = [0, 0];
  this.predicted_x = x;
  this.predicted_y = y;
  this.desired_x = 0;
  this.desired_y = 0;
  this.type = type;
  this.history = new circular_buffer();
  this.latency = 0;
  this.can_project = 0;
  switch(this.type){
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


  this.project = () =>{
    this.interpolate();
    this.obj.x = this.predicted_x;
    this.obj.y = this.predicted_y;
  }
  this.interpolate = () =>{
    r_x = this.desired_x - this.predicted_x;
    r_y = this.desired_y - this.predicted_y;
    s = 10 / (this.latency)
    this.predicted_x += r_x * s;
    this.predicted_y += r_y * s;
  }

  this.server_update = (frame) =>{
    this.desired_x = frame[0];
    this.desired_y = frame[1];
    this.mass = frame[2];
    if(this.history.i >= 1){
      last = this.history.get_last();
      this.latency = Date.now() - last[0];
      a_x = ((this.desired_x - last[1][0])*1000)/this.latency;
      a_y = ((this.desired_y - last[1][1])*1000)/this.latency;
      this.accel = [a_x, a_y];
      this.can_project = 1;

    }else{
      this.predicted_x = frame[0];
      this.predicted_y = frame[1];
    }

    this.history.push([Date.now(), frame]);
  }
  this.save_state = () =>{
    this.history.push([Date.now(), [this.predicted_x, this.predicted_y, this.mass]]);
  }
  this.move = () =>{
    this.desired_x += this.accel[0] * game_clock;
    this.desired_y += this.accel[1] * game_clock;
    if(this.desired_x >= arena_size){
      this.desired_x = arena_size;
      this.stop_moving(0);
    }
    else if(this.desired_x <= 0){
      this.desired_x = 0;
      this.stop_moving(0);
    }
    if(this.desired_y >= arena_size){
      this.desired_y = arena_size;
      this.stop_moving(1);
    }
    else if(this.desired_y <= 0){
      this.desired_y = 0;
      this.stop_moving(1);
    }

  }
  this.isMoving = () =>{
    return this.accel[1] != 0 || this.accel[0] != 0;
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
  this.max_force = () =>{
		return this.mass*this.max_speed;
	}
}

function player_obj(id, type, x, y, obj, mass){
  this.mass = mass;
  this.can_project = 1;
  this.dir = [0,0]
	this.accel = [0,0];
  this.friction_multiplier = 0;
  this.radius = 0;
  this.id = id;
  this.type = type;
  this.predicted_x = x;
  this.predicted_y = y;
  this.desired_x = -1;
  this.desired_y = -1;
  this.history = new circular_buffer();
  this.latency = 0;
  // history structure:
  //  [[[input], action], [input_result eg. history]]
  //////////////////////
  this.obj = obj;
  this.max_speed = 0;
  this.min_speed = 0;
  this.action = 0;
  switch(this.type){
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
  this.project = () =>{
    this.obj.x = this.predicted_x;
    this.obj.y = this.predicted_y;
  }
  this.follow_ghost = () =>{
    //if(Math.abs(this.desired_x - this.predicted_y) > 5 || Math.abs(this.desired_y - this.predicted_y) > 5){
      r_x = this.desired_x - this.predicted_x;
      r_y = this.desired_y - this.predicted_y;
      if(this.latency > 0){
      s = 10 / (this.latency*2)
      this.predicted_x += r_x*s;
      this.predicted_y += r_y*s;

    }

    //}
  }
  this.re_input = (l) =>{
    cur_step = this.history.step();
    for(i = l; i != cur_step; i = this.history.for_inc(i)){
      i_plus_one = this.history.for_inc(i);
      accel = this.re_apply_lim_force(this.history.array[i_plus_one][0][0], this.history.array[i][1][0], this.history.array[i][1][3], this.history.array[i][1][5], this.history.array[i][1][6]);
      if(this.history.array[i_plus_one][0][2])
        accel = this.re_action(this.history.array[i_plus_one][0][2], this.history.array[i_plus_one][0][0], accel, this.history.array[i][1][3]);
      accel = this.re_apply_friction(accel, this.history.array[i][1][3], this.history.array[i][1][4]);
      params = this.re_move(this.history.array[i][1][1], this.history.array[i][1][2], accel);
      this.history.array[i_plus_one] = [this.history.array[i_plus_one][0], [params[2], params[0], params[1], this.history.array[i][1][3], this.history.array[i][1][4], this.history.array[i][1][5], this.history.array[i][1][6]]]
    }
    if(show_prediction){
     ob1 = objects.get("test");

       ob1.x = this.history.array[cur_step][1][1];
       ob1.y =  this.history.array[cur_step][1][2];

    }
     this.desired_x = this.history.array[cur_step][1][1];
     this.desired_y = this.history.array[cur_step][1][2];


  }
  this.save_state = (input) => {

    this.history.push([[input, this.action, Date.now()], [[this.accel[0], this.accel[1]], this.predicted_x, this.predicted_y, this.mass, this.friction_multiplier, this.min_speed, this.max_speed]]);
    this.action = 0;
  }
  this.server_update = (frame) => {

    h = this.history.array[frame[3]];
    this.latency = Date.now() - h[0][2];
    //console.log(this.latency)
    ac_x = ((frame[0]-this.history.array[this.history.for_dec(frame[3])][1][1]));
    ac_y = ((frame[1]-this.history.array[this.history.for_dec(frame[3])][1][2]));
    this.history.array[frame[3]] = [this.history.array[frame[3]][0], [[ac_x, ac_y], frame[0], frame[1], frame[2], this.history.array[frame[3]][1][4], this.history.array[frame[3]][1][5], this.history.array[frame[3]][1][6]]];
    //if(Math.abs(h[1][1] - frame[0]) > 5 || Math.abs(h[1][2] - frame[1]) > 5)
      this.re_input(frame[3]);


  }
  this.max_force = () =>{
		return this.mass*this.max_speed;
	}
  this.move = () =>{
    this.predicted_x += this.accel[0] * game_clock;
    this.predicted_y += this.accel[1] * game_clock;
    if(this.predicted_x >= arena_size){
      this.predicted_x = arena_size;
      this.stop_moving(0);
    }
    else if(this.predicted_x <= 0){
      this.predicted_x = 0;
      this.stop_moving(0);
    }
    if(this.predicted_y >= arena_size){
      this.predicted_y = arena_size;
      this.stop_moving(1);
    }
    else if(this.predicted_y <= 0){
      this.predicted_y = 0;
      this.stop_moving(1);
    }

  }
  this.re_action = (a, f, accel, mass) =>{
      switch(a){
        case 1:
          return this.re_apply_force(f, [f[0]*mass*700, f[1]*mass*700],accel, mass);
          break;
        default:
          return accel;

      }
  }
  this.re_move = (predicted_x, predicted_y, accel) =>{
    predicted_x += accel[0] * game_clock;
    predicted_y += accel[1] * game_clock;
    if(predicted_x >= arena_size){
      predicted_x = arena_size;
      accel[0] = 0;
    }
    else if(predicted_x <= 0){
      predicted_x = 0;
      accel[0] = 0;
    }
    if(predicted_y >= arena_size){
      predicted_y = arena_size;
      accel[1] = 0;
    }
    else if(predicted_y <= 0){
      predicted_y = 0;
      accel[0] = 0;
    }

    return [predicted_x, predicted_y, accel];
  }
  this.re_apply_friction = (accel, mass, friction_multiplier) =>{
    f = [accel[0]*mass, accel[1]*mass];
		r_f = [(-f[0]/friction_multiplier)*game_clock, (-f[1]/friction_multiplier)*game_clock];
    return this.re_apply_force(r_f, f, accel, mass);
	}
  this.re_apply_force = (f, force, accel, mass) => {
    t_f = force;
    t_f[0] += f[0];
    t_f[1] += f[1];
    accel[0] = t_f[0]/mass;
    accel[1] = t_f[1]/mass;
    return accel;
  };
  this.re_apply_lim_force = (f, accel, mass, min_speed, max_speed) =>{
      //console.log(f, accel, mass, min_speed, max_speed);
    t_f = [accel[0]*mass, accel[1]*mass];
    max_force = max_speed * mass;
    ad_x = f[0]*min_speed*mass*(max_speed/7)*game_clock;
    ad_y = f[1]*min_speed*mass*(max_speed/7)*game_clock;
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
    accel[0] = ad_x/mass;
    accel[1] = ad_y/mass;

    return accel;


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



}

function obj(id, type, x_pos, y_pos, x, y, prop = null){
    this.id = id;
    this.type = type;
    this.x = (player_field[0]+x)*field_size + x_pos;
    this.y = (player_field[1]+y)*field_size + y_pos;
    this.prop = prop;
    this.set_x = (x_pos, x) =>{
      this.x = (player_field[0]+x)*field_size + x_pos;
    }
    this.set_y = (y_pos, y) =>{
      this.y = (player_field[1]+y)*field_size + y_pos;
    }
}



////////////////////////////

function render_element(t, dist_x, dist_y, d){

    switch(t){
        case -1:{
            b_ctx.beginPath();
            b_ctx.fillStyle = hole_pat;
            b_ctx.rect(dist_x, dist_y, (field_size+1)*x_scale, (field_size+1)*x_scale);
            b_ctx.translate(-diff[0]*yhm2, -diff[1]*yhm2);
            b_ctx.fill();
            b_ctx.translate(diff[0]*yhm2, diff[1]*yhm2);
            b_ctx.closePath();
            break;
        }
        case 0:{
            ctx.fillStyle='#a4e50c';
            ctx.beginPath();
            ctx.arc(dist_x, dist_y, x_scale*5, 0, 2 * Math.PI);
            ctx.fill();
            ctx.closePath();
            break;
        }
        case 1:{
            ctx.beginPath();
            ctx.fillStyle = "red";
            ctx.arc(dist_x, dist_y, x_scale*30, 0, 2 * Math.PI);
            ctx.fill();
            ctx.closePath();
            break;
        }
        case 2:{
            b_ctx.fillStyle = hole_pat;
            b_ctx.beginPath()
            b_ctx.arc(dist_x, dist_y, x_scale*d[0], 0, 2 * Math.PI);
            b_ctx.translate(-diff[0]*yhm2, -diff[1]*yhm2);
            b_ctx.fill();
            b_ctx.translate(diff[0]*yhm2, diff[1]*yhm2);
            b_ctx.closePath();
            break;
        }
        case 3:{
            ctx.fillStyle = "blue";
            ctx.beginPath();
            ctx.arc(dist_x, dist_y, x_scale*30, 0, 2 * Math.PI);
            ctx.fill();
            ctx.closePath();

            break;
        }
        case 4:{
            ctx.beginPath();
            ctx.fillStyle = "rgb(36, 193, 33)";
            ctx.arc(dist_x, dist_y, x_scale*30, 0, 2 * Math.PI);
            ctx.fill();
            ctx.closePath();
            break;
        }

    }

}

function new_render(){
    if(started){
        ctx.shadowBlur = 0;
        ctx.clearRect(0, 0,w.width, w.height);

        depth && (yhm = 1, yhm2 = x_scale) || (yhm = x_scale, yhm2 = 1);

        diff[0] += (player.x-last_pos[0]) *yhm;
        diff[1] += (player.y-last_pos[1]) *yhm;

        if(player[0]-last_pos[0] < -(field_size-50)){
        diff[0] += field_size*yhm;
        }
        if(player[1]-last_pos[1] < -(field_size-50)){
        diff[1] += field_size*yhm;
        }
        if(last_pos[0]-player[0] < -(field_size-50)){
            diff[0] -= field_size*yhm;
        }
        if(last_pos[1]-player[1] < -(field_size-50)){
            diff[1] -= field_size*yhm;
        }
        b_ctx.fillStyle = back_pat;
        b_ctx.clearRect(0, 0, back.width, back.height);
        b_ctx.translate(-diff[0], -diff[1]);
        b_ctx.fillRect(diff[0], diff[1], back.width, back.height);
        b_ctx.translate(diff[0], diff[1]);

        f_ctx.clearRect(0, 0, front.width, front.height);


        last_pos[0] = player.x;
        last_pos[1] = player.y;
        if(player_field[0] < 0 || player_field[0]+4 > map_border || player_field[1] < 0 || player_field[1]+4 > map_border){
          for(i = player_field[0];i - player_field[0] <= 4;i++){
            for(j = player_field[1]; j - player_field[1] <= 4 ;j++){
              if(i < 0 || j < 0 || i > map_border || j > map_border)
                render_element(-1, middlex-((player.x-field_size*i)*x_scale),middley-((player.y-field_size*j)*x_scale), null);
            }
          }
        }


        for(var [k, v] of objects.entries()){
          r_x = (player.x - v.x);
          r_y = (player.y - v.y);
          radius = 3*field_size;
          // if(Math.abs(r_x) > radius || Math.abs(r_y) > radius)
          // {
          //   objects.delete(k);
          //   fiz_objects.delete(k)
          //   continue;
          // }
          f_x = middlex - r_x * x_scale;
          f_y = middley - r_y * x_scale;
          render_element(v.type, f_x, f_y, v.prop);
        }

        ctx.beginPath();
        ctx.fillStyle='white';
        ctx.fillText(screen_width + " x " + screen_height, 10, 60);
        ctx.fillText(name, middlex, middley+(40*x_scale));
        ctx.stroke();
        ctx.beginPath();

        grd = ctx.createRadialGradient(middlex, middley, 5, middlex, middley, x_scale*30);
        grd.addColorStop(0, "purple");
        grd.addColorStop(.20, "blue");
        grd.addColorStop(.40, "green");
        grd.addColorStop(.60, "yellow");
        grd.addColorStop(.80, "orange");
        grd.addColorStop(1, "red");


        ctx.fillStyle=grd;
        ctx.shadowBlur = 12;
        ctx.shadowColor = "red"
        ctx.arc(middlex, middley, x_scale*30, 0, 2 * Math.PI);

        ctx.fill();

        ctx.closePath();
        ctx.beginPath();

        ctx.arc(middlex, middley, x_scale*40, Math.atan2(p_accel[1], p_accel[0])-0.5,Math.atan2(p_accel[1], p_accel[0])+0.5);
        ctx.strokeStyle='red';
        ctx.lineWidth=x_scale*3;
        ctx.stroke();
        ctx.closePath();
        frames++;
    }
    window.requestAnimationFrame(new_render);

}

document.getElementById("front").addEventListener("mousemove", function(e){
    mouse_x = middlex-e.clientX;
    mouse_y = middley-e.clientY;
    s = 1/(Math.abs(mouse_x)+Math.abs(mouse_y))
    p_accel[0] = Math.round(mouse_x * -s * 100)/100;
    p_accel[1] = Math.round(mouse_y * -s * 100)/100;


})
can_boost = true;
document.addEventListener('keydown', function(event) {
    if(event.keyCode == 32 && can_boost){
        send_action(2);
        can_boost = false;
        fiz_player.apply_force([fiz_player.dir[0]*fiz_player.mass*700, fiz_player.dir[1]*fiz_player.mass*700]);
        fiz_player.action = 1;
    }

});
document.addEventListener('keyup', function(event) {
    if(event.keyCode == 32){
      can_boost = true;
    }


});
function send_action(k){
    window.con.send(new DataView(new Uint8Array([k]).buffer));
}

window.onresize = function(){
    resize()
}
function resize(){

    front.height = back.height = w.height = Math.ceil(window.innerHeight);
    front.width = back.width =  w.width = Math.ceil(window.innerWidth);

    middlex = window.innerWidth/2;
    middley = window.innerHeight/2;
    screen_width = window.innerWidth;
    screen_height = window.innerHeight;
    prop = screen_width / screen_height;
    x_scale =  screen_width / 1000;
     if(x_scale < 1.2)
    x_scale = 1.2;
    /* if(x_scale > 1.9)
    x_scale = 1.9;  */
    y_scale = screen_height /55;
    y_scale = x_scale;

    pat = document.createElement('canvas');
    pat.width = (60 * x_scale);
    pat.height = (60 * x_scale);
    ctx_pat = pat.getContext('2d');

    ctx_pat.fillStyle = "black";
    ctx_pat.strokeStyle = "gray";
    ctx_pat.fillRect(3*x_scale, 3*x_scale, 60*x_scale, 60*x_scale);
    b_ctx.clearRect(0, 0, w.width, w.height);
    back_pat = ctx_pat.createPattern(pat, 'repeat');
    b_ctx.fillRect(0, 0, w.width, w.height);



}


setInterval(function(){
    if(started){
        x = 0;
        y = 0;
        if(p_accel[0] < 0)
        x = 1;
        if(p_accel[1] < 0)
        y = 1;
        b = new Uint8Array([0,(Math.abs(p_accel[0] * 100)<<1)+x, (Math.abs(p_accel[1] * 100)<<1)+y, fiz_player.history.step()]);
        fiz_player.dir = [p_accel[0], p_accel[1]];
        window.con.send(new DataView(b.buffer));
    }
  }, 10);

packet_time = 0;
function connect(){
    if(server)
      connection = new WebSocket("ws://51.68.143.238:8080");
    else
      connection = new WebSocket("ws://192.168.0.206:8080");
    connection.binaryType = "arraybuffer";
    window.con = connection;
    connection.onmessage = function(e){
        buffer = new Uint8Array(e.data);

        packets++;
        len += buffer.length;

        a = buffer[0] >>> 4;
        if(a == 0){
            buf_size = buffer[1];
            field_size = buffer[2]-1;
            player_field = [buffer[4]-2, buffer[3]-2];
            map_border = buffer[5];
            arena_size = ((map_border+1)*field_size)-1;
        }else if (a == 1){

          id = (buffer[1]<<8)+buffer[2];
          fiz_objects.delete(id);
          objects.delete(id);

        }else if (a == 2){
          switch(buffer[0] & 15){
              case 0:
                  player_field[0]--;
                  break;
              case 1:
                  player_field[0]++;
                  break;
              case 2:
                  player_field[1]--;
                  break;
              case 3:
                  player_field[1]++;
                  break;
          }
        }else if (a == 3){
            type = buffer[0] & 15;
            y = buffer[1] >> 3;
            x = buffer[1] & 7;
            id = (buffer[2]<<8)+buffer[3];
            if(!objects.has(id)){
              ob = new obj(id, type, buffer[4], buffer[5], x, y);
              objects.set(id, ob);
              if(type == 1 || type == 3){
                f = new fiz_obj(id, type, ob.x, ob.y, ob);
                fiz_objects.set(id, f);
              }
            }

        }else if (a == 4){
          if(!started){
            player = new obj(null, 1, buffer[1] + buffer[3]/100, buffer[2] + buffer[4]/100, 2, 2);
            fiz_player = new player_obj(null, 1,player.x, player.y, player, buffer[5]);
            fiz_player.save_state();
            fiz_objects.set(null, fiz_player);
            //packet_time = Date.now();
            started = true;
          }else{
            if(show_server_state){
              ob = objects.get(null);
              ob.set_x(buffer[1] + buffer[3]/100, 2);
              ob.set_y(buffer[2] + buffer[4]/100, 2);
              //packet_time = Date.now() - packet_time;
              //console.log(packet_time);
              //packet_time = Date.now();
            }
            frame = [((player_field[0]+2)*field_size)+(buffer[1] + buffer[3]/100), ((player_field[1]+2)*field_size)+(buffer[2] + buffer[4]/100), buffer[5], buffer[6]];
            fiz_player.server_update(frame);

          }

        }else if (a == 5){
            y = buffer[1] >> 3;
            x = buffer[1] & 7;
            id = (buffer[2]<<8)+buffer[3];
            ob = fiz_objects.get(id);
            if(ob != undefined){
              frame = [((player_field[0]+x)*field_size)+(buffer[4] + buffer[6]/100), ((player_field[1]+y)*field_size)+(buffer[5] + buffer[7]/100), buffer[8], buffer[9]];
              ob.server_update(frame);
              // ob.set_x(buffer[4] + buffer[6]/100, x);
              // ob.set_y(buffer[5] + buffer[7]/100, y);
            }


        }else if (a == 6){
            y = buffer[1] >> 3;
            x = buffer[1] & 7;
            l = 2;
            while(l < buffer.length){
              if(buffer[l] == 2){
                  l++;
                  id = (buffer[l++]<<8)+buffer[l++];
                  o = new obj(id, 2, buffer[l++], buffer[l++], x, y, [buffer[l]]);
                  objects.set(id, o);

              }else{
                  type = buffer[l];
                  l++;
                  id = (buffer[l++]<<8)+buffer[l++];
                  if(!objects.has(id)){
                    o = new obj(id, type, buffer[l++], buffer[l], x, y);
                    objects.set(id, o);
                    if(type == 1 || type == 3){
                      f = new fiz_obj(id, type, o.x, o.y, o);
                      fiz_objects.set(id, f);
                    }
                  }else
                    l++

              }
              l++;
            }
        }
    }

    connection.onopen = function(){
        n = new Uint8Array(name.length+1);
        n.set([1], 0);
        for(i = 1; i <= name.length; i++){
            n.set([name.charCodeAt(i-1)], i);
        }

        connection.send(new DataView(n.buffer));

    }
    connection.onclose = function(){
        started = false;
    }
}

//#endregion
