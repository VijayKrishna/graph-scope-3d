THREE.TrackballControls = TrackballControls; //Link module to Three

const graph3D = Graph3D();
const Graph = graph3D(document.getElementById("3d-graph"));

var displayGraphInfo = function() {
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

let toggleData;
(toggleData = function() {
	displayUserControlInfo("<p>Hit one of those buttons on the right ---></p>");
	curDataSetIdx = curDataSetIdx === undefined ? 0 : (curDataSetIdx+1)%dataSets.length;
	const dataSet = dataSets[curDataSetIdx];

	dataSet(Graph, displayGraphInfo); // Load data set
	// document.getElementById('graph-data-description').innerHTML = dataSet.description ? `Viewing ${dataSet.description}` : '';
})(); // IIFE init

function resetColor() {
	var colorString = (Math.random()*0xFFFFFF<<0).toString(16);
	var color = parseInt(colorString, 16);
	var color = parseInt((Math.random()*0xFFFFFF<<0).toString(16), 16);
	Graph.bkgColor(color);
	displayUserControlInfo("<p>Background color: #" + colorString.toUpperCase());
}

function recolorEdges() {
	var colorString = (Math.random()*0xFFFFFF<<0).toString(16);
	var color = parseInt(colorString, 16);
	Graph.edgeColor(color);
	displayUserControlInfo("<p>Edge color: #" + colorString.toUpperCase());
}

function toggleEdges() {
	Graph.toggleEdges();
	displayUserControlInfo("<p>Toggling edges, are we?</p>");
}

function colorNodes() {
	var colorString = (Math.random()*0xFFFFFF<<0).toString(16);
	var color = parseInt(colorString, 16);
	Graph.nodeColor(color);
	displayUserControlInfo("<p>Node color: #" + colorString.toUpperCase());
}

function toggleNodes() {
	Graph.toggleNodes();
	displayUserControlInfo("<p>Toggling nodes, are we?</p>");
}

function cascaseNodes() {
	var colorString = (Math.random()*0xFFFFFF<<0).toString(16);
	var color = parseInt(colorString, 16);
	Graph.flow(color);
	displayUserControlInfo("<p>Cascading from: #" + colorString.toUpperCase());
}

function togglePartiteEdges() {
	Graph.togglePartiteEdges();
	displayUserControlInfo("<p>Toggling edges across different levels, are we?</p>");
}