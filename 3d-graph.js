var ZERO = new THREE.Vector2(0, 0);

function assert(condition = true, message = "Unknown Assert") {
	if (typeof(condition) != "boolean") {
		throw "Can use assert only with boolean values";
	}

	if (!condition) {
		throw message;
	}
}

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

function Graph3D() {

	const CAMERA_DISTANCE2NODES_FACTOR = 150;

	const env = { // Holds component state
		initialised: false,
		onFrame: () => {},
		bkgColor: 0x111111,
		edgeColor: 0xFF00FF,
		graph: null,
		lineMaterial: null,
		edgesVisible: true,
		nodesVisible: true
	};

	function printCamPos() {
		console.log(env.camera);
	}

	function registerNodesWithRaycaster() {
		if (env.graph != null) {
			var spheres = [];
			env.graph.forEachNode(node => {
				spheres.push(node.data.sphere);
			});

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

		for (var i = 0; i < intersects.length; i += 1) {
			var object = intersects[0].object;
			if (!object.hasOwnProperty("nodeId") || !object.hasOwnProperty("name"))
				continue;
			
			if (object.nodeId >= 0) {
				const node = env.graph.getNode(object.nodeId);
				if (chart._clickNodeCallback != null) {
					chart._clickNodeCallback(node.data.id);
				}
				break;
			}
		}
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
		env.camera.far = 25000;
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
			env.toolTipElem.innerHTML = (intersects != null && intersects.length) ? intersects[0].object.name || '' : '';
			

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

		// console.log('graph from 3d-force-graph', graph);

		// Add WebGL objects
		graph.forEachNode(node => {
			const nodeMaterial = new THREE.MeshBasicMaterial({ color: env.colorAccessor(node.data)/* || 0xffffaa*/, transparent: false });
			nodeMaterial.opacity = 1.0;

			const sphere = new THREE.Mesh(
				new THREE.SphereGeometry(2.5),
				nodeMaterial
			);

			sphere.nodeId = node.data.id;
			sphere.name = node.data.label;
			sphere.position.x = node.data.x;
			sphere.position.y = node.data.y;
			sphere.position.z = node.data.z;

			env.scene.add(node.data.sphere = sphere);
		});

		drawEdges(graph);

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

	function getDestinationCentroid(fromNodeId) {
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
			var toPos = toNode.data.sphere.position;
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

	function computeLinkSplineControlPoints(link) {
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
		var fromNode = env.graph.getNode(link.fromId);
		var toNode = env.graph.getNode(link.toId);
		var fromPos = fromNode.data.sphere.position;
		var toPos = toNode.data.sphere.position;
		var fromPartite = Partite.getPartite(fromPos);
		var toPartite = Partite.getPartite(toPos);

		var minBounds = new THREE.Vector2(
				Math.max(fromPartite.minBounds.x, toPartite.minBounds.x), 
				Math.max(fromPartite.minBounds.y, toPartite.minBounds.y));
		var maxBounds = new THREE.Vector2(
			Math.min(fromPartite.maxBounds.x, toPartite.maxBounds.x), 
			Math.min(fromPartite.maxBounds.y, toPartite.maxBounds.y));

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

	function drawEdges(graph, spline = true, partiteEdgeKind = 2) {
		env.lineMaterial = new THREE.LineBasicMaterial({
			color: env.edgeColor,
			transparent: true,
			linewidth: 1,
			opacity: 0.2
		});

		chart.computePartites();

		graph.forEachLink(link => {
			var geometry;
			var fromNode = env.graph.getNode(link.fromId);
			var toNode = env.graph.getNode(link.toId);

			if (spline) {
				var from = new THREE.Vector3( 
					fromNode.data.sphere.position.x, 
					fromNode.data.sphere.position.y, 
					fromNode.data.sphere.position.z );

				var to = new THREE.Vector3( 
					toNode.data.sphere.position.x, 
					toNode.data.sphere.position.y, 
					toNode.data.sphere.position.z );

				var dx = (to.x - from.x);
				var dy = (to.y - from.y);
				var dz = (to.z - from.z);

				var curve = null;
				if (from.z != to.z) {
					switch (partiteEdgeKind) {
						case 0:
						{
							var fromCenteroid;
							var fromPartite = Partite.getPartite(from);
							if (fromPartite != null) {
								fromCenteroid = fromPartite.getCenteroid();
								fromCenteroid.z = from.z + 25;
							} else {
								fromCenteroid = new THREE.Vector3(10, 10, from.z + 25);
							}

							var toCenteroid = getDestinationCentroid(link.fromId);
							if (toCenteroid === null) {
								toCenteroid = new THREE.Vector3(10, 10, from.z + 120);
							} else {
								toCenteroid.z = from.z + 130;
							}

							var yup2 = new THREE.Vector3(fromCenteroid.x, fromCenteroid.y, from.z + 25);
							var yup3 = new THREE.Vector3(fromCenteroid.x, fromCenteroid.y, from.z + 26);
							var yup6 = new THREE.Vector3(toCenteroid.x, toCenteroid.y, from.z + 75);
							var yup7 = new THREE.Vector3(toCenteroid.x, toCenteroid.y, from.z + 76);
							var yup8 = new THREE.Vector3(toCenteroid.x, toCenteroid.y, from.z + 100);
							var yup9 = new THREE.Vector3(toCenteroid.x, toCenteroid.y, from.z + 101);
							
							curve = new THREE.CatmullRomCurve3( [from, yup2, yup3, yup6, yup7, yup8, yup9, to] );
						} break;
						case 1:
						{
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
						} break;
						case 2:
						{
							var controlPoints = computeLinkSplineControlPoints(link);
							var splineControlPoints = [];
							splineControlPoints.push(from);
							for (var i = 0; i < controlPoints.length; i += 1) {
								splineControlPoints.push(controlPoints[i]);
							}
							splineControlPoints.push(to);
							curve = new THREE.CatmullRomCurve3(splineControlPoints);
						} break;
						default:
						{
							curve = new THREE.CatmullRomCurve3( [from, to] );
						}
					}
				} else {
					curve = new THREE.CatmullRomCurve3( [from, to] );
				}

				curve.curveType = "chordal";

				var pointCount = 51;
				var points = curve.getPoints( pointCount - 1 );
				var positions = [];
				for (var i = 0; i < points.length; i += 1) {
					var p = points[i];
					positions.push(p.x);
					positions.push(p.y);
					positions.push(p.z);
				}

				geometry = new THREE.BufferGeometry();
				var bufferedPositions = new THREE.Float32BufferAttribute( positions, 3 );
				geometry.addAttribute( 'position',  bufferedPositions);

			} else {
				geometry = new THREE.Geometry();
				geometry.vertices.push(
					new THREE.Vector3( fromNode.x, fromNode.y, fromNode.z ),
					new THREE.Vector3( toNode.x, toNode.y, toNode.z )
				);				
			}

			var newMaterial = new THREE.LineBasicMaterial({
				color: 0x4066E5,
				// vertexColors: true,
				transparent: true,
				linewidth: 1,
				opacity: 0.1
			});

			var line = new THREE.Line( geometry, newMaterial );
			env.scene.add( link.data.line = line );


		});
	}

	// Component constructor
	function chart(chartHostDivElement) {
		env.domNode = chartHostDivElement;

		initStatic();
		digest();

		return chart;
	}

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
					return env[prop] 
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

	chart.resetState(); // Set defaults at instantiation

	chart.bkgColor = function(hexColor) {
		env.bkgColor = hexColor;
		env.renderer.setClearColor(env.bkgColor, 1);
	}

	chart.nodeColor = function(hexColor) {
		// env.edgeColor = hexColor;
		env.graph.forEachNode(node => {
			node.data.sphere.material.setValues({
				color: hexColor,
				transparent: false
			});
		});
	}

	chart.colorNode = function(nodeData, hexColor = 0x000000) {
		const material = nodeData.sphere.material;
		material.setValues({
			color: hexColor,
			transparent: false
		});
	}

	chart.changeNodeOpacity = function(nodeData, opacity = 1) {
		const material = nodeData.sphere.material;
		material.setValues({
			opacity: opacity,
			transparent: false
		});
	}

	chart.enumerateNodes = function(callOnNode, nodeIds = null) {
		if (nodeIds === null) {
			env.graph.forEachNode(node => {
				callOnNode(node.data);
			});
			return;
		}

		nodeIds.forEach(function(id) {
			const node = env.graph.getNode(id);
			callOnNode(node.data);
		});
	}

	chart.colorLink = function(linkData, hexColor = 0x000000) {
		env.edgeColor = hexColor;
		const material = linkData.line.material;
		linkData.line.material  = new THREE.LineBasicMaterial({
			vertexColors: false,
			color: hexColor,
			transparent: material.transparent,
			linewidth: material.linewidth,
			opacity: material.opacity,
			visible: true
		});
	}

	chart._revealNodeAfterTime = function(node, millisecs) {
		var nodeMaterial = node.data.sphere.material;
		var isVisible = nodeMaterial.visible;
		if (isVisible) {
			return false;
		}

		setTimeout(function() {
			nodeMaterial.setValues({
				visible: true,
			});
		}, millisecs);

		return true;
	}

	chart._revealLinkAfterTime = function(link, millisecs) {
		var lineMaterial = link.data.line.material;
		var isVisible = lineMaterial.visible;
		if (isVisible) {
			return false;
		}

		setTimeout(function() {
			lineMaterial.setValues({
				visible: true,
			});
		}, millisecs);

		return true;
	}

	chart.timedShow = function() {
		var thisChart = this;
		this.setVisibilityForEdges(false);
		this.setVisibilityForNodes(false);
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
			var nodeRevealed = thisChart._revealNodeAfterTime(node, i);
			if(nodeRevealed) {
				i = i + timeslice;
			} 

			var revealedAnything = false;
			var links = env.graph.getLinks(node.id);

			for (var l = 0; l < links.length; l += 1) {
				var link = links[l];

				if (link.fromId != node.id) {
					continue;
				}

				var linkRevealed = thisChart._revealLinkAfterTime(link, i);
				if (linkRevealed) {
					i += timeslice;
				}

				var to = env.graph.getNode(link.toId);

				console.log("going from " + node.id + " to " + to.id);

				if (to === node)
					continue;

				if (visitedNodes.indexOf(to.id) === -1) { // plan on visiting only if you have not visited it before
					stack.push(to);
				}
					
				var anotherNodeRevealed = thisChart._revealNodeAfterTime(to, i);
				if (anotherNodeRevealed) {
					i += timeslice;
				}
			}

			visitedNodes.push(node.id);
		}
	}

	chart.enumerateLinks = function(callOnLink) {
		env.graph.forEachLink(link => {
			callOnLink(link.data);
		});
	}

	chart.toggleEdges = function() {
		var isVisible = env.edgesVisible;
		chart.setVisibilityForEdges(!isVisible);
	}

	chart.setVisibilityForEdges = function(isVisible) {
		env.edgesVisible = isVisible;
		env.graph.forEachLink(link => {
			link.data.line.material.setValues({
				visible: isVisible,
			});
		});
	}

	chart.toggleNodes = function() {
		var isVisible = env.nodesVisible;
		env.nodesVisible = !isVisible;
		env.graph.forEachNode(node => {
			node.data.sphere.material.setValues({
				visible: env.nodesVisible,
			});
		});
	}

	chart.setVisibilityForNodes = function(isVisible) {
		env.edgesVisible = isVisible;
		env.graph.forEachNode(node => {
			node.data.sphere.material.setValues({
				visible: isVisible,
			});
		});
	}

	chart.flow = function(hexColor) {
		var nodeCount = env.graphData.nodeCount;
		var startColor = new THREE.Color(hexColor);
		var endColor = new THREE.Color(); // defaults to white
		var diffColor = new THREE.Color((endColor.r - startColor.r)/nodeCount,
										(endColor.g - startColor.g)/nodeCount,
										(endColor.b - startColor.b)/nodeCount);

		var i = 0;
		env.graph.forEachNode(node => {
			var nextR = startColor.r + (i * diffColor.r);
			var nextG = startColor.g + (i * diffColor.g);
			var nextB = startColor.b + (i * diffColor.b);
			var nextColor = new THREE.Color(nextR, nextG, nextB);

			node.data.sphere.material.setValues({
				color: nextColor,
				transparent: false
			});

			i += 1;
		});

		env.graph.forEachLink(link => {
			var fromNode = env.graph.getNode(link.fromId);
			var toNode = env.graph.getNode(link.toId);

			var fromColor = fromNode.data.sphere.material.color;
			var fromOpacity = fromNode.data.sphere.material.opacity;
			var toColor = toNode.data.sphere.material.color;

			var colors = [];
			var fromColor = fromNode.data.sphere.material.color;
			var toColor = toNode.data.sphere.material.color;
			var stepColor = {
				r: (toColor.r - fromColor.r)/51,
				g: (toColor.g - fromColor.g)/51,
				b: (toColor.b - fromColor.b)/51
			};

			var colors = [];
			for (var i = 0; i < 51; i += 1) {
				colors.push(fromColor.r + (i * stepColor.r));
				colors.push(fromColor.g + (i * stepColor.g));
				colors.push(fromColor.b + (i * stepColor.b));
			}

			var line = link.data.line;
			var newMaterial = new THREE.LineBasicMaterial({
				// color: fromColor.getHex(),
				transparent: true,
				linewidth: 1,
				opacity: 0.1,
				vertexColors: true,
				// needsUpdate: true
			});

			link.data.line.material = newMaterial;

			var lineGeometry = line.geometry;
			lineGeometry.addAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
			lineGeometry.colorsNeedUpdate = true
		});
	}

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
			var x = node.data.sphere.position.x;
			var y = node.data.sphere.position.y;
			var z = node.data.sphere.position.z;
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

	chart.togglePartiteEdges = function() {
		var isVisible = env.edgesVisible;
		env.edgesVisible = !isVisible;

		env.graph.forEachLink(link => {
			var fromNode = env.graph.getNode(link.fromId);
			var toNode = env.graph.getNode(link.toId);

			var fromZ = fromNode.data.sphere.position.z;
			var toZ = toNode.data.sphere.position.z;

			if (fromZ != toZ) {
				var material = link.data.line.material;
				link.data.line.material = new THREE.LineBasicMaterial({
					vertexColors: false,
					color: material.color,
					transparent: material.transparent,
					linewidth: material.linewidth,
					opacity: material.opacity,
					visible: env.edgesVisible
				});
			} else {
				var material = link.data.line.material;
				link.data.line.material = new THREE.LineBasicMaterial({
					vertexColors: false,
					color: material.color,
					transparent: material.transparent,
					linewidth: material.linewidth,
					opacity: material.opacity,
					visible: true
				});
			}
		});
	}


	chart._clickNodeCallback = null;
	chart.setNodeCallback = function(clickNodeCallback) {
		chart._clickNodeCallback = clickNodeCallback;
	}

	chart.diagnostics_getNode = function(nodeid) {
		var node = env.graph.getNode(nodeid);
		return node.data;
	}

	chart.diagnostics_getNeighboringNodes = function(nodeid) {
		var links = env.graph.getLinks(nodeid);
		var incomingIds = [];
		var outgoingIds = [];

		for (var i = 0; i < links.length; i += 1) {
			var link = links[i];
			if (link.fromId === nodeid) {
				outgoingIds.push(link.toId);
			}

			if (link.toId === nodeid) {
				incomingIds.push(link.fromId);
			}
		}

		return {
			incoming : incomingIds,
			outgoing : outgoingIds
		}
	}

	return chart;
}