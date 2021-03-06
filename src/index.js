import { render, createRef, Component } from 'inferno';
import nanoid from 'nanoid';

import './index.css';

class Node {
    constructor(car, cdr) {
        this.car = car;
        this.cdr = cdr;
        this.id = nanoid();
    }
}

const cloneNode = (node, allNodes) => {
    if (node == null) {
        return null;
    } else if (!(node instanceof Node)) {
        return node;
    }

    const newNode = new Node(cloneNode(node.car, allNodes), cloneNode(node.cdr, allNodes));
    allNodes.push(newNode);
    return newNode;
};

const deleteNode = (node, allNodes) => {
    if (!(node instanceof Node)) {
        return;
    }

    const ind = allNodes.findIndex((anode) => anode.id === node.id);
    allNodes.splice(ind, 1);

    deleteNode(node.car, allNodes);
    deleteNode(node.cdr, allNodes);
}
                
const renderTextAsCons = (node, depth) => {
    if (node == null) {
        return 'empty';
    }

    return `(cons <span data-car-id="${node.id}">${
        (node.car instanceof Node) ?
        renderTextAsCons(node.car, depth+1) :
        (node.car == null ? '""' : (/^\d+$|^'[\S]+$/.test(node.car) ? node.car : `"${node.car}"`))
    }</span>${
        (node.cdr == null) ? ' ' : ('\n' + ' '.repeat(6*depth))
    }<span data-cdr-id="${(node.cdr != null) ? node.cdr.id : (node.id + '-empty')}">${
        renderTextAsCons(node.cdr, depth+1)
    }</span>)`;
};

const renderTextAsList = (node, depth, builder, first = false) => {
    if (node == null) {
        return '';
    }

    builder.push((
        (node.car instanceof Node) ?
            `${
                first ? '' : '\n' + ' '.repeat(6*depth)
            }<span data-car-id="${node.id}">(list ${
                renderTextAsList(node.car, depth+1, [], true).join(' ').replace(/\s+<\//g, '</')
            })</span>
${' '.repeat(6*depth-1)}` :
            `<span data-car-id="${node.id}">${
                (node.car == null ? '""' : (/^\d+$|^'[\S]+$/.test(node.car) ? node.car : `"${node.car}"`))
            }</span>`
    ) + `<span data-cdr-id="${(node.cdr != null) ? node.cdr.id : (node.id + '-empty')}">`);

    renderTextAsList(node.cdr, depth, builder);

    builder.push('</span>');

    return builder;
}

const renderTextAsQuot = (node, depth, builder, first = false) => {
    if (node == null) {
        return '';
    }

    builder.push((
        (node.car instanceof Node) ?
            `${
                first ? '' : '\n' + ' '.repeat(2*depth)
            }<span data-car-id="${node.id}">(${
                renderTextAsQuot(node.car, depth+1, [], true).join(' ').replace(/\s+<\//g, '</')
            })</span>
${' '.repeat(2*depth-1)}` :
            `<span data-car-id="${node.id}">${
                (node.car == null ? 
                    '""' : 
                    (/^\d+$/.test(node.car) ? 
                        node.car : 
                        (/^'[\S]+$/.test(node.car) ?
                            node.car.slice(1) :
                            `"${node.car}"`)))
            }</span>`
    ) + `<span data-cdr-id="${(node.cdr != null) ? node.cdr.id : (node.id + '-empty')}">`);

    renderTextAsQuot(node.cdr, depth, builder);

    builder.push('</span>');

    return builder;
}

function NullPtr() {
    return (
        <div className="null-ptr">
            <svg width="20" height="20">
                <line x1="0" y1="0" x2="20" y2="20" />
                <line x1="0" y1="20" x2="20" y2="0" />
            </svg>
        </div>
    );
}

function DownwardsArrow() {
    return (
        <div className="downwards-arrow">
            <svg width="30" height="7">
                <path d="m10 0l5 7l5-7l-5 3z" fill="black" />
            </svg>
        </div>
    );
}

function RightwardsArrow() {
    return (
        <div className="rightwards-arrow">
            <svg width="7" height="20">
                <path d="m0 5l7 5l-7 5l3-5z" fill="black" />
            </svg>
        </div>
    );
}

class ChangeableText extends Component {
    constructor(props) {
        super(props);
        this.state = { editable: false };

        this.checkCancelOrConfirm = this.checkCancelOrConfirm.bind(this);
        this.cancel = this.cancel.bind(this);
        this.edit = this.edit.bind(this);
    }

    componentDidMount() {
        if (this.props.thing == null) {
            this.setState({ editable: true });
        }
    }

    checkCancelOrConfirm(e) {
        if (e.code == 'Enter') {
            this.props.change(e.target.value);
            this.cancel();
        } else if (e.code == 'Escape') {
            this.cancel();
        }
    }

    cancel() {
        this.setState({ editable: false });
    }

    edit(e) {
        e.stopPropagation();
        this.setState({ editable: true });
    }

    renderInner() {
        if (this.state.editable) {
            return <input ref={it => it && (it.focus() || it.select()) }
                          type="text" onKeyDown={(e => this.checkCancelOrConfirm(e))}
                          onFocusOut={this.cancel} defaultValue={this.props.thing} />;
        } else {
            return <span >{this.props.thing}</span>;
        }
    }

    render() {
        return (<div className="changeable-text" onDblClick={this.edit}>
            {this.renderInner()}
        </div>);
    }
}

class Boxy extends Component {
    constructor(props) {
        super(props);

        this.changeCar = this.changeCar.bind(this);
        this.addNewNode = this.addNewNode.bind(this);
        this.condRenderCar = this.condRenderCar.bind(this);
        this.condRenderCdr = this.condRenderCdr.bind(this);
        this.mouseOverCar = this.mouseOver.bind(this, true);
        this.mouseOverCdr = this.mouseOver.bind(this, false);
        this.mouseOut = this.mouseOut.bind(this);
    }

    changeCar(car) {
        const node = this.props.node;
        node.car = (car !== undefined) ? car : node.car;
        this.props.updateNode(node);
    }

    addNewNode(e) {
        e.stopPropagation();

        if (this.props.node.cdr == null) {
            this.props.addNewNode(this.props.node.id);
        }
    }

    condRenderCar(car) {
        if (car instanceof Node) {
            return;
        } else {
            return <ChangeableText thing={car} change={this.changeCar} />;
        }
    }

    condRenderCdr(cdr) {
        if (cdr instanceof Node) {
            return <RightwardsArrow />;
        } else {
            return <NullPtr />;
        }
    }

    mouseOver(isCar, e) {
        if (!document.querySelector('.app-wrapper').classList.contains('dragging-app')) {
            if (isCar) {
                Array.from(document.querySelectorAll(`[data-car-id="${this.props.node.id}"]`))
                    .map(a => { a.classList.add('output-highlighted') });
            } else {
                const next = this.props.node.cdr;
                if (next != null) {
                    Array.from(document.querySelectorAll(`[data-node-id="${next.id}"]`))
                        .map(a => { a.classList.add('view-outlined') });
                    Array.from(document.querySelectorAll(`[data-cdr-id="${next.id}"]`))
                        .map(a => { a.classList.add('output-outlined') });
                } else {
                    Array.from(document.querySelectorAll(`[data-cdr-id="${this.props.node.id}-empty"]`))
                        .map(a => { a.classList.add('output-highlighted') });
                }
            }
        }
    }

    mouseOut(e) {
        Array.from(document.querySelectorAll('.output-highlighted'))
            .map(a => { a.classList.remove('output-highlighted') });
        Array.from(document.querySelectorAll('.output-outlined'))
            .map(a => { a.classList.remove('output-outlined') });
        Array.from(document.querySelectorAll('.view-outlined'))
            .map(a => { a.classList.remove('view-outlined') });
    }

    render() {
        const node = this.props.node;

        return (
            <div className="boxy-wrapper" data-node-id={node.id}>
                <div className="boxy">
                    <div className="boxy-car"
                        onMouseOver={this.mouseOverCar} 
                        onMouseOut={this.mouseOut}>{this.condRenderCar(node.car)}</div>
                    <div className="boxy-cdr"
                        onMouseOver={this.mouseOverCdr} 
                        onMouseOut={this.mouseOut}
                        onDblClick={this.addNewNode}>{this.condRenderCdr(node.cdr)}</div>
                    {(node.car instanceof Node) && <DownwardsArrow />}
                    {(node.cdr instanceof Node) && <Boxy 
                        node={node.cdr} 
                        updateNode={this.props.updateNode}
                        addNewNode={this.props.addNewNode} />}
                </div>
                {(node.car instanceof Node) && <Boxy 
                    node={node.car} 
                    updateNode={this.props.updateNode}
                    addNewNode={this.props.addNewNode} />}
            </div>
        );
    }
}

class App extends Component {
    constructor(props) {
        super(props);

        this.state = {
            nodes: props.nodes || [],
            allNodes: props.allNodes || [],
            draggingId: null,
            draggingEl: null,
            draggingNode: null,
            dragging: false,
            renderMode: 'cons',
            resizing: false,
            outputHeight: 300
        };

        this.addNewNode = this.addNewNode.bind(this);
        this.getNodeFromId = this.getNodeFromId.bind(this);
        this.getNodeIndex = this.getNodeIndex.bind(this);
        this.updateNode = this.updateNode.bind(this);
        this.deleteNode = this.deleteNode.bind(this);
        this.changeTextRenderMode = this.changeTextRenderMode.bind(this);
        this.renderText = this.renderText.bind(this);
        this.startDragging = this.startDragging.bind(this);
        this.isDragging = this.isDragging.bind(this);
        this.stopDragging = this.stopDragging.bind(this);
        this.mouseMove = this.mouseMove.bind(this);
        this.mouseOut = this.mouseOut.bind(this);
    }

    componentDidMount() {
        window.addEventListener('mousedown', (e) => {
            if (e.target && e.target.classList.contains('app-resize-handle') && e.buttons === 1) {
                this.setState({ resizing: true });
            }
        });
        window.addEventListener('mousemove', (e) => {
            if (this.state.resizing) {
                this.setState({
                    outputHeight: Math.max(120, 
                        Math.min(window.innerHeight - e.clientY - 15, window.innerHeight - 100))
                });
            }
        });
        window.addEventListener('mouseup', (e) => {
            this.setState({ resizing: false });
        });
    }

    addNewNode(prevId = undefined) {
        const { nodes, allNodes } = this.state,
              newNode = new Node(null, null);

        allNodes.push(newNode);
        
        if (prevId === undefined) {
            nodes.push(allNodes.length - 1);
        } else {
            let node = this.getNodeFromId(prevId);
            node.cdr = newNode;
            this.updateNode(node);
        }

        this.setState({ nodes, allNodes });
    }

    getNodeFromId(id) {
        return this.state.allNodes.find((node) => node.id === id);
    }

    getNodeIndex(node) {
        return this.state.allNodes.findIndex((anode) => anode.id === node.id);
    }

    updateNode(node) {
        let allNodes = this.state.allNodes;

        allNodes[this.getNodeIndex(node)] = node;

        this.setState({ allNodes });
    }

    deleteNode(node) {
        let { nodes, allNodes } = this.state,
            prevNode = this.state.allNodes
                .filter((anode) => anode.cdr != null && anode.cdr.id === node.id),
            parentNode = this.state.allNodes
                .filter((anode) => anode.car instanceof Node && anode.car.id === node.id);

        if (confirm("Are you sure you want to delete this node?")) {
            const oldNodes = nodes.map((node) => allNodes[node]);

            deleteNode(node, allNodes);
            
            nodes = oldNodes.filter((anode) => anode.id !== node.id)
                .map((node) => this.getNodeIndex(node));
            
            if (prevNode.length) {
                prevNode[0].cdr = null;
            }

            if (parentNode.length) {
                parentNode[0].car = null;
            }

            this.setState({ nodes, allNodes });
        }
    }

    changeTextRenderMode(e) {
        this.setState({
            renderMode: e.target.value
        });
    }

    renderText() {
        switch (this.state.renderMode) {
        case 'cons': return this.state.nodes.map((node) =>
            renderTextAsCons(this.state.allNodes[node], 1)
        ).join('\n\n');
        case 'list': return this.state.nodes.map((node) =>
            `(list <span data-car-id="${this.state.allNodes[node].id}">${
                renderTextAsList(this.state.allNodes[node], 1, [], true).join(' ').replace(/\s+<\//g, '</')
            }</span>)`
        ).join('\n\n');
        case 'quot': return this.state.nodes.map((node) =>
            `'(<span data-car-id="${this.state.allNodes[node].id}">${
                renderTextAsQuot(this.state.allNodes[node], 1, [], true).join(' ').replace(/\s+<\//g, '</')
            }</span>)`
        ).join('\n\n');
        }
    }

    startDragging(e) {
        if (e.buttons === 1 && e.target.closest('.boxy-wrapper')) {
            this.setState({
                mouseX: e.clientX,
                mouseY: e.clientY,
                draggingId: e.target.closest('.boxy-wrapper').dataset.nodeId
            });
        }   
    }

    isDragging(e) {
        if (this.state.dragging && this.state.draggingEl && e.buttons === 1) {
            this.state.draggingEl.style.left = `${e.clientX - this.state.offsetX}px`;
            this.state.draggingEl.style.top = `${e.clientY - this.state.offsetY}px`;

            Array.from(document.querySelectorAll('.drag-active'))
                .map(a => { a.classList.remove('drag-active') });

            if (document.elementFromPoint(e.clientX, e.clientY).closest('.view-controls')) {
                document.elementFromPoint(e.clientX, e.clientY).classList.add('drag-active');
            }
        } else if (this.state.draggingId && e.buttons === 1) {
            if (Math.abs(this.state.mouseX - e.clientX) > 5 ||
                Math.abs(this.state.mouseY - e.clientY) > 5) {
                const draggingEl = document.querySelector(`[data-node-id="${this.state.draggingId}"]`),
                      offsetX = -10, //this.state.mouseX - draggingEl.getBoundingClientRect().left,
                      offsetY = this.state.mouseY - draggingEl.getBoundingClientRect().top;

                draggingEl.classList.add('dragging');
                draggingEl.style.left = `${e.clientX - offsetX}px`;
                draggingEl.style.top = `${e.clientY - offsetY}px`;

                this.setState((prevState) => ({
                    mouseX: null,
                    mouseY: null,
                    offsetX,
                    offsetY,
                    draggingEl,
                    draggingNode: this.getNodeFromId(prevState.draggingId),
                    dragging: true
                }));
            }
        }
    }

    stopDragging(e) {
        const { draggingEl } = this.state;

        if (draggingEl) {
            const auxElements = [ 'add-to-nodes', 'dup-node', 'delete-node' ],
                  mouseOverEl = document.elementFromPoint(e.clientX, e.clientY); 

            if (mouseOverEl.closest('.boxy-car, .boxy-cdr')) {
                const mouseOverBoxy = mouseOverEl.closest('.boxy-car, .boxy-cdr'),
                      isCdr = mouseOverBoxy.classList.contains('boxy-cdr'),
                      nodeDropId = mouseOverBoxy.closest('.boxy-wrapper').dataset.nodeId,
                      prevNode = this.state.allNodes.filter((node) =>
                          node.cdr && node.cdr.id === this.state.draggingId
                      ),
                      parentNode = this.state.allNodes.filter((node) =>
                          node.car instanceof Node && node.car.id === this.state.draggingId
                      );

                let nodeDrop = this.getNodeFromId(nodeDropId),
                    { nodes, allNodes } = this.state;

                if (prevNode.length) {
                    prevNode[0].cdr = null;
                }

                if (parentNode.length) {
                    parentNode[0].car = null;
                }

                if (isCdr) {
                    if (nodeDrop.cdr instanceof Node) {
                        nodes.push(this.getNodeIndex(nodeDrop.cdr));
                    }

                    nodeDrop.cdr = this.state.draggingNode;
                } else {
                    if (nodeDrop.car instanceof Node) {
                        nodes.push(this.getNodeIndex(nodeDrop.car));
                    } else if (nodeDrop.car != null) {
                        const newNode = new Node(nodeDrop.car, null);

                        allNodes.push(newNode);

                        nodes.push(allNodes.length - 1);
                    }

                    nodeDrop.car = this.state.draggingNode;
                }

                {
                    let ind = this.getNodeIndex(this.state.draggingNode);

                    nodes = nodes.filter((nodeInd) => nodeInd !== ind);
                }

                this.setState({
                    nodes,
                    allNodes
                });
            } else {
                const targets = auxElements.filter((sel) => mouseOverEl.className.includes(sel));
                if (targets.length) {
                    switch (targets[0]) {
                    case 'add-to-nodes': {
                        if (!this.state.nodes.includes(this.getNodeIndex(this.state.draggingNode))) {
                            const prevNode = this.state.allNodes.filter((node) =>
                                      node.cdr && node.cdr.id === this.state.draggingId
                                  ),
                                  parentNode = this.state.allNodes.filter((node) =>
                                      node.car instanceof Node && node.car.id === this.state.draggingId
                                  );

                            let { nodes } = this.state;

                            if (prevNode.length) {
                                prevNode[0].cdr = null;
                            }

                            if (parentNode.length) {
                                parentNode[0].car = null;
                            }

                            nodes.push(this.getNodeIndex(this.state.draggingNode));

                            this.setState({ nodes });

                            break;
                        }
                    }
                    case 'dup-node': {
                        let { nodes, allNodes } = this.state;

                        cloneNode(this.state.draggingNode, allNodes);

                        nodes.push(allNodes.length - 1);

                        this.setState({ nodes, allNodes });

                        break;
                    }
                    case 'delete-node': {
                        this.deleteNode(this.state.draggingNode);

                        break;
                    }
                    }
                }
            }

            draggingEl.classList.remove('dragging');
            draggingEl.style.top = null;
            draggingEl.style.left = null;
        }

        if (this.state.dragging) {
            this.setState({
                draggingId: null,
                draggingEl: null,
                draggingNode: null,
                dragging: false
            });
        }
    }

    mouseMove(e) {
        e.stopPropagation();

        Array.from(document.querySelectorAll('.view-highlighted'))
            .map(a => { a.classList.remove('view-highlighted') });
        Array.from(document.querySelectorAll('.view-outlined'))
            .map(a => { a.classList.remove('view-outlined') });
        Array.from(document.querySelectorAll('.output-highlighted'))
            .map(a => { a.classList.remove('output-highlighted') });
        Array.from(document.querySelectorAll('.output-outlined'))
            .map(a => { a.classList.remove('output-outlined') });

        if (e.target.tagName === "SPAN") {
            const target = e.target;
            if (target.dataset.carId) {
                Array.from(document.querySelectorAll(`[data-node-id="${target.dataset.carId}"] > .boxy > .boxy-car`))
                    .map(a => { a.classList.add('view-highlighted') });
                target.classList.add('output-highlighted');
            } else if (target.dataset.cdrId) {
                let selector = `[data-node-id="${target.dataset.cdrId}"]`;

                if (/-empty/.test(target.dataset.cdrId)) {
                    selector = selector.replace('-empty', '') + ' > .boxy > .boxy-cdr';
                    Array.from(document.querySelectorAll(selector))
                        .map(a => { a.classList.add('view-highlighted') });
                    target.classList.add('output-highlighted');
                } else {
                    Array.from(document.querySelectorAll(selector))
                        .map(a => { a.classList.add('view-outlined') });
                    target.classList.add('output-outlined');
                }
            }
        }
    }

    mouseOut() {
        Array.from(document.querySelectorAll('.view-highlighted'))
            .map(a => { a.classList.remove('view-highlighted') });
        Array.from(document.querySelectorAll('.view-outlined'))
            .map(a => { a.classList.remove('view-outlined') });
        Array.from(document.querySelectorAll('.output-highlighted'))
            .map(a => { a.classList.remove('output-highlighted') });
        Array.from(document.querySelectorAll('.output-outlined'))
            .map(a => { a.classList.remove('output-outlined') });
    }

    render() {
        return (<div className={[
            'app-wrapper',
            this.state.dragging ? 'dragging-app' : '',
            this.state.resizing ? 'resizing-app' : ''
        ].join(' ')}
            onMouseDown={this.startDragging} onMouseMove={this.isDragging} onMouseUp={this.stopDragging}>
            <div className="app-view" onDblClick={((e) => { this.addNewNode() })}
                style={{ height: `${window.innerHeight - this.state.outputHeight - 20}px` }}>
                {this.state.nodes.map(node => 
                    <Boxy node={this.state.allNodes[node]}
                        updateNode={this.updateNode} 
                        addNewNode={this.addNewNode} />
                )}
            </div>
            <div className="app-output-window" style={{ height: `${this.state.outputHeight}px` }}>
                <div className="app-resize-handle"></div>
                <div className="app-output">
                    <div className="view-controls">
                        <em class="add-to-nodes">Make separate list</em><br/>
                        <em class="dup-node">Duplicate list</em><br />
                        <em class="delete-node">Delete list</em>
                    </div>
                    <select onChange={this.changeTextRenderMode}>
                        {[ 'cons', 'list', 'quot' ].map((option) => 
                            <option value={option} checked={this.state.renderMode === option}>({option} ...)</option>
                        )}
                    </select>
                    <pre onMouseMove={this.mouseMove}
                        onMouseOut={this.mouseOut}
                        dangerouslySetInnerHTML={{ __html: this.renderText() }}></pre>
                </div>
            </div>
        </div>);
    }
}

const node1 = new Node("A", null),
      node2 = new Node("B", node1),
      node3 = new Node("C", node2),
      node4 = new Node("D", null),
      node5 = new Node(node3, node4),
      node6 = new Node("E", node5),
      node7 = new Node("F", null),
      node8 = new Node("G", node7),
      node9 = new Node(node8, node6),
      nodes = [8],
      allNodes = [node1, node2, node3, node4, node5, node6, node7, node8, node9];


render(<App nodes={nodes} allNodes={allNodes} />, document.querySelector('main'));
