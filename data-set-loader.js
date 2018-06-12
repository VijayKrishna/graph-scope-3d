function getGraphDataSets() {

    // Color brewer paired set
    const colors = ['#a6cee3','#1f78b4','#b2df8a','#33a02c','#fb9a99','#e31a1c','#fdbf6f','#ff7f00','#cab2d6','#6a3d9a','#ffff99','#b15928'];

    class DataParams {
        constructor(json, desc, color) {
          this.json = json;
          this.desc = desc;
          this.color = color;
        }
    }

    const p = [
        new DataParams("data/one-k.json", "<em>Balanced 3D Force Directed Graph</em> data", 0x000000)
        , new DataParams("data/one-l.json", "<em>Test</em> data", 0xffffff)
        , new DataParams("data/one-m.json", "<em>Skinny 3D Force Directed Graph</em> data", 0x009970)
        , new DataParams("data/one-n.json", "<em>Stacked, 2D Skinny Force Directed Graphs</em> data", 0xffffff)
        , new DataParams("data/one-o.json", "<em>Stacked, 2D Balanced Force Directed Graphs</em> data", 0x111111)
    ];

    const dataFuntion = function(params) {
        const data = function(Graph) {
            qwest.get(params.json).then((_, data) => {
                const nodes = {};
    
                // add an id property and
                // Index by name
                data.nodes.forEach((node, i) => { 
                    console.log(node);
                    node.id = i;//node.id;
    
                    node.groupLabel =  node.label;
                    node.group = 1; // Number(node.group.split(' ')[1]) || 0;
                    nodes[node.id] = node;
                });
    
                console.log('data from loadGroups', data);
                console.log('nodes from loadGroups', nodes);
    
                Graph
                    .resetState()
                    .colorAccessor(node => parseInt(colors[node.colorGroup%colors.length].slice(1),16))
                    .graphData({
                        nodes: nodes,
                        links: data.links.map(link => [link.startId-1, link.endId-1])
                    })
                    .bkgColor(params.color);
            });
        };
        data.description = params.desc;
        return data;
    }

    return [dataFuntion(p[4]), dataFuntion(p[3]), dataFuntion(p[2])];
}