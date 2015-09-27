# nmap-squared.js
Extension to the nmap algorithm to derive at an equal-sized treemap within a rectangle

![Examples](https://raw.githubusercontent.com/sebastian-meier/nmap-squared.js/master/img/nmap-squared.png)

## Method

The function is a helper for equally sized treemap generation, using the nmap algorithm. The approach adds new empty points to the set to achieve a square number of points that can be then visualized with the same area.

Two examples with US states and London Boroughs, can be found [here](http://prjcts.sebastianmeier.eu/nmap/squared/examples/index.html)

The function incorporates two approaches, the first approach "border" is placing new points at the outer extent of the dataset and the second approach "quad" is using a quadtree function to find empty areas to place new points. A visual comparison can be found [here](http://prjcts.sebastianmeier.eu/nmap/squared/examples/process.html).

## Usage

You can use it in combination with the original [nmap.js library](https://github.com/sebastian-meier/nmap.js).

```
var border = nmap_squared({
	//Max-Extent of the output data
	width:300,
	height:300,
	//Array with points {x:,y:}
	data:data,
	//Approach to use either border or quad
	method:"border",
	//Decide if to generate a 4*n number of rows and cols
	square:false
});

var border_elements = [];
for(var i = 0; i<border.data.length; i++){
	border_elements.push(new nmap_element({
		id:i,
		x:parseFloat(border.data[i].x),
		y:parseFloat(border.data[i].y),
		weight:10000+Math.random(),
		klass:border.data[i].class
	}));
}
var border_map = new nmap({x:0,y:0,width:parseFloat(border.width), height:parseFloat(border.height)});
var border_ac = border_map.alternateCut({elements:border_elements});
```
For further information on how to use the nmap features check the [nmap repo](https://github.com/sebastian-meier/nmap.js).