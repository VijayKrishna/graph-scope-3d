// nodes, edges, background
// color
// visibility - nodes and edges
// indentifying/enumerate nodes, edges
class GraphApi {

    constructor(visualGraph) {
        this.visualGraph = visualGraph;
    }

    foo() {
        console.log("doing something");
        if (this.visualGraph) {
            this.visualGraph.foo();
        }
    }

    // Real API methods

    colorBackground(color) {

    }

    hideEdges() {

    }

    showEdges() {

    }

    colorAllEdges(color) {

    }

    /*
    nodeSubset: list of nodes ids (integer list); comes from a JSON data file
    colorFunction: (integer => {}) colors the nodes; 
        Mode1: function will color nodes with primary and secondary colors
        Mode2: function will auto-gen a color gradient, and distribute the nodeSubset across the color gradient
        Mode3a: heatmap, showing time lapse
    */
    colorAllNodes(nodeSubset, colorFunction) {
        // if (this.visualGraph === null) {
        //     return;
        // }

        // nodeSubset.forEach(nodeId => {
        //     var node = this.visualGraph.getNode(nodeId);
        //     colorFunction(node);
        // });
    }

    resizeAllNodes(nodeSubset, sizeFunction) {

    }

    // TODO: support for free from search of nodes
};