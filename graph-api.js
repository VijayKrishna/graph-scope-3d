// nodes, edges, background
// color
// visibility - nodes and edges
// indentifying/enumerate nodes, edges
class GraphApi {

    constructor(visualGraph) {
        this.visualGraph = visualGraph;
    }

    verify(propertyName = null) {
        if (this.visualGraph != null) {
            return true;
        }

        if (propertyName != null && this.visualGraph.hasOwnProperty(propertyName)) {
            return true;
        }

        return false;
    }

    colorBackground(color) {
        if (!this.verify("bkgColor")) {
            return;
        }

        this.visualGraph.bkgColor(color);
    }

    toggleEdges(partites = false) {
        var linksController = this.visualGraph.getLinksController();
        if (partites) {
            linksController.togglePartiteLinks();
            // if (this.verify("togglePartiteEdges")) {
            //     this.visualGraph.togglePartiteEdges();
            // }
        } else {
            linksController.toggleLinks();
        }
        
    }

    toggleNodes() {
        var pointsController = this.visualGraph.getPointsController();
        pointsController.toggleNodes();
    }

    colorAllEdges(colorFunction) {
        var linksController = this.visualGraph.getLinksController();
        linksController.colorLinks(colorFunction);
    }

    /*
    nodeSubset: list of nodes ids (integer list); comes from a JSON data file
    colorFunction: (integer => {}) colors the nodes; 
        Mode1: function will color nodes with primary and secondary colors
        Mode2: function will auto-gen a color gradient, and distribute the nodeSubset across the color gradient
        Mode3a: heatmap, showing time lapse
    */
    colorAllNodes(colorFunction, nodeIds = null) {
        var pointsController = this.visualGraph.getPointsController();
        pointsController.colorNodes(colorFunction, nodeIds);
    }

    changeOpacityForNodes(opacityFunction, nodeIds) {
        var pointsController = this.visualGraph.getPointsController();
        pointsController.changeNodeAlphas(opacityFunction, nodeIds);
    }

    resizeNodes(sizeFunction, nodeIds) {
        var pointsController = this.visualGraph.getPointsController();
        pointsController.resizeNodes(sizeFunction, nodeIds);
    }

    setClickNodeCallback(callback) {
        this.visualGraph.setNodeCallback(callback);
    }

    /**
     *
     *
     * @param {Number} nodeid
     * @returns
     * @memberof GraphApi
     */
    diagnostics_getNode(nodeId) {
        var graphModel = this.visualGraph.getGraphModel();
        return graphModel.getNodeData(nodeId);
    }

    /**
     *
     *
     * @param {Number} nodeid
     * @returns
     * @memberof GraphApi
     */
    diagnostics_getNeighboringNodes(nodeId) {
        var graphModel = this.visualGraph.getGraphModel();
        return graphModel.getNeighboringNodes(nodeId);
    }

    clearOverlays() {
        // todo: use overlays class
        this.visualGraph.clearOverlays();
    }

    resizeAllNodes(nodeSubset, sizeFunction) {
        // TODO
    }

    flow(hexColor = 0x000000) {
        var pointsController = this.visualGraph.getPointsController();
        var linksController = this.visualGraph.getLinksController();

		pointsController.gradientColorNodes(hexColor);
		linksController.gradientColorLinks();
    }

    timeLapse() {
        var timeLapseController = this.visualGraph.getTimelapseController();
        timeLapseController.timeLapse();
    }

    // TODO: support for free from search of nodes
};