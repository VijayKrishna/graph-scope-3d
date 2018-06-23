THREE.TrackballControls = TrackballControls; //Link module to Three

const graph3D = Graph3D();
const Graph = graph3D(document.getElementById("3d-graph"));
const graphApi = new GraphApi(Graph);

var displayGraphInfo = function() {
	// TODO: move computePartites to graphAPI
	var partites = Graph.computePartites();

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

let curDataSetIdx;
const dataSets = getGraphDataSets();
console.log('dataSets from index.js', dataSets);

let roundRobinData;
(roundRobinData = function() {
	displayUserControlInfo("<p>Hit one of those buttons on the right ---></p>");
	curDataSetIdx = curDataSetIdx === undefined ? 0 : (curDataSetIdx+1)%dataSets.length;
	const dataSet = dataSets[curDataSetIdx];

	dataSet(Graph, displayGraphInfo); // Load data set
})(); // IIFE init

function nodeClickCallBack(nodeid) {
	graphApi.colorAllNodes(function() {
		return 0xff0000;
	}, [nodeid]);

	console.log(graphApi.diagnostics_getNode(nodeid));
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
	Graph.flow(color);
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
	Graph.timedShow();
	displayUserControlInfo("<p>Replay ;)</p>");
}