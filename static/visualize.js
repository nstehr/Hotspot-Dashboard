
var Project = function(name,id){
	this.projectName = name;
	this.projectId = id;
}

function ProjectsViewModel() {
    this.projects = ko.observableArray();
    this.selectedProject = ko.observable();
    
}

var viewModel = new ProjectsViewModel();

// Activates knockout.js
ko.applyBindings(viewModel);


$.getJSON('/projects', function(data) {
    var projects = [];
    for(var i=0;i<data.length;i++){
		projects.push(new Project(data[i].name, data[i].id));
	}
	viewModel.projects(projects);
	viewModel.selectedProject(projects[0]);
});

function renderAuthorChart(jsondata){
 
    var chartWidth = 1200;
    var chartHeight = 525;
    var xTranslate = 170;
    //pull the filenames out of the json data, and strip the package information
    var files = jsondata.map(function(d) { return d.filename.replace(/^.*[\\\/]/, '')});
    
    var authors = [];
    var editCounts = [];
    var data = [];
    //massage the data into something useable for this viz.
    $.each(jsondata,function(index,hotspot){
    	hotSpotAuthors = hotspot['authors']; 
    	$.each(hotSpotAuthors,function(name,editCount){
    	    //if the author is not already in the list
    	    if($.inArray(name,authors) < 0){
    	    	authors.push(name);
    	    }
    	    editCounts.push(editCount);
    	    
    	    var datum = {};
    	    datum.filename = hotspot.filename.replace(/^.*[\\\/]/, '');
    	    datum.author = name;
    	    datum.editCount = editCount;
    	    
    	    data.push(datum);
    	    
    	    
    	});
    });
   //create the x scale, based on the author data
   var x = d3.scale.ordinal()
    		.domain(authors)
    		.rangeBands([0,(chartWidth/2)+xTranslate]);
    //create the y scale, based on the hotspot file data
    var y = d3.scale.ordinal()
    		.domain(files)
    		.rangeBands([0,chartHeight*0.90]);
    //create a scale for the radius of the dot, based on the number of edits to a file		
    var radiusScale = d3.scale.linear()
	    .domain([d3.min(editCounts), d3.max(editCounts)])
	    .range([5, 20]);
    
    //use the helper axis function to generate the x-axis
    var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom")
    .tickPadding(8);
    
    //use the helper axis function to generate the y-axis
    var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left")
    .tickPadding(8);
    
    //attach the chart to the DOM
    var chart = d3.select("#authorChart").append("svg")
	     .attr("width", chartWidth)
	     .attr("height", chartHeight);
   //create a group to hold the x-axis visual	
   chart.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate("+xTranslate+"," + (chartHeight*0.90) + ")")
    .call(xAxis);	     
   //create a group to hold the y-axis visual
	chart.append("g")
    .attr("class", "y axis") 
    .attr("transform", "translate("+xTranslate+",0)")
    .call(yAxis);
    
    //create a group for the circles, to make it easier to move them all into place
    var circleGroup = chart.append("g")
    .attr("transform", "translate("+(xTranslate)+",0)");
    
    //add all the circles to the viz.
    circleGroup.selectAll("circle")
    .data(data)
    .enter().append("circle")
    .attr("cx", function(d) { return x(d.author) + (x.rangeBand()/2); }) //place at the middle of the band, where the tick is
    .attr("cy", -100) 
    .attr("r", function(d){return radiusScale(d.editCount)})
    .attr("fill","steelblue")
    .transition().delay(0).duration(4000).attr("cy", function(d) { return y(d.filename) + (y.rangeBand()/2); }); //gratuitous animation, falls into place
}



function renderPieChart(jsondata){
	var files = jsondata.map(function(d) { return d.filename.substr(d.filename.lastIndexOf('.') + 1)});
	var fileCount = {};
	//create a map of file extension counts
	$.each(files,function(index,extension){
	   if(fileCount[extension])
		   fileCount[extension]++;
		else
		   fileCount[extension] = 1;
	});
	data = [];
	$.each(fileCount, function(key, value) {
	   data.push({"extension":key,"count":value});
	});
	
	var chartWidth = 300,                       
	    chartHeight = 300,                            
	    radius = 125,                            
	    colour = d3.scale.category20c();
	
	//adds the chart to the DOM
	var chart = d3.select("#pieChart")
		 .append("svg")             
		 .data([data])                  
		 .attr("width", chartWidth)          
		 .attr("height", chartHeight)
		 .append("g")                
		 .attr("transform", "translate(" + radius + "," + radius + ")")
		
	var arc = d3.svg.arc()              
		 .outerRadius(radius);
	
	//helper function to generate the pie chart layout based on the counts of the file extensions	
	var pie = d3.layout.pie()           
		  .value(function(d) { return d.count; });
	
    var arcs = chart.selectAll("g.slice")    
		  .data(pie)                        
		  .enter()                           
		  .append("g")               
		  .attr("class", "slice");    

    //creates the pie chart
	arcs.append("path")
		 .attr("fill", function(d, i) { return colour(i); } ) 
		 .attr("d", arc)
		.transition()	//gratuitous animation, animates the graph rotating into place
            	.ease("circle")
            	.duration(3000)
            	.delay(function(d, i) { return i * 50; })
            	.attrTween("d", function(b){
			b.innerRadius = 0;
          	        var i = d3.interpolate({startAngle: 0, endAngle: 0}, b);
                        return function(t) {
                             return arc(i(t));
                         };
                    });                                   
	//adds the text labels to the pie chart
    arcs.append("text")                                     
         .attr("transform", function(d) {                   
                d.innerRadius = 0;
                d.outerRadius = radius;
		        return "translate(" + arc.centroid(d) + ")";       
		         })
		 .attr("text-anchor", "middle")
		 .attr("stroke", "white")
		 .attr("fill", "white")             
		 .text(function(d, i) { return data[i].extension; });
	
}



function renderBarChart(jsondata){
	var data = jsondata.map(function(d) { return d.score; });
	var files = jsondata.map(function(d) { return d.filename.replace(/^.*[\\\/]/, '')});
	
	var chartWidth = 520; //total width of the chart
	var barHeight = 25;  //height of an individual bar
	var chartHeight = barHeight * data.length;
	var xTranslate = 200;
	var chart = d3.select("#chart").append("svg")
	     .attr("class", "chart")
	     .attr("width", chartWidth)
	     .attr("height", chartHeight)
    //set up a function to calculate the x for the bar chart
	var x = d3.scale.linear()
	    .domain([0, d3.max(data)])
	    .range([0, chartWidth-xTranslate]);
	
	//a second scale to hold the first little bar.  Used to give 
	//the one square edge
	var x1 = d3.scale.linear()
		 .domain([0, 1])
		 .range([20, 20]);
		 
    //a group to hold the bars
	var barGroup = chart.append("g") 
		.attr("transform", "translate("+xTranslate+",0)");
	//the bars that make up the bar chart
    barGroup.selectAll("rect")
	    .data(data)
	    .enter().append("rect")
		.attr("y", function(d, i) { return i * barHeight; })
		.attr("rx",10)
		.attr("ry",10)
		.attr("width", 0)
		.attr("height", barHeight)
		.attr("fill","steelblue")
		.attr("stroke","white")
		.transition().delay(function(d,i){return 500;}).duration(3000).attr("width", x); //gratuitous animation, animates the bars sliding into place
		
	  //draw a line the thickness of the rect to give the rect rounded
	  //corners on only one end
	  var lineGroup = chart.append("g")
		 .attr("transform", "translate("+xTranslate+",0)");
	    lineGroup.selectAll("line")
		    .data(data)
		    .enter().append("rect")
			.attr("y", function(d, i) { return i * barHeight; })
			.attr("width", 0)
			.attr("height", barHeight)
			.attr("fill","steelblue")
			.attr("stroke","white")
			.transition().delay(0).duration(3000).attr("width", x1);
		
		
	//a group to hold the hot spot scores	
	var scoreGroup = chart.append("g")
	     .attr("stroke", "white")
	     .attr("fill", "white");
    //add the scores to the group
	scoreGroup.selectAll("text")
		 .data(data)
		 .enter().append("text")
		 .attr("x", x)
		 .attr("y", function(d, i) { return (i * barHeight) + (barHeight/2); })
		 .attr("dx", -3) // padding-right
		 .attr("dy", ".35em") // vertical-align: middle
		 .attr("text-anchor", "end") // text-align: right
		 .text(function(d,i){return Math.round(d*1000)/1000})
		 .attr("transform", "translate("+xTranslate+",0)");
	 //a group to hold the filenames
	 var filenameGroup = chart.append("g")
	     .attr("transform", "translate(0,5)");
	 //add the filenames to the group	
	 filenameGroup.selectAll("text")
		 .data(data)
		 .enter()
		 .append("text")
		 .attr("width", chartWidth)
		 .attr("class", "title")
		 .attr("y", function(d, i) { return (i * barHeight) + (barHeight/2); })
		 .text(function(d,i) { return files[i]; });
}	