function ForceGraph3D() {

	const CAMERA_DISTANCE2NODES_FACTOR = 150;

	const env = { // Holds component state
		initialised: false,
		onFrame: () => {},
		bkgColor: 0x111111
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

		var material = new THREE.LineBasicMaterial({
			// color: 0x115511,
			color: 0xffff00,
			transparent: true,
			linewidth: 1,
			opacity: 0.2
		});

		var redmaterial = new THREE.LineBasicMaterial({
			color: 0xff0000,
			transparent: true,
			linewidth: 3,
			opacity: 0.5
		});

		var spline = true;

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

			var line = new THREE.Line( geometry, material );
			env.scene.add( link.data.line = line );
		});

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

	return chart;
}
