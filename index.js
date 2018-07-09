(function(){var script=document.createElement('script');script.onload=function(){var stats=new Stats();document.body.appendChild(stats.dom);requestAnimationFrame(function loop(){stats.update();requestAnimationFrame(loop)});};script.src='//rawgit.com/mrdoob/stats.js/master/build/stats.min.js';document.head.appendChild(script);})()

THREE.TrackballControls = TrackballControls; //Link module to Three

const graph3D = Graph3D();
const Graph = graph3D(document.getElementById("3d-graph"));
const graphApi = new GraphApi(Graph);

var displayGraphInfo = function() {
	// TODO: move computePartites to graphAPI
	var partites = Graph.computePartites();

	const diagnosisPanel = document.getElementById("diagnostic-info-panel");
	diagnosisPanel.innerHTML = "<p>Cick a node.</p>"

	const graphpanel = document.getElementById("graph-info-panel");
	graphpanel.innerHTML = '';
	for (var i = 0; i < partites.length; i += 1) {
		var p = partites[i];
		const name = p.name;
		const count = p.memberCount;

		const partiteInfo = document.createElement('p');
		partiteInfo.innerHTML = name + " contains " + count + " members";
		graphpanel.appendChild(partiteInfo);
		graphpanel.appendChild(document.createElement("b"));
	}
}

var displayUserControlInfo = function(html) {
	const graphpanel = document.getElementById("control-info-panel");
	graphpanel.innerHTML = '';
	graphpanel.innerHTML = html;
}

var displayDiagnosticInfo = function(thingsToDisplay) {
	const diagnosisPanel = document.getElementById("diagnostic-info-panel");
	diagnosisPanel.innerHTML = "<p>This is what you clicked last...</p><br/>";

	for (var i = 0; i < thingsToDisplay.length; i += 1) {
		var thing = thingsToDisplay[i];


		const partiteInfo = document.createElement('p');
		partiteInfo.innerHTML = thing[0] + ((thing.length >= 3) ? thing[2] : " : ") + thing[1];
		diagnosisPanel.appendChild(partiteInfo);
		diagnosisPanel.appendChild(document.createElement("b"));
	}
}

let curDataSetIdx;
var dataSets = getGraphDataSets();

let roundRobinData;
(roundRobinData = function() {
	displayUserControlInfo("<p>Hit one of those buttons on the right ---></p>");
	curDataSetIdx = curDataSetIdx === undefined ? 0 : (curDataSetIdx+1)%dataSets.length;
	const dataSet = dataSets[curDataSetIdx];

	dataSet(Graph, displayGraphInfo); // Load data set
})(); // IIFE init

function nodeClickCallBack(nodeid) {
	var node = graphApi.diagnostics_getNode(nodeid);
	console.log(node);

	var thingsToDisplay = [];
	thingsToDisplay.push(
		["x", node.x], 
		["y", node.y], 
		["z", node.z], 
		["ID", node.id], 
		["Label", node.label],
		["Color", "#" + node.color.getHexString().toUpperCase()],
	);

	var neighboringNodes = graphApi.diagnostics_getNeighboringNodes(nodeid);
	thingsToDisplay.push(["incoming", "nodes:", " "]);

	var incoming = neighboringNodes.incoming;
	for (var i = 0; i < incoming.length; i += 1) {
		thingsToDisplay.push([incoming[i], nodeid, " -> "]);
	}

	thingsToDisplay.push(["outgoing", "nodes:", " "]);
	var outgoing = neighboringNodes.outgoing;
	for (var i = 0; i < outgoing.length; i += 1) {
		thingsToDisplay.push([nodeid, outgoing[i], " -> "]);
	}

	displayDiagnosticInfo(thingsToDisplay);
}

function boom() {
	dataSets = getGraphDataSets(true);
	roundRobinData();
}

graphApi.setClickNodeCallback(nodeClickCallBack);

function resetColor() {
	var colorString = (Math.random()*0xFFFFFF<<0).toString(16);
	var color = parseInt(colorString, 16);
	var color = parseInt((Math.random()*0xFFFFFF<<0).toString(16), 16);
	graphApi.colorBackground(color);
	displayUserControlInfo("<p>Background color: #" + colorString.toUpperCase());
}

function recolorEdges() {
	var colorString = (Math.random()*0xFFFFFF<<0).toString(16);
	var colorString2 = (Math.random()*0xFFFFFF<<0).toString(16);
	var color = parseInt(colorString, 16);
	var color2 = parseInt(colorString2, 16);
	graphApi.colorAllEdges(function() {
		if (Math.random() > 0.5) {
			return color;
		}
		return color2;
	});
	displayUserControlInfo("<p>Edge colors: #" + colorString.toUpperCase() + ", " + colorString2.toUpperCase());
}

function colorNodes() {
	var colorString = (Math.random()*0xFFFFFF<<0).toString(16);
	var color = parseInt(colorString, 16);
	graphApi.colorAllNodes(function() {
		return color;
	});

	displayUserControlInfo("<p>Node color: #" + colorString.toUpperCase());
}

function colorNodeWithQuirks() {
	toggleEdges();
	var colorString = (0x555555).toString(16);
	var color = parseInt(colorString, 16);
	graphApi.colorAllNodes(function() {
		return color;
	});

	var array = [];
	var max = 0;
	for (var i = 0; i < 340; i += 1) {
		var element = i*2;
		array.push(element);
		if (max < element) {
			max = element;
		}
	}

	graphApi.colorAllNodes(function() {
		return 0xff0000;
	}, array);

	graphApi.changeOpacityForNodes(function(node) {
		var id = node.id;
		return id/max;
	}, array)

	displayUserControlInfo("<p>Node color: #" + colorString.toUpperCase());
}

function cascaseNodes() {
	var colorString = (Math.random()*0xFFFFFF<<0).toString(16);
	var color = parseInt(colorString, 16);

	// TODO: move Graph.flow to graphAPI
	graphApi.flow(color);
	displayUserControlInfo("<p>Cascading from: #" + colorString.toUpperCase());
}

function toggleEdges() {
	graphApi.toggleEdges();
	displayUserControlInfo("<p>Toggling edges, are we?</p>");
}

function toggleNodes() {
	graphApi.toggleNodes();
	displayUserControlInfo("<p>Toggling nodes, are we?</p>");
}

function togglePartiteEdges() {
	graphApi.toggleEdges(true);
	displayUserControlInfo("<p>Toggling edges across different levels, are we?</p>");
}

function timedShow() {
	graphApi.timeLapse();
	displayUserControlInfo("<p>Replay ;)</p>");
}

function clearOverlays() {
	graphApi.clearOverlays();
}