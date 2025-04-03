document.addEventListener('DOMContentLoaded', function() {
    // State variables
    let connectionMode = false;
    let startShape = null;
    let startArrow = null;
    let tempLine = null;
    let connections = [];
    let selectedElement = null;

    // DOM elements
    const canvas = document.getElementById('flowchart-canvas');
    const connectBtn = document.getElementById('connect-btn');
    const deleteBtn = document.getElementById('delete-btn');
    const clearBtn = document.getElementById('clear-btn');
    const saveBtn = document.getElementById('save-btn');
    const loadBtn = document.getElementById('load-btn');
    const fileInput = document.getElementById('file-input');
    const exportBtn = document.getElementById('export-btn');
    const downloadLink = document.getElementById('download-image');

    // Initialize the app
    init();

    function init() {
        // Event listeners
        connectBtn.addEventListener('click', toggleConnectionMode);
        deleteBtn.addEventListener('click', deleteSelected);
        clearBtn.addEventListener('click', clearCanvas);
        saveBtn.addEventListener('click', saveFlowchart);
        loadBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', loadFlowchart);
        exportBtn.addEventListener('click', exportAsImage);
        
        // Add shape buttons
        document.querySelectorAll('.add-shape-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const shapeType = btn.dataset.shape;
                addShape(shapeType, 50, 50);
            });
        });

        // Canvas click handler
        canvas.addEventListener('click', (e) => {
            if (e.target === canvas) {
                clearSelection();
            }
        });
    }

    // Add a new shape to the canvas
    function addShape(shapeType, x, y) {
        const shape = document.createElement('div');
        shape.className = `shape ${shapeType}`;
        shape.id = `shape-${Date.now()}`;
        shape.style.left = `${x}px`;
        shape.style.top = `${y}px`;
        
        // Set default dimensions
        switch(shapeType) {
            case 'rectangle':
                shape.style.width = '100px';
                shape.style.height = '60px';
                break;
            case 'circle':
                shape.style.width = '80px';
                shape.style.height = '80px';
                break;
            case 'diamond':
                shape.style.width = '80px';
                shape.style.height = '80px';
                break;
            case 'parallelogram':
                shape.style.width = '100px';
                shape.style.height = '60px';
                break;
            case 'oval':
                shape.style.width = '100px';
                shape.style.height = '60px';
                break;
        }
        
        // Add label
        const label = document.createElement('div');
        label.className = 'shape-label';
        label.textContent = shapeType.charAt(0).toUpperCase() + shapeType.slice(1);
        shape.appendChild(label);
        
        // Add arrow buttons
        addArrowButtons(shape);
        
        // Make draggable
        makeDraggable(shape);
        
        // Add to canvas
        canvas.appendChild(shape);
        
        // Select the new shape
        selectElement(shape);
    }

    // Add arrow buttons to a shape
    function addArrowButtons(shape) {
        const positions = ['top', 'right', 'bottom', 'left'];
        
        positions.forEach(position => {
            const arrow = document.createElement('div');
            arrow.className = `shape-arrow ${position}`;
            arrow.dataset.position = position;
            
            // Set arrow icon based on position
            switch(position) {
                case 'top':
                    arrow.innerHTML = '<i class="bi bi-arrow-down"></i>';
                    break;
                case 'right':
                    arrow.innerHTML = '<i class="bi bi-arrow-right"></i>';
                    break;
                case 'bottom':
                    arrow.innerHTML = '<i class="bi bi-arrow-up"></i>';
                    break;
                case 'left':
                    arrow.innerHTML = '<i class="bi bi-arrow-left"></i>';
                    break;
            }
            
            arrow.addEventListener('click', startConnectionFromArrow);
            shape.appendChild(arrow);
        });
    }

    // Toggle connection mode
    function toggleConnectionMode() {
        connectionMode = !connectionMode;
        connectBtn.classList.toggle('active', connectionMode);
        canvas.classList.toggle('connection-mode', connectionMode);
        
        if (!connectionMode) {
            clearTempLine();
        }
    }

    // Start connection from an arrow button
    function startConnectionFromArrow(e) {
        if (!connectionMode) return;
        e.stopPropagation();
        
        startShape = this.parentElement;
        startArrow = this;
        
        // Highlight the starting arrow
        this.style.backgroundColor = '#dc3545';
        
        // Create a temporary line
        tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        tempLine.classList.add('connection-line');
        document.getElementById('connections-svg').appendChild(tempLine);
        
        // Update line position as mouse moves
        document.addEventListener('mousemove', drawTempLine);
        document.addEventListener('mouseup', endConnection);
    }

    // Draw temporary line during connection
    function drawTempLine(e) {
        if (!tempLine) return;
        
        const canvasRect = canvas.getBoundingClientRect();
        const startRect = startArrow.getBoundingClientRect();
        
        const startX = startRect.left + startRect.width/2 - canvasRect.left;
        const startY = startRect.top + startRect.height/2 - canvasRect.top;
        const endX = e.clientX - canvasRect.left;
        const endY = e.clientY - canvasRect.top;
        
        tempLine.setAttribute('x1', startX);
        tempLine.setAttribute('y1', startY);
        tempLine.setAttribute('x2', endX);
        tempLine.setAttribute('y2', endY);
    }

    // End the connection
    function endConnection(e) {
        if (!tempLine) return;
        
        document.removeEventListener('mousemove', drawTempLine);
        document.removeEventListener('mouseup', endConnection);
        
        const canvasRect = canvas.getBoundingClientRect();
        const endX = e.clientX - canvasRect.left;
        const endY = e.clientY - canvasRect.top;
        
        // Check if we're connecting to another shape
        const elementUnderMouse = document.elementFromPoint(e.clientX, e.clientY);
        if (elementUnderMouse && elementUnderMouse.classList.contains('shape') && elementUnderMouse !== startShape) {
            const endShape = elementUnderMouse;
            createConnection(startShape, startArrow, endShape);
        }
        
        // Reset starting arrow color
        if (startArrow) {
            startArrow.style.backgroundColor = '#0d6efd';
        }
        
        clearTempLine();
    }

    // Create a permanent connection between shapes
    function createConnection(startShape, startArrow, endShape) {
        const canvasRect = canvas.getBoundingClientRect();
        const startRect = startArrow.getBoundingClientRect();
        const endRect = endShape.getBoundingClientRect();
        
        const startX = startRect.left + startRect.width/2 - canvasRect.left;
        const startY = startRect.top + startRect.height/2 - canvasRect.top;
        const endX = endRect.left + endRect.width/2 - canvasRect.left;
        const endY = endRect.top + endRect.height/2 - canvasRect.top;
        
        // Create SVG line
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.classList.add('connection-line');
        line.setAttribute('x1', startX);
        line.setAttribute('y1', startY);
        line.setAttribute('x2', endX);
        line.setAttribute('y2', endY);
        
        // Add connection to SVG
        document.getElementById('connections-svg').appendChild(line);
        
        // Store connection data
        const connection = {
            id: Date.now(),
            startShape: startShape.id,
            endShape: endShape.id,
            startPosition: startArrow.dataset.position,
            element: line
        };
        
        connections.push(connection);
    }

    // Clear temporary line
    function clearTempLine() {
        if (tempLine && tempLine.parentNode) {
            tempLine.parentNode.removeChild(tempLine);
        }
        tempLine = null;
        startShape = null;
        startArrow = null;
    }

    // Make shapes draggable
    function makeDraggable(element) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        
        element.onmousedown = dragMouseDown;
        
        function dragMouseDown(e) {
            if (connectionMode) return;
            e = e || window.event;
            e.preventDefault();
            
            // Select the element
            selectElement(element);
            
            // Get the mouse cursor position at startup
            pos3 = e.clientX;
            pos4 = e.clientY;
            
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }
        
        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            
            // Calculate the new cursor position
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            
            // Set the element's new position
            element.style.top = (element.offsetTop - pos2) + "px";
            element.style.left = (element.offsetLeft - pos1) + "px";
            
            // Update connections
            updateConnectionsForShape(element);
        }
        
        function closeDragElement() {
            // Stop moving when mouse button is released
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    // Update connections for a shape when it moves
    function updateConnectionsForShape(shape) {
        connections.forEach(connection => {
            if (connection.startShape === shape.id || connection.endShape === shape.id) {
                const startShapeEl = document.getElementById(connection.startShape);
                const endShapeEl = document.getElementById(connection.endShape);
                
                if (!startShapeEl || !endShapeEl) {
                    // Remove invalid connection
                    if (connection.element.parentNode) {
                        connection.element.parentNode.removeChild(connection.element);
                    }
                    connections = connections.filter(c => c.id !== connection.id);
                    return;
                }
                
                const canvasRect = canvas.getBoundingClientRect();
                const startArrow = startShapeEl.querySelector(`.shape-arrow[data-position="${connection.startPosition}"]`);
                const startRect = startArrow.getBoundingClientRect();
                const endRect = endShapeEl.getBoundingClientRect();
                
                const startX = startRect.left + startRect.width/2 - canvasRect.left;
                const startY = startRect.top + startRect.height/2 - canvasRect.top;
                const endX = endRect.left + endRect.width/2 - canvasRect.left;
                const endY = endRect.top + endRect.height/2 - canvasRect.top;
                
                connection.element.setAttribute('x1', startX);
                connection.element.setAttribute('y1', startY);
                connection.element.setAttribute('x2', endX);
                connection.element.setAttribute('y2', endY);
            }
        });
    }

    // Select an element
    function selectElement(element) {
        clearSelection();
        
        selectedElement = element;
        element.classList.add('selected');
        
        // Show properties in the properties panel
        showProperties(element);
    }

    // Clear selection
    function clearSelection() {
        if (selectedElement) {
            selectedElement.classList.remove('selected');
            selectedElement = null;
        }
        hideProperties();
    }

    // Show properties in the properties panel
    function showProperties(element) {
        const propertiesForm = document.getElementById('properties-form');
        const noSelection = document.getElementById('no-selection');
        
        propertiesForm.classList.remove('d-none');
        noSelection.classList.add('d-none');
        
        // Set current values
        document.getElementById('element-label').value = 
            element.querySelector('.shape-label').textContent;
    }

    // Hide properties panel
    function hideProperties() {
        const propertiesForm = document.getElementById('properties-form');
        const noSelection = document.getElementById('no-selection');
        
        propertiesForm.classList.add('d-none');
        noSelection.classList.remove('d-none');
    }

    // Delete selected element
    function deleteSelected() {
        if (!selectedElement) return;
        
        // Remove connections involving this shape
        connections = connections.filter(connection => {
            if (connection.startShape === selectedElement.id || connection.endShape === selectedElement.id) {
                if (connection.element.parentNode) {
                    connection.element.parentNode.removeChild(connection.element);
                }
                return false;
            }
            return true;
        });
        
        // Remove the shape
        selectedElement.remove();
        selectedElement = null;
        hideProperties();
    }

    // Clear the canvas
    function clearCanvas() {
        if (!confirm('Are you sure you want to clear the canvas?')) return;
        
        // Remove all shapes
        document.querySelectorAll('#flowchart-canvas .shape').forEach(shape => {
            shape.remove();
        });
        
        // Remove all connections
        document.querySelectorAll('#connections-svg .connection-line').forEach(line => {
            line.remove();
        });
        
        connections = [];
        selectedElement = null;
        hideProperties();
    }

    // Save flowchart as JSON
    function saveFlowchart() {
        const shapes = [];
        const savedConnections = [];
        
        // Collect shape data
        document.querySelectorAll('#flowchart-canvas .shape').forEach(shape => {
            shapes.push({
                id: shape.id,
                type: Array.from(shape.classList).find(cls => cls !== 'shape' && cls !== 'selected'),
                x: parseInt(shape.style.left),
                y: parseInt(shape.style.top),
                width: parseInt(shape.style.width),
                height: parseInt(shape.style.height),
                label: shape.querySelector('.shape-label').textContent
            });
        });
        
        // Collect connection data
        connections.forEach(connection => {
            savedConnections.push({
                startShape: connection.startShape,
                endShape: connection.endShape,
                startPosition: connection.startPosition
            });
        });
        
        // Create JSON data
        const data = {
            shapes: shapes,
            connections: savedConnections
        };
        
        // Create download link
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        const url = URL.createObjectURL(dataBlob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'flowchart.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Load flowchart from JSON
    function loadFlowchart() {
        const file = fileInput.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                
                // Clear existing canvas
                clearCanvas();
                
                // Create shapes
                data.shapes.forEach(shapeData => {
                    const shape = document.createElement('div');
                    shape.className = `shape ${shapeData.type}`;
                    shape.id = shapeData.id;
                    shape.style.left = `${shapeData.x}px`;
                    shape.style.top = `${shapeData.y}px`;
                    shape.style.width = `${shapeData.width}px`;
                    shape.style.height = `${shapeData.height}px`;
                    
                    // Add label
                    const label = document.createElement('div');
                    label.className = 'shape-label';
                    label.textContent = shapeData.label;
                    shape.appendChild(label);
                    
                    // Add arrow buttons
                    addArrowButtons(shape);
                    
                    // Make draggable
                    makeDraggable(shape);
                    
                    // Add to canvas
                    canvas.appendChild(shape);
                });
                
                // Create connections
                data.connections.forEach(connData => {
                    const startShape = document.getElementById(connData.startShape);
                    const endShape = document.getElementById(connData.endShape);
                    
                    if (startShape && endShape) {
                        const startArrow = startShape.querySelector(`.shape-arrow[data-position="${connData.startPosition}"]`);
                        createConnection(startShape, startArrow, endShape);
                    }
                });
                
            } catch (error) {
                alert('Error loading flowchart: ' + error.message);
            }
        };
        reader.readAsText(file);
    }

    // Export as image
    function exportAsImage() {
        html2canvas(canvas).then(canvas => {
            downloadLink.href = canvas.toDataURL('image/png');
            downloadLink.click();
        });
    }
});