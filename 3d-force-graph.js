function ForceGraph3D() {

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

	function updateBackgroundColor(color) {
		env.renderer.setClearColor(color, 1);
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

		// Setup camera
		env.camera = new THREE.PerspectiveCamera();
		env.camera.far = 30000;
		env.camera.position.z = 1000;

		// Setup scene
		env.scene = new THREE.Scene();
		// env.scene.background = new THREE.Color( 0xff0000 );

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
			const intersects = env.raycaster.intersectObjects(env.scene.children);
			env.toolTipElem.innerHTML = intersects.length ? intersects[0].object.name || '' : '';

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

			sphere.name = node.data.label;
			sphere.position.x = node.data.x;
			sphere.position.y = node.data.y;
			sphere.position.z = node.data.z;

			env.scene.add(node.data.sphere = sphere);
		});

		env.lineMaterial = new THREE.LineBasicMaterial({
			color: env.edgeColor,
			transparent: true,
			linewidth: 1,
			opacity: 0.2
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

	function drawEdges(graph, spline = true) {

		graph.forEachLink(link => {
			var geometry;
			var fromNode = env.graphData.nodes[link.fromId];
			var toNode = env.graphData.nodes[link.toId];

			if (spline) {
				var dx = (toNode.x - fromNode.x);
				var dy = (toNode.y - fromNode.y);
				var dz = (toNode.z - fromNode.z);

				var from = new THREE.Vector3( fromNode.x, fromNode.y, fromNode.z );
				var contorl = new THREE.Vector3(fromNode.x + (dx * 0.25), fromNode.y + (dy * 0.9), fromNode.z + (dz * 0.5) );
				var to = new THREE.Vector3( toNode.x, toNode.y, toNode.z );

				var curve = new THREE.CatmullRomCurve3( [from, contorl, to] );
				// curve.curveType = "chordal";

				var points = curve.getPoints( 50 );
				geometry = new THREE.BufferGeometry().setFromPoints( points );
			} else {
				geometry = new THREE.Geometry();
				geometry.vertices.push(
					new THREE.Vector3( fromNode.x, fromNode.y, fromNode.z ),
					new THREE.Vector3( toNode.x, toNode.y, toNode.z )
				);				
			}

			var line = new THREE.Line( geometry, env.lineMaterial );
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

	chart.edgeColor = function(hexColor) {
		env.edgeColor = hexColor;
		env.graph.forEachLink(link => {
			link.data.line.material.setValues({
				opacity: 0.1,
				transparent: true,
				color: env.edgeColor
			});
		});
	}


	chart.toggleEdges = function() {
		var isVisible = env.edgesVisible;
		env.edgesVisible = !isVisible;
		env.graph.forEachLink(link => {
			link.data.line.material.setValues({
				visible: env.edgesVisible,
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
			for (var i = 0; i < 25; i += 1) {
				colors.push(fromColor.r);
				colors.push(fromColor.g);
				colors.push(fromColor.b);
			}
			for (var i = 0; i < 25; i += 1) {
				colors.push(toColor.r);
				colors.push(toColor.g);
				colors.push(toColor.b);
			}

			var line = link.data.line;
			var newMaterial = new THREE.LineBasicMaterial({
				// vertexColors: THREE.VertexColors,
				color: fromColor.getHex(),
				transparent: true,
				linewidth: 1,
				opacity: fromOpacity/6,
				// needsUpdate: true
			});

			link.data.line.material = newMaterial;

			var lineGeometry = line.geometry;
			lineGeometry.addAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
			lineGeometry.colorsNeedUpdate = true


		});
	}

	return chart;
}
