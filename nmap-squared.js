/*global nmap,d3,nmap_extend */
/*jshint unused:false*/

/**
* helper algorithm for the nmap.js algorithm
* @constructor
* @param {object} args
* @param {array} args.data - point data
* @param {flaot|integer} args.data[].x - x position
* @param {flaot|integer} args.data[].y - y position
* @param {integer|float} args.height=1 - height of the available space
* @param {integer|float} args.width=1 - width of the available space
* @param {boolean} args.square=true||false -  Create either a square number of rects or not
* @param {string} args.method="border||quad" -  Filling method either border or quad(tree) approach
* @param {float} args.border_adv=false - Border Special method, to favour existing points over new points
* @return {object} nmap_squared
*/

var nmap_squared = function(args){
	if(typeof(nmap) !== typeof(Function)){ throw "ERROR: You need to include the nmap.js library."; }

	var defaults = {
		data:[],
		height:1,
		width:1,
		square:false,
		method:"border",
		border_adv:1
	};

	//given arguments and defaults
	var attr = nmap_extend(defaults, args);

	//result object
	var result = [], swidth, sheight, sx, sy;

	/**
	* Create squared
	* @constructor
	*/
	function squared(){
		var i;

		/*--- Calculate the extend of the data and normalize it ---*/
		var maxX = -Number.MAX_VALUE,
			minX = Number.MAX_VALUE,
			maxY = -Number.MAX_VALUE,
			minY = Number.MAX_VALUE;

		var x,y;

		for(i = 0; i<attr.data.length; i++){
			x = parseFloat(attr.data[i].x);
			y = parseFloat(attr.data[i].y);

			if(x > maxX){maxX = x;}
			if(x < minX){minX = x;}

			if(y > maxY){maxY = y;}
			if(y < minY){minY = y;}
		}

		swidth = maxX - minX;
		sheight = maxY - minY;
		sx = attr.width/swidth;
		sy = attr.height/sheight;

		if(sx<sy){
			sy = sx;
		}else{
			sx = sy;
		}

		//Create the result array with new positions which are normalized to the available space
		for(i = 0; i<attr.data.length; i++){
			var t_item = {};
			for(var key in attr.data[i]){
				t_item[key] = attr.data[i][key];
			}

			//For the nmap algorithm this highlights an original position
			//0 indicates empty cells added by this algorithm
			t_item.class = 1;
			t_item.x = (parseFloat(attr.data[i].x)-minX)*sx+1;
			t_item.y = (parseFloat(attr.data[i].y)-minY)*sy+1;

			result.push(t_item);
		}

		//How many empty cells do we need to add to the set?
		var grid_size = ((attr.square) ? Math.ceil(Math.ceil(Math.sqrt(result.length))/4)*4 : Math.ceil(Math.sqrt(result.length))),
			sq_amount = Math.pow(grid_size,2), 	
			sq_missing = sq_amount-result.length,
			ep_num = (1.0/sq_missing);

		//Decide upon which method to use for placing the empty cells?
		switch(attr.method){
			case 'border':
				/*--- Add empty cells from the outer border of the extent of the dataset ---*/
				
				//We will create an array with possible new points which are equally distributed along the extent-rectangle
				var extra_points = [];

				//Top and bottom border
				for(x = 0; x<=grid_size-ep_num; x+=ep_num){
					extra_points.push({class:0,dist:Number.MAX_VALUE,x:((swidth*sx)/grid_size*x)+ep_num*Math.random(),y:ep_num*Math.random()});
					extra_points.push({class:0,dist:Number.MAX_VALUE,x:((swidth*sx)/grid_size*x)+ep_num*Math.random(),y:(sheight*sy)+1+ep_num*Math.random()});
				}

				//Left and right border
				for(y = 0; y<=grid_size-ep_num; y+=ep_num){
					extra_points.push({class:0,dist:Number.MAX_VALUE,x:ep_num*Math.random(), 				y:((sheight*sy)/grid_size*y)+ep_num*Math.random()});
					extra_points.push({class:0,dist:Number.MAX_VALUE,x:(swidth*sx)+1+ep_num*Math.random(),	y:((sheight*sy)/grid_size*y)+ep_num*Math.random()});
				}

				//Adding new points until the rectangle is full
				while(sq_missing>0){
					//Choosing the point which is the furthest away from its neighbours 
					extra_points = squared.calcDist(extra_points, result);
					result.push(extra_points[extra_points.length-1]);
					sq_missing--;
				}

			break;
			case 'quad':
				/*--- Add empty cells by calculating empty areas with a quadtree function ---*/
				if(typeof(d3.geom.quadtree) !== typeof(Function)){ throw "ERROR: If you want the quadtree method need to include the d3 library."; }

				//Prepare the data to be passed to d3's quadtree function
				var quad_data = [];
				for(i = 0; i<result.length; i++){
					quad_data.push([result[i].x, result[i].y]);
				}

				//Initiate d3's quadtree
				var quad_extent = [[0,0],[(swidth*sx+2), (sheight*sy+2)]];
				while(sq_missing>0){
					var quadtree = d3.geom.quadtree()
						.extent(quad_extent)
						(quad_data);

					var qwidth = swidth*sx;
					var qheight = sheight*sy;
					if(qwidth < qheight){qwidth = qheight;}{qheight = qwidth;}
					
					//Finding the empty squares
					var emptySquares = squared.checkForEmptySquares(quadtree, 0, qwidth, qheight, 0, 0);

					//Measuring the size of the empty squares
					emptySquares = squared.measureSquares(emptySquares, swidth*sx, sheight*sy);

					//Add empty squares
					if(emptySquares.length>0){
						quad_data.push([emptySquares[(emptySquares.length-1)].x,emptySquares[(emptySquares.length-1)].y]);
						result.push(emptySquares[(emptySquares.length-1)]);
						sq_missing--;
					}else{
						//If quadtree cannot find anymore empty cells add some more empty quads in the upper left corner
						//This is not really ideal, but quadtree doesn't seems to be useful anyway
						var ep_plus = ep_num/sq_missing;
						while(sq_missing>0){
							result.push({x:ep_num+ep_plus*sq_missing,y:ep_num+ep_plus});
							sq_missing--;
						}
					}
				}
			break;
		}
	}

	/**
	* calculate distance between points in two arrays
	* @param {array} array1
	* @param {array} array1.x - x position
	* @param {array} array1.y - y position
	* @param {array} array1.dist - max distance to array2 points
	* @param {array} array2
	* @param {array} array2.x - x position
	* @param {array} array2.y - y position
	* @return {array} array1 - array1 with updated dist attribute
	*/
	squared.calcDist = function(array1, array2){
		for(var i = 0; i<array1.length; i++){
			for(var ii = 0; ii<array2.length; ii++){
				var t_dist = Math.sqrt((array1[i].x-array2[ii].x)*(array1[i].x-array2[ii].x)+(array1[i].y-array2[ii].y)*(array1[i].y-array2[ii].y));
				if(array2[ii].class===0){
					t_dist *= attr.border_adv;
				}
				if(t_dist < array1[i].dist){
					array1[i].dist = t_dist;
				}
			}
		}

		array1.sort(function(a1,a2){
			if(a1.dist < a2.dist){
				return -1;
			}else if(a1.dist > a2.dist){
				return 1;
			}else{
				return 0;
			}
		});

		return array1;
	};

	/**
	* measure area of rectangles, rectangles that go beyond width/height are resized
	* rectangles outside width/height are ignored (size = 0)
	* @param {array} squares
	* @param {float|integer} squares.x - x of upper left corner of the rectangle
	* @param {float|integer} squares.y - y of upper left corner of the rectangle
	* @param {float|integer} squares.width - height of the rectangle
	* @param {float|integer} squares.height - height of the rectangle
	* @param {float|integer} squares.size - area of the rectangle
	* @param {float|integer} width - extent width
	* @param {float|integer} height - extent height
	* @return {array} squares - updated array of rectangles with size
	*/
	squared.measureSquares = function(squares, width, height){
		for(var i = 0; i<squares.length; i++){
			squares[i].swidth = squares[i].width;
			squares[i].sheight = squares[i].height;

			if((squares[i].x > width)||(squares[i].y > height)){
				squares[i].size = 0;
			}else{
				if((squares[i].x+squares[i].width) > width){
					squares[i].swidth = width-squares[i].x;
				}
				if((squares[i].y+squares[i].height) > height){
					squares[i].sheight = height-squares[i].y;
				}
				squares[i].size = squares[i].sheight*squares[i].swidth;
			}
		}

		squares.sort(function(a1, a2){
			if(a1.size < a2.size){
				return -1;
			}else if(a1.size > a2.size){
				return 1;
			}else{
				return 0;
			}
		});

		return squares;
	};

	/**
	* find empty rectangles within a quadtree map
	* rectangles outside width/height are ignored (size = 0)
	* @param {array} node - d3 quadtree node object (see d3 for further info)
	* @param {integer} level - treemap level
	* @param {float|integer} width - width of current quadtree area
	* @param {float|integer} height - height of current quadtree area
	* @param {float|integer} x - upper left x of current quadtree area
	* @param {float|integer} y - upper left y of current quadtree area
	* @return {array} t_emptySquares - array of empty squares in the treemap
	*/
	squared.checkForEmptySquares = function(node, level, width, height, x, y){
		var t_emptySquares = [], x_dist, y_dist, i;
		//Don't do it on nodes
		//TODO: sometimes it happens that one leaf occupies a large area, in the future we need to calculate the unoccupied area within a leaf for better performance
		if(!node.leaf){
			var real_length = 0;
			for(i in node.nodes){
				real_length++;
			}
			if(real_length<4){
				//Luckily the keys of the child-nodes are still in the right order
				//0 - top left
				//1 - top reight
				//2 - bottom left
				//3 - bottom right
				//So we can figure out which ones are missing and calculate their extent
				var missings = [];
				for(i = 0; i<4; i++){
					if(!(i in node.nodes)){
						missings.push(i);
					}
				}
				var missed = [];

				//If two areas next to each other are missing > combine them to one large area
				if((missings.indexOf(0)>=0)&&(missings.indexOf(1)>=0)){
					missed.push(0);
					missed.push(1);
					t_emptySquares.push(squared.createMissingRect(2, 1, level, width, height, x, y));
				}else if((missings.indexOf(2)>=0)&&(missings.indexOf(3)>=0)){
					missed.push(2);
					missed.push(3);
					t_emptySquares.push(squared.createMissingRect(2, 1, level, width, height, x, y+(height/2)));
				}else if((missings.indexOf(0)>=0)&&(missings.indexOf(2)>=0)){
					missed.push(0);
					missed.push(2);
					t_emptySquares.push(squared.createMissingRect(1, 2, level, width, height, x, y));
				}else if((missings.indexOf(1)>=0)&&(missings.indexOf(3)>=0)){
					missed.push(1);
					missed.push(3);
					t_emptySquares.push(squared.createMissingRect(1, 2, level, width, height, x+(width/2), y));
				}

				//The single missing squares are just added
				for(i = 0; i<4; i++){
					if((missed.indexOf(parseInt(i))<0)&&(missings.indexOf(parseInt(i))>=0)){
						x_dist=0;
						y_dist=0;
						switch(parseInt(i)){
							case 0:
								//nothing
							break;
							case 1:
								x_dist =(width/2);
							break;
							case 2:
								y_dist = (height/2);
							break;
							case 3:
								x_dist = (width/2);
								y_dist = (height/2);
							break;
						}
						t_emptySquares.push(squared.createMissingRect(1, 1, level, width, height, x+x_dist, y+y_dist));	
					}
				}
			}
			//For the child-squares that have child nodes, do the checking again.
			for(i = 0; i<4; i++){
				if((i in node.nodes)){
					x_dist=0;
					y_dist=0;
					switch(parseInt(i)){
						case 0:
							//nothing
						break;
						case 1:
							x_dist = (width/2);
						break;
						case 2:
							y_dist = (height/2);
						break;
						case 3:
							x_dist = (width/2);
							y_dist = (height/2);
						break;
					}
					t_emptySquares = t_emptySquares.concat(squared.checkForEmptySquares(node.nodes[i], level+1, (width/2), (height/2), x+x_dist, y+y_dist));

				}
			}
		}

		return t_emptySquares;
	};

	/**
	* create a rectangle object
	* @param {float|integer} x_dist - over how many squares does the new rectangle go (1 or 2)
	* @param {float|integer} y_dist - over how many squares does the new rectangle go (1 or 2)
	* @param {float|integer} level - level within in the treemap (indicator of size)
	* @param {float|integer} width - width of parent square
	* @param {float|integer} height - height of parent square
	* @param {float|integer} x - x of upper left corner of rectangle
	* @param {float|integer} y - y of upper left corner of rectangle
	* @return {array} t_emptySquares - array of empty squares in the treemap
	*/
	squared.createMissingRect = function(x_dist, y_dist, level, width, height, x, y){
		return {
			ox : x,
			oy : y,
			x: x + ((width/2)*x_dist)/2,
			y: y + ((height/2)*y_dist)/2,
			height : (height/2)*y_dist,
			width : (width/2)*x_dist,
			level : level,
			size:0,
			class:0
		};
	};

	squared();

	return {width:swidth*sx+2, height:sheight*sy+2, data:result};
};