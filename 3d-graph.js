var ZERO = new THREE.Vector2(0, 0);
var envDebug = null;
var pointCount = 15;


function assert(condition = true, message = "Unknown Assert") {
	if (typeof(condition) != "boolean") {
		throw "Can use assert only with boolean values";
	}

	if (!condition) {
		throw message;
	}
}

// #region Partite Class

var partites = [];
class Partite {
	constructor(name, memberCount, membershipChecker) {
		this.name = name;
		this.memberCount = memberCount;
		this.members = [];
		this.membershipChecker = membershipChecker;
		this.centeroid = new THREE.Vector3(0, 0, 0);
		this.minBounds = new THREE.Vector2(0, 0);
		this.maxBounds = new THREE.Vector2(0, 0);
	}

	isMember(a) {
		return this.membershipChecker(a);
	}

	addMember(m, x, y, z) {
		if (this.memberCount === 0) {
			this.minBounds.x = this.maxBounds.x = this.centeroid.x = x;
			this.minBounds.y = this.maxBounds.y = this.centeroid.y = y;
			this.centeroid.z = z;
		} else {
			this.centeroid.x = ((this.centeroid.x * this.memberCount) + x) / (this.memberCount + 1);
			this.centeroid.y = ((this.centeroid.y * this.memberCount) + y) / (this.memberCount + 1);
			this.centeroid.z = ((this.centeroid.z * this.memberCount) + z) / (this.memberCount + 1);

			// compute max
			if (x > this.maxBounds.x) {
				this.maxBounds.x = x;
			}
			if (y > this.maxBounds.y) {
				this.maxBounds.y = y;
			}

			// compute min
			if (x < this.minBounds.x) {
				this.minBounds.x = x;
			}
			if (y < this.minBounds.y) {
				this.minBounds.y = y;
			}
		}

		this.members.push(m);
		this.memberCount += 1;
	}

	getCenteroid() {
		return this.centeroid;
	}

	static getPartite(nodePosition) { // TODO yeah ... this is ugly. need to fix it.
		for (var p = 0; p < partites.length; p += 1) {
			var partite = partites[p];
			if (partite.isMember(nodePosition)) {
				return partite;
			}
		}

		return null;
	}
}

// #endregion

function Graph3D() {

	var graphModel = null;
	var pointsController = null;
	var linksController = null;

	chart.getGraphModel = function() {
		if (graphModel == null) {
			graphModel = new GraphModel(env.graph);
		}
		return graphModel;
	}

	chart.getPointsController = function() {
		if (pointsController === null) {
			pointsController = new PointsController(this.getGraphModel(), env.nodePoints.geometry);
		}
		return pointsController;
	}

	chart.getLinksController = function() {
		if (linksController === null) {
			linksController = new LinksController(this.getGraphModel(), env.lineMesh.geometry);
		}
		return linksController;
	}

	const CAMERA_DISTANCE2NODES_FACTOR = 150;

	const env = { // Holds component state
		initialised: false,
		onFrame: () => {},
		bkgColor: 0x111111,
		edgeColor: 0x0077FF,
		graph: null,
		lineMesh: null,
		nodePoints: null,
		edgesVisible: true,
		nodesVisible: true
	};
	envDebug = env;

	function printCamPos() {
		console.log(env.camera);
	}

	function initStatic() {
		// Wipe DOM
		env.domNode.innerHTML = '';

		// Add nav info section
		const navInfo = document.createElement('div');
		navInfo.classList.add('graph-nav-info');
		navInfo.innerHTML = "MOVE mouse &amp; press LEFT/A: rotate, MIDDLE/S: zoom, RIGHT/D: pan";
		env.domNode.appendChild(navInfo);

		// Setup tooltip
		env.toolTipElem = document.createElement('div');
		env.toolTipElem.classList.add('graph-tooltip');
		env.domNode.appendChild(env.toolTipElem);

		// Capture mouse coords on move
		env.raycaster = new THREE.Raycaster();
		env.raycaster.params.Points.threshold = 5;
		env.mouse = new THREE.Vector2();
		env.mouse.x = -2; // Initialize off canvas
		env.mouse.y = -2;
		env.domNode.addEventListener("mousemove", ev => {
			// update the mouse pos
			const offset = getOffset(env.domNode),
				relPos = {
					x: ev.pageX - offset.left,
					y: ev.pageY - offset.top
				};
			env.mouse.x = (relPos.x / env.width) * 2 - 1;
			env.mouse.y = -(relPos.y / env.height) * 2 + 1;

			// Move tooltip
			env.toolTipElem.style.top = (relPos.y - 40) + 'px';
			env.toolTipElem.style.left = (relPos.x - 20) + 'px';

			function getOffset(el) {
				const rect = el.getBoundingClientRect(),
					scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
					scrollTop = window.pageYOffset || document.documentElement.scrollTop;
				return { top: rect.top + scrollTop, left: rect.left + scrollLeft };
			}
		}, false);
		env.domNode.addEventListener('click', clickNode);

		// Setup camera
		env.camera = new THREE.PerspectiveCamera();
		env.camera.far = 30000;
		env.camera.position.z = 2200;
		env.camera.position.x = -1473;
		env.camera.position.y = -300;
		env.camera.zoom = 6;

		// Setup scene
		env.scene = new THREE.Scene();

		// Setup renderer
		env.renderer = new THREE.WebGLRenderer();
		env.renderer.setClearColor(env.bkgColor, 1);
		
		env.domNode.appendChild(env.renderer.domElement);

		// Add camera interaction
		env.controls = new THREE.TrackballControls(env.camera, env.renderer.domElement);
		env.initialised = true;

		// Kick-off renderer
		(function animate() { // IIFE
			env.onFrame();

			// Update tooltip
			env.raycaster.setFromCamera(env.mouse, env.camera);
			var intersects = registerNodesWithRaycaster();
			env.toolTipElem.innerHTML = (intersects != null && intersects.length) ? intersects[0].index || '' : '';
			

			// Frame cycle
			env.controls.update();
			env.renderer.render(env.scene, env.camera);
			requestAnimationFrame(animate);
		})()
	}

	function digest() {
		if (!env.initialised) 
			return

		resizeCanvas();
		recolorCanvas();

		env.onFrame = ()=>{}; // Clear previous frame hook
		env.scene = new THREE.Scene(); // Clear the place

		// Build graph with data
		const graph = ngraph.graph();
		for (let nodeId in env.graphData.nodes) {
			graph.addNode(nodeId, env.graphData.nodes[nodeId]);
		}
		for (let link of env.graphData.links) {
			graph.addLink(...link, {});
		}

		env.graph = graph;

		// Add WebGL objects
		drawNodes(graph);
		drawEdges(graph);

		graphModel = null;
		pointsController = null;
		linksController = null;

		env.camera.lookAt(env.scene.position);
		env.camera.position.z = Math.cbrt(Object.keys(env.graphData.nodes).length) * CAMERA_DISTANCE2NODES_FACTOR;

		function recolorCanvas() {
			env.renderer.setClearColor(env.bkgColor, 1);
		}

		function resizeCanvas() {
			if (env.width && env.height) {
				env.renderer.setSize(env.width, env.height);
				env.camera.aspect = env.width/env.height;
				env.camera.updateProjectionMatrix();
			}
		}
	}


	// #region Draw Nodes

	function nodePosition(node) {
		return {
			x : node.data.x,
			y : node.data.y,
			z : node.data.z
		};
	}

	function drawNodes(graph) {
		// var sphereGeometry = new THREE.SphereGeometry();
		
		var positions = [];
		var colors = [];
		graph.forEachNode(node => {
			// const nodeMaterial = new THREE.MeshBasicMaterial({ color: env.colorAccessor(node.data)/* || 0xffffaa*/, transparent: false });
			// nodeMaterial.opacity = 1.0;

			var color = new THREE.Color(env.colorAccessor(node.data));
			node.data.color = color;

			colors.push(color.r);
			colors.push(color.g);
			colors.push(color.b);

			positions.push(node.data.x);
			positions.push(node.data.y);
			positions.push(node.data.z);
		});

		var sprite = new THREE.TextureLoader().load( 'disc2.png' );
		var spheresGeometry = new THREE.BufferGeometry();
		spheresGeometry.addAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );
		spheresGeometry.addAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
		spheresGeometry.computeBoundingBox(); // TODO: check why we need this. Seems useless.


		var nodeMaterial = new THREE.PointsMaterial( { 
			size: 70, 
			map: sprite,
			transparent: true,
			alphaTest: 0.05,
			vertexColors: THREE.VertexColors 
		} );

		const nodePoints = new THREE.Points(
			spheresGeometry,
			nodeMaterial
		);

		env.nodePoints = nodePoints;
		env.scene.add(env.nodePoints);
	}

	// #endregion

	// #region Draw Edges

	function drawEdges(graph, partiteEdgeKind = 2) {
		chart.computePartites();

		var index = -1;
		var indicies = [];
		var positions = [];
		var newMaterial = new THREE.LineBasicMaterial({
			transparent: true,
			linewidth: 1,
			opacity: 0.1,
			vertexColors: true
		});
		var geometry;

		var li = 0;
		graph.forEachLink(link => {
			link.data = {};
			link.data.id = li;
			li += 1;

			var fromNode = env.graph.getNode(link.fromId);
			var toNode = env.graph.getNode(link.toId);

			var from = new THREE.Vector3( 
				fromNode.data.x, 
				fromNode.data.y, 
				fromNode.data.z );

			var to = new THREE.Vector3( 
				toNode.data.x, 
				toNode.data.y, 
				toNode.data.z );

			var points = EdgeBundler.drawBundledSpline(from, to);
			positions.push(points[0].x, points[0].y, points[0].z);
			index += 1;

			for (var i = 1; i < points.length; i += 1) {
				var p = points[i];
				positions.push(p.x);
				positions.push(p.y);
				positions.push(p.z);
				index +=1;
				indicies.push(index - 1, index);
			}
		});

		geometry = new THREE.BufferGeometry();
		var bufferedPositions = new THREE.Float32BufferAttribute( positions, 3 );
		geometry.addAttribute( 'position', bufferedPositions);
		geometry.setIndex(indicies);
		var lineMesh = new THREE.LineSegments(geometry, newMaterial);
		env.scene.add( lineMesh );
		env.lineMesh = lineMesh;
		chart._paintLinks(new THREE.Color(env.edgeColor));
		console.log(env.renderer.info);
	}

	// #endregion


	// Component constructor
	function chart(chartHostDivElement) {
		env.domNode = chartHostDivElement;

		initStatic();
		digest();

		return chart;
	}


	// #region CompProp

	class CompProp {
		constructor(name, initVal = null, redigest = true, onChange = newVal => {}) {
			this.name = name;
			this.initVal = initVal;
			this.redigest = redigest;
			this.onChange = onChange;
		}
	}

	const exposeProps = [
		new CompProp('width', window.innerWidth),
		new CompProp('height', window.innerHeight),
		new CompProp('graphData', {
			nodes: { 1: { name: 'mock', val: 1 } },
			links: [[1, 1]] // [from, to]
		}),
		new CompProp('nodeRelSize', 4), // volume per val unit
		new CompProp('lineOpacity', 0.2),
		new CompProp('nameAccessor', node => node.name),
		new CompProp('colorAccessor', node => node.color),
		new CompProp('bkgColor', 0x000000)
	];

	// Getter/setter methods
	exposeProps.forEach(prop => {
		chart[prop.name] = getSetEnv(prop.name, prop.redigest, prop.onChange);
		env[prop.name] = prop.initVal;
		prop.onChange(prop.initVal);

		function getSetEnv(prop, redigest = false,  onChange = newVal => {}) {
			return _ => {
				if (!arguments.length) { 
					return env[prop];
				}

				env[prop] = _;
				onChange(_);
				if (redigest) { digest() }
				return chart;
			}
		}
	});

	// Reset to default state
	chart.resetState = function() {
		this.graphData({nodes: [], links: []})
			.nodeRelSize(4)
			.lineOpacity(0.2)
			.nameAccessor(node => node.name)
			.colorAccessor(node => node.color)
			.bkgColor(0x000000);

		return this;
	};

	// #endregion

	chart.resetState(); // Set defaults at instantiation


	chart.bkgColor = function(hexColor) {
		env.bkgColor = hexColor;
		env.renderer.setClearColor(env.bkgColor, 1);
	}


	// #region Buffer updates: Node Opacity

	chart.changeNodeOpacity = function(nodeData = null, opacity = 1) {
		env.nodePoints.material.setValues({
			opacity: opacity,
			//transparent: true
		});
	}

	// #endregion


	// #region Buffer updates: Link Colors

	chart.colorLink = function(link, i, hexColor = 0x000000) {
		this._paintLink(new THREE.Color(hexColor), i);
		if (link === null && i === -1) {
			this._refreshLinkPaint();
		}
	}

	chart._paintLinks = function(color = null) {
		var colors = [];

		env.graph.forEachLink(link => {
			if (color != null && color != undefined) {
				if (color.getHex() === env.bkgColor) {
					link.data.revealed = false;
				}

				for (var j = 0; j < pointCount; j += 1) {
					colors.push(color.r);
					colors.push(color.g);
					colors.push(color.b);
				}
				return;
			}

			var fromNode = env.graph.getNode(link.fromId);
			var toNode = env.graph.getNode(link.toId);

			// TODO: fetch color directly from color buffer; do not store on the node itself.
			var fromColor = fromNode.data.color;
			var toColor = toNode.data.color;

			var stepColor = {
				r: (toColor.r - fromColor.r)/pointCount,
				g: (toColor.g - fromColor.g)/pointCount,
				b: (toColor.b - fromColor.b)/pointCount
			};

			for (var j = 0; j < pointCount; j += 1) {
				colors.push(fromColor.r + (j * stepColor.r));
				colors.push(fromColor.g + (j * stepColor.g));
				colors.push(fromColor.b + (j * stepColor.b));
			}
		});

		var oldMaterial = env.lineMesh.material;
		var newMaterial = new THREE.LineBasicMaterial({
			transparent: true,
			linewidth: (oldMaterial === null || oldMaterial === undefined) ? 1 : oldMaterial.linewidth,
			opacity: (oldMaterial === null || oldMaterial === undefined) ? 0.1 : oldMaterial.opacity,
			vertexColors: true
		});

		env.lineMesh.material = newMaterial;

		var lineGeometry = env.lineMesh.geometry;
		lineGeometry.addAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
		lineGeometry.colorsNeedUpdate = true;
	}

	chart._paintLink = function(color, i) {
		if (color.getHex() === env.bkgColor) {
			link.data.revealed = false;
		}
		var lineGeometry = env.lineMesh.geometry;
		var colors = lineGeometry.getAttribute('color').array;
		var blockSize = pointCount * 3;
		var offset = blockSize * i;
		var rgb = [color.r, color.g, color.b];

		for (var j = 0; j < blockSize; j += 1) {
			var index = offset + j;
			colors[index] = rgb[index%3];
		}
	}

	chart._refreshLinkPaint = function() {
		var lineGeometry = env.lineMesh.geometry;
		var colors = lineGeometry.getAttribute('color').array;
		// TODO: can we avoid creating a new THREE.Float32BufferAttribute() here?
		lineGeometry.addAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
		lineGeometry.colorsNeedUpdate = true;
	}

	// #endregion


	// #region Partites

	chart.computePartites = function() {
		var membershipCheckerGenerator = function(i) {
			assert(typeof(i) === "number", "Need number to check against Z co-ordinate");
			assert(i >= 0, "Need positive number to check against Z co-ordinate");

			return function(a) {
				assert(a.hasOwnProperty('z'), "Need Z co-ordinate property to check.");
				return a.z === i;
			};
		}

		if (partites.length > 0) {
			return partites;
		}

		var knownZcoordinates = [];
		env.graph.forEachNode( node => {
			var x = node.data.x;
			var y = node.data.y;
			var z = node.data.z;
			var index = knownZcoordinates.indexOf(z);
			if (index === -1) {
				var partite = new Partite("Level " + partites.length, 0, membershipCheckerGenerator(z));
				partite.addMember(node.data.id, x, y, z);
				knownZcoordinates.push(z);
				partites.push(partite);
			} else {
				var p = partites[index];
				p.addMember(node.data.id, x, y, z);
			}
		});

		return partites;
	}

	// #endregion


	// #region Time Lapse

	chart.timedShow = function() {
		var thisChart = this;
		var linksController = this.getLinksController();
		var pointsController = this.getPointsController();
		linksController.hideLinks();
		pointsController.hideNodes();
		env.nodesVisible = true;
		var timeslice = 4;
		var i = 10;

		var visitedNodes = [];
		var stack = [];

		stack.push(env.graph.getNode(0));

		while(stack.length > 0) {
			var node = stack.pop();

			if (visitedNodes.indexOf(node.id) != -1) {
				continue;
			}

			console.log("visiting " + node.id);
			var nodeRevealed = pointsController.revealNodeAfterTime(node, i);
			if(nodeRevealed) {
				i = i + timeslice;
			}
			var links = env.graph.getLinks(node.id);

			for (var l = 0; l < links.length; l += 1) {
				var link = links[l];

				if (link.fromId != node.id) {
					continue;
				}

				var linkRevealed = linksController.revealLinkAfterTime(link, i);
				if (linkRevealed) {
					i += timeslice;
				}

				var to = env.graph.getNode(link.toId);
				// console.log("going from " + node.id + " to " + to.id);

				if (to === node)
					continue;

				if (visitedNodes.indexOf(to.id) === -1) { // plan on visiting only if you have not visited it before
					stack.push(to);
				}
					
				var anotherNodeRevealed = pointsController.revealNodeAfterTime(to, i);
				if (anotherNodeRevealed) {
					i += timeslice;
				}
			}

			visitedNodes.push(node.id);
		}
	}

	// #endregion


	// #region Click Node

	function registerNodesWithRaycaster() {
		if (env.graph != null) {
			var spheres = [];
			spheres.push(env.nodePoints);
			// env.graph.forEachNode(node => {
			// 	spheres.push(node.data.sphere);
			// });


			var intersects = env.raycaster.intersectObjects(spheres);
			return intersects;
		}

		return null;
	}

	function clickNode() {
		env.raycaster.setFromCamera(env.mouse, env.camera);
		const intersects = registerNodesWithRaycaster();

		if (intersects == null || intersects.length <= 0) {
			return;
		}

		console.log(intersects);

		for (var i = 0; i < intersects.length; i += 1) {
			var object = intersects[0];
			if (!object.hasOwnProperty("index"))
				continue;
			
			if (object.index >= 0) {
				const node = env.graph.getNode(object.index);
				if (chart._clickNodeCallback != null) {
					chart._clickNodeCallback(node.data.id);
				}
				break;
			}
		}
	}

	chart._clickNodeCallback = null;
	chart.setNodeCallback = function(clickNodeCallback) {
		chart._clickNodeCallback = clickNodeCallback;
	}

	// #endregion


	return chart;
}

class GraphModel {
	constructor(_graph) {
		this.graph = _graph;
	}

	getNode(nodeId) {
		return this.graph.getNode(nodeId);
	}

	getNodeData(nodeId) {
		return this.getNode(nodeId).data;
	}

	getNodeCount() {
		return this.graph.getNodesCount();
	}

	enumerateNodes(callOnNode, finishEnumeration, nodeIds = null) {
		if (nodeIds != null && Array.isArray(nodeIds) && nodeIds.length > 0) {
			var dis = this;
			nodeIds.forEach(function(id) {
				const node = dis.graph.getNode(id);
				callOnNode(node.data);
			});
		} else {
			this.graph.forEachNode(node => {
				callOnNode(node.data);
			});
		}

		finishEnumeration();
	}

	enumerateLinks(callOnLink, finishEnumeration) {
		var i = 0;
		this.graph.forEachLink(link => {
			callOnLink(i, link);
			i += 1;
		});

		finishEnumeration();
	}

	getNeighboringNodes(nodeId) {
		var links = this.graph.getLinks(nodeId);
		var incomingIds = [];
		var outgoingIds = [];

		for (var i = 0; i < links.length; i += 1) {
			var link = links[i];
			if (link.fromId === nodeId) {
				outgoingIds.push(link.toId);
			}

			if (link.toId === nodeId) {
				incomingIds.push(link.fromId);
			}
		}

		return {
			incoming : incomingIds,
			outgoing : outgoingIds
		}
	}
}

/**
 * Adds objects to a THREE.Scene.
 */
class Overlays {
	constructor(_scene) {
		this.scene = _scene;
		this.useOverlays = false;
		this.overlaidObjects = [];
		this.overlaidMaterials = [];
		this.overlaidGeometries = [];
	}


	overLayLine(from, to, color) {
		geometry = new THREE.Geometry();
		geometry.vertices.push(from, to);

		var newMaterial = new THREE.LineBasicMaterial({
			color: color,
			transparent: true,
			linewidth: 3,
			opacity: 0.5
		});

		var lineMesh = new THREE.Line(geometry, newMaterial);
		overlaidGeometries.push(geometry);
		overlaidMaterials.push(newMaterial);
		overlaidObjects.push(lineMesh);
		this.scene.add( lineMesh );
	}

	clearOverlays() {
		function emptyArray(array) {
			while (array.length) {
				array.pop();
			}
		}

		for (var i = 0; i < overlaidObjects.length; i += 1) {
			this.scene.remove(overlaidObjects[i]);
			overlaidMaterials[i].dispose();
			overlaidGeometries[i].dispose();
		}

		emptyArray(overlaidObjects);
		emptyArray(overlaidGeometries);
		emptyArray(overlaidMaterials);
	}

}


class LinksController {
	constructor(_graphModel, _linksGeometry) {
		this.graphModel = _graphModel; // model

		// view
		this.linksGeometry = _linksGeometry;
		this.toggleVisibility = true;
		this.togglePartiteVisibility = true;
	}

	gradientColorLinks(color = null) {
		var colors = [];
		var dis = this;
		this.graphModel.enumerateLinks(function(i, link) {
			const pointCount = EdgeBundler.POINT_COUNT;
			if (color != null && color != undefined) {
				for (var j = 0; j < pointCount; j += 1) {
					colors.push(color.r);
					colors.push(color.g);
					colors.push(color.b);
				}
				return;
			}

			var fromNode = dis.graphModel.getNode(link.fromId);
			var toNode = dis.graphModel.getNode(link.toId);

			// TODO: fetch color directly from color buffer; do not store on the node itself.
			var fromColor = fromNode.data.color;
			var toColor = toNode.data.color;

			var stepColor = {
				r: (toColor.r - fromColor.r)/pointCount,
				g: (toColor.g - fromColor.g)/pointCount,
				b: (toColor.b - fromColor.b)/pointCount
			};

			for (var j = 0; j < pointCount; j += 1) {
				colors.push(fromColor.r + (j * stepColor.r));
				colors.push(fromColor.g + (j * stepColor.g));
				colors.push(fromColor.b + (j * stepColor.b));
			}
		}, function() {
			dis.linksGeometry.addAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
			dis.linksGeometry.colorsNeedUpdate = true;
		});
	}

	colorLinks(colorFunction) {
		var dis = this;
		this.graphModel.enumerateLinks(function(i, link) {
			var color = colorFunction(link);
			dis._colorLink(i, new THREE.Color(color));
		}, function() {
			dis._refreshLinkPaints();
		});
	}

	/**
	 * @param {Number} i 
	 * @param {THREE.Color} color 
	 */
	_colorLink(i, color = null) {
		var colors = this.linksGeometry.getAttribute('color').array;
		var blockSize = EdgeBundler.POINT_COUNT * 3;
		var offset = blockSize * i;
		var rgb = [color.r, color.g, color.b];

		for (var j = 0; j < blockSize; j += 1) {
			var index = offset + j;
			colors[index] = rgb[index%3];
		}
	}

	_refreshLinkPaints() {
		var colors = this.linksGeometry.getAttribute('color').array;
		// TODO: can we avoid creating a new THREE.Float32BufferAttribute() here?
		this.linksGeometry.addAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
		this.linksGeometry.colorsNeedUpdate = true;
	}


	// #region Link Visibility

	toggleLinks() {
		if (this.toggleVisibility) {
			this.hideLinks();
			this.toggleVisibility = false;
		} else {
			this.showLinks();
			this.toggleVisibility = true;
		}
	}

	togglePartiteLinks() {
		var dis = this;
		this.graphModel.enumerateLinks(function(i, link) {
			var fromNode = dis.graphModel.getNode(link.fromId);
			var toNode = dis.graphModel.getNode(link.toId);

			var fromZ = fromNode.data.z;
			var toZ = toNode.data.z;

			if (fromZ != toZ || !dis.togglePartiteVisibility) {
				dis._showLink(i, link);
			} else {
				dis._hideLink(i, link);
			}
		}, function() {
			dis._refreshLinkPostions();
		});

		dis.togglePartiteVisibility = !dis.togglePartiteVisibility;
	}

	hideLinks() {
		var dis = this;
		this.graphModel.enumerateLinks(function(i) {
			dis._hideLink(i);
		}, function() {
			dis._refreshLinkPostions();
		});
	}

	showLinks() {
		var dis = this;
		this.graphModel.enumerateLinks(function(i, link) {
			dis._showLink(i, link);
		}, function() {
			dis._refreshLinkPostions();
		});
	}

	revealLinkAfterTime(link, millisecs) {
		var dis = this;

		setTimeout(function() {
			dis._showLink(link.data.id, link);
			dis._refreshLinkPostions();
		}, millisecs);

		return true;
	}

	_showLink(i, link) {
		var fromNode = this.graphModel.getNode(link.fromId);
		var toNode = this.graphModel.getNode(link.toId);

		var from = new THREE.Vector3(fromNode.data.x, fromNode.data.y, fromNode.data.z);
		var to = new THREE.Vector3(toNode.data.x, toNode.data.y, toNode.data.z);

		// TODO refactor the switch in drawEdges into a function and call from here
		var points = EdgeBundler.drawBundledSpline(from, to);
		var positionsT = [];
		var blockSize = EdgeBundler.POINT_COUNT * 3;
		for (var x = 0; x < points.length; x += 1) {
			var p = points[x];
			positionsT.push(p.x);
			positionsT.push(p.y);
			positionsT.push(p.z);
		}

		assert(positionsT.length === blockSize, "positionsT's length:" + positionsT.length);

		this._updateLinkPositions(i, positionsT);
	}

	_hideLink(i) {
		var newPositions = [0, 0, 0];
		this._updateLinkPositions(i, newPositions);
	}

	// #endregion

	_updateLinkPositions(iLink, newPositions) {
		var positions = this.linksGeometry.getAttribute('position').array;
		var blockSize = EdgeBundler.POINT_COUNT * 3;
		var offset = blockSize * iLink;
		for (var j = 0; j < blockSize; j += 1) {
			var index = offset + j;
			positions[index] = newPositions[index % newPositions.length];
		}
	}

	_refreshLinkPostions() {
		var position = this.linksGeometry.getAttribute('position').array;
		// can we avoid creating a new THREE.Float32BufferAttribute() here?
		this.linksGeometry.addAttribute( 'position', new THREE.Float32BufferAttribute( position, 3 ) );
	}
}


class PointsController { // ViewController
	constructor(_graphModel, _pointsGeometry) {
		this.graphModel = _graphModel; // model

		// view
		this.pointsGeometry = _pointsGeometry;
		this.toggleVisibility = true;
	}

	// #region Colors

	colorNodes(colorFunction, nodeIds = null) {
		var thisController = this;
		this.graphModel.enumerateNodes(function(nodeData) {
			var hexColor = colorFunction(nodeData);
			thisController.colorNode(nodeData, hexColor);
		}, function() {
			thisController._refreshNodePaint();
		}, nodeIds);
	}

	gradientColorNodes(hexColor) {
		var nodeCount = this.graphModel.getNodeCount();
		var startColor = new THREE.Color(hexColor);
		var endColor = new THREE.Color(); // defaults to white
		var diffColor = new THREE.Color((endColor.r - startColor.r)/nodeCount,
										(endColor.g - startColor.g)/nodeCount,
										(endColor.b - startColor.b)/nodeCount);

		this.colorNodes(function(nodeData) {
			var i = nodeData.id;
			var nextR = startColor.r + (i * diffColor.r);
			var nextG = startColor.g + (i * diffColor.g);
			var nextB = startColor.b + (i * diffColor.b);
			var nextColor = new THREE.Color(nextR, nextG, nextB);
			return nextColor;
		});
	}

	colorNode(nodeData, hexColor = 0x000000) {
		const blockSize = 3;
		const offset = blockSize * nodeData.id;
		var color = new THREE.Color(hexColor);
		var rgb = [color.r, color.g, color.b];
		// TODO: remove this color setter after we add code to access colors for a node, directly from the color buffer.
		nodeData.color = color; 

		var colors = this.pointsGeometry.getAttribute('color').array;

		for (var j = 0; j < blockSize; j += 1) {
			var index = offset + j;
			colors[index] = rgb[index%3];
		}
	}

	_refreshNodePaint() {
		var colors = this.pointsGeometry.getAttribute('color').array;
		// TODO: can we avoid creating a new THREE.Float32BufferAttribute() here?
		this.pointsGeometry.addAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
		this.pointsGeometry.colorsNeedUpdate = true; // TODO: figure out why we need this call. Seems like we can do without it.
	}

	// #endregion

	// #region Visibility (via Position)

	toggleNodes() {
		if (this.toggleVisibility) {
			this.hideNodes();
			this.toggleVisibility = false;
		} else {
			this.showNodes();
			this.toggleVisibility = true;
		}
	}

	hideNodes() {
		var dis = this;
		this.graphModel.enumerateNodes(function(nodeData) { 
			dis.hideNode(nodeData);
		}, function() { 
			dis._refreshPointPostions();
		});
	}

	showNodes() {
		var dis = this;
		this.graphModel.enumerateNodes(function(nodeData) { 
			dis.showNode(nodeData);
		}, function() { 
			dis._refreshPointPostions() 
		});
	}

	revealNodeAfterTime(node, millisecs) {
		var dis = this;

		setTimeout(function() {
			dis.showNode(node.data);
			dis._refreshPointPostions();
		}, millisecs);

		return true;
	}

	showNode(nodeData) {
		var newPosition = [nodeData.x, nodeData.y, nodeData.z];
		this._updateNodePosition(nodeData.id, newPosition)
	}

	hideNode(nodeData) {
		var newPosition = [undefined, undefined, undefined];
		this._updateNodePosition(nodeData.id, newPosition)
	}

	// #endregion

	// #region Position


	_updateNodePosition(nodeId, newPosition) {
		var positions = this.pointsGeometry.getAttribute('position').array;
		const blockSize = 3;
		var offset = blockSize * nodeId;
		for (var j = 0; j < blockSize; j += 1) {
			var index = offset + j;
			positions[index] = newPosition[index % 3];
		}
	}

	_refreshPointPostions() {
		var positions = this.pointsGeometry.getAttribute('position').array;
		// TODO: can we avoid creating a new THREE.Float32BufferAttribute() here?
		this.pointsGeometry.addAttribute( 'position', new THREE.Float32BufferAttribute( positions, 3 ) );
	}

	// #endregion
}


class EdgeBundler {

	static drawBundledSpline(from, to) {
		var curve = null;
		if (to.z === from.z) {
			curve = EdgeBundler.drawStraightLink(from, to);
		} else {
			curve = EdgeBundler.drawBraidedLinks(from, to);
		}

		var points = EdgeBundler.fetchPointsOffCurve(curve);
		return points;
	}

	static drawBraidedLinks(from, to) {
		var controlPoints = EdgeBundler._computeLinkSplineControlPoints(from, to);
		var splineControlPoints = [];
		splineControlPoints.push(from);
		for (var i = 0; i < controlPoints.length; i += 1) {
			splineControlPoints.push(controlPoints[i]);
		}
		splineControlPoints.push(to);
		var curve = new THREE.CatmullRomCurve3(splineControlPoints);
		return curve;
	}

	static fetchPointsOffCurve(curve) {
		curve.curveType = "chordal";
		var points = curve.getPoints( pointCount - 1 );
		return points;
	}

	static drawStraightLink(from, to) {
		return new THREE.CatmullRomCurve3( [from, to] );
	}

	static get POINT_COUNT() {
		return 15;
	}

	static getDestinationCentroid(fromNodeId) {
		var fromNode = env.graph.getNode(fromNodeId);
		var links = env.graph.getLinks(fromNodeId);
		var centeroid = new THREE.Vector3(0, 0, 0);
		var count = 0;
		for (var i = 0; i < links.length; i += 1) {
			var link = links[i];
			if (link.fromId != fromNodeId) {
				continue;
			}

			var toNode = env.graph.getNode(link.toId);
			var toPos = nodePosition(toNode);
			centeroid.x += toPos.x;
			centeroid.y += toPos.y;
			centeroid.z += toPos.z;
			count += 1;
		}

		centeroid.x = centeroid.x / count;
		centeroid.y = centeroid.y / count;
		centeroid.z = centeroid.z / count;
		return centeroid;
	}

	static drawIntoSingleBraid(from, to) {
		var fromCenteroid;
		var fromPartite = Partite.getPartite(from);
		if (fromPartite != null) {
			fromCenteroid = fromPartite.getCenteroid();
			fromCenteroid.z = from.z + 25;
		} else {
			fromCenteroid = new THREE.Vector3(10, 10, from.z + 25);
		}

		var toCenteroid;
		var toPartite = Partite.getPartite(to);
		if (toPartite != null) {
			toCenteroid = toPartite.getCenteroid();
			toCenteroid.z = from.z + 100;
		} else {
			toCenteroid = new THREE.Vector3(10, 10, from.z + 100);
		}

		var yup2 = new THREE.Vector3(fromCenteroid.x, fromCenteroid.y, fromCenteroid.z);
		var yup3 = new THREE.Vector3(fromCenteroid.x, fromCenteroid.y, fromCenteroid.z + 1);
		var yup8 = new THREE.Vector3(toCenteroid.x, toCenteroid.y, toCenteroid.z);
		var yup9 = new THREE.Vector3(toCenteroid.x, toCenteroid.y, toCenteroid.z + 1);
		
		curve = new THREE.CatmullRomCurve3( [from, yup2, yup3, yup8, yup9, to] );
	}

	static _computeLinkSplineControlPoints(fromPos, toPos) {
		function computeGridPoints(maxBounds, minBounds) {
			var midBounds = new THREE.Vector2(
				(minBounds.x + maxBounds.x)/2, 
				(minBounds.y + maxBounds.y)/2);
			var dxBounds = maxBounds.x - minBounds.x;
			var dyBounds = maxBounds.y - minBounds.y;

			maxBounds.x = maxBounds.x - dxBounds/4;
			maxBounds.y = maxBounds.y - dyBounds/4;
			minBounds.x = minBounds.x + dxBounds/4;
			minBounds.y = minBounds.y + dyBounds/4;
			dxBounds = maxBounds.x - minBounds.x;
			dyBounds = maxBounds.y - minBounds.y;

			/*
				|---dx--|
				0---1---2 ---
				|	|	|  |
				3---4---5  dx
				|	|	|  |
				6---7---8 ---
			*/
			var gridPoints = [
				minBounds,
				new THREE.Vector2(minBounds.x + dxBounds/2, minBounds.y),
				new THREE.Vector2(minBounds.x + dxBounds, minBounds.y),
				new THREE.Vector2(minBounds.x, minBounds.y + dyBounds/2),
				midBounds,
				new THREE.Vector2(minBounds.x + dxBounds, minBounds.y + dyBounds/2),
				new THREE.Vector2(minBounds.x, minBounds.y + dyBounds),
				new THREE.Vector2(minBounds.x + dxBounds/2, minBounds.y + dyBounds),
				maxBounds,
			];

			return gridPoints;
		}

		function getClosestGridPoint(gridPoints, point) {
			var minDist = 0.0;
			var retGridPoint = ZERO;
			for (var i = 0; i < gridPoints.length; i += 1) {
				var dist = 
					((point.x - gridPoints[i].x) * (point.x - gridPoints[i].x))  
					+ ((point.y - gridPoints[i].y) * (point.y - gridPoints[i].y));

				if (i === 0) {
					minDist = dist;
					retGridPoint = gridPoints[i];
					continue;
				}

				if (minDist > dist) {
					minDist = dist;
					retGridPoint = gridPoints[i];
				}
			}

			return retGridPoint;
		}

		// need to cluster links, across partites
		var fromPartite = Partite.getPartite(fromPos);
		var toPartite = Partite.getPartite(toPos);

		var minBounds = new THREE.Vector2(
				Math.max(fromPartite.minBounds.x, toPartite.minBounds.x), 
				Math.max(fromPartite.minBounds.y, toPartite.minBounds.y));
		var maxBounds = new THREE.Vector2(
			Math.min(fromPartite.maxBounds.x, toPartite.maxBounds.x), 
			Math.min(fromPartite.maxBounds.y, toPartite.maxBounds.y));

		if ((minBounds.x > maxBounds.x) || (minBounds.y > maxBounds.y)) {
			minBounds.x = Math.min(fromPartite.minBounds.x, toPartite.minBounds.x);
			minBounds.y = Math.min(fromPartite.minBounds.y, toPartite.minBounds.y);

			maxBounds.x = Math.max(fromPartite.maxBounds.x, toPartite.maxBounds.x);
			maxBounds.y = Math.max(fromPartite.maxBounds.y, toPartite.maxBounds.y);
		}

		var grid = computeGridPoints(maxBounds, minBounds);
		var fromClosestGridPoint = getClosestGridPoint(grid, { x: fromPos.x, y: fromPos.y });
		var toClosestGridPoint = getClosestGridPoint(grid, { x: toPos.x, y: toPos.y });

		return [
			new THREE.Vector3(fromClosestGridPoint.x, fromClosestGridPoint.y, fromPos.z + 25),
			new THREE.Vector3(fromClosestGridPoint.x, fromClosestGridPoint.y, fromPos.z + 26),
			new THREE.Vector3(toClosestGridPoint.x, toClosestGridPoint.y, toPos.z - 25),
			new THREE.Vector3(toClosestGridPoint.x, toClosestGridPoint.y, toPos.z - 24)
		]
	}

}