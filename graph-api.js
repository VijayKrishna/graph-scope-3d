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
        if (partites) {
            if (this.verify("togglePartiteEdges")) {
                this.visualGraph.togglePartiteEdges();
            }
        } else {
            if (this.verify("toggleEdges")) {
                this.visualGraph.toggleEdges();
            }
        }
        
    }

    toggleNodes() {
        if (!this.verify("toggleNodes")) {
            return;
        }

        this.visualGraph.toggleNodes();
    }

    colorAllEdges(colorFunction) {
        if (!this.verify("enumerateLinks")
            || !this.verify("colorLink")) {
            return;
        }

        var thisVisualGraph = this.visualGraph;
        thisVisualGraph.enumerateLinks(function(link) {
            const hexColor = colorFunction(link);
            thisVisualGraph.colorLink(link, hexColor);
        });
    }

    /*
    nodeSubset: list of nodes ids (integer list); comes from a JSON data file
    colorFunction: (integer => {}) colors the nodes; 
        Mode1: function will color nodes with primary and secondary colors
        Mode2: function will auto-gen a color gradient, and distribute the nodeSubset across the color gradient
        Mode3a: heatmap, showing time lapse
    */
    colorAllNodes(colorFunction, nodeIds) {
        if (!this.verify("enumerateNodes")
            || !this.verify("colorNode")) {
            return;
        }

        var thisVisualGraph = this.visualGraph;
        thisVisualGraph.enumerateNodes(function(node) {
            const hexColor = colorFunction(node);
            thisVisualGraph.colorNode(node, hexColor);
        }, nodeIds);
    }

    changeOpacityForNodes(opacityFunction, nodeIds) {
        if (!this.verify("enumerateNodes")
            || !this.verify("changeNodeOpacity")) {
            return;
        }

        var thisVisualGraph = this.visualGraph;
        thisVisualGraph.enumerateNodes(function(node) {
            const opacity = opacityFunction(node);
            thisVisualGraph.changeNodeOpacity(node, opacity);
        }, nodeIds);
    }

    setClickNodeCallback(callback) {
        this.visualGraph.setNodeCallback(callback);
    }

    diagnostics_getNode(nodeid) {
        return this.visualGraph.diagnostics_getNode(nodeid);
    }

    resizeAllNodes(nodeSubset, sizeFunction) {
        // TODO
    }

    // TODO: support for free from search of nodes
};