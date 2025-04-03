document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const canvas = document.getElementById('flowchart-canvas');
    const connectionsSvg = document.getElementById('connections-svg');
    const addShapeBtns = document.querySelectorAll('.add-shape-btn');
    const connectBtn = document.getElementById('connect-btn');
    const deleteBtn = document.getElementById('delete-btn');
    const clearBtn = document.getElementById('clear-btn');
    const saveBtn = document.getElementById('save-btn');
    const loadBtn = document.getElementById('load-btn');
    const fileInput = document.getElementById('file-input');
    const exportBtn = document.getElementById('export-btn');
    const downloadLink = document.getElementById('download-image');
    const propertiesForm = document.getElementById('properties-form');
    const noSelection = document.getElementById('no-selection');
    const elementLabel = document.getElementById('element-label');
    const elementColor = document.getElementById('element-color');
    const elementBorderColor = document.getElementById('element-border-color');
    const connectionText = document.getElementById('connection-text');

    // State variables
    let selectedElement = null;
    let connectionMode = false;
    let connectionStart = null;
    let shapes = [];
    let connections = [];
    let tempLine = null;

    // Initialize the app
    init();

    function init() {
        setupEventListeners();
        loadFromLocalStorage();
    }

    function setupEventListeners() {
        // Add shape buttons
        addShapeBtns.forEach(btn => {
            btn.addEventListener('click', () => addShape(btn.dataset.shape));
        });

        // Connection mode toggle
        connectBtn.addEventListener('click', toggleConnectionMode);

        // Delete button
        deleteBtn.addEventListener('click', deleteSelected);

        // Clear button
        clearBtn.addEventListener('click', clearCanvas);

        // Save/Load buttons
        saveBtn.addEventListener('click', saveToJson);
        loadBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', loadFromJson);

        // Export button
        exportBtn.addEventListener('click', exportAsImage);

        // Property changes
        elementLabel.addEventListener('input', updateSelectedElement);
        elementColor.addEventListener('input', updateSelectedElement);
        elementBorderColor.addEventListener('input', updateSelectedElement);
        connectionText.addEventListener('input', updateSelectedElement);

        // Canvas click handler
        canvas.addEventListener('click', (e) => {
            if (e.target === canvas) {
                clearSelection();
            }
        });
    }

    // Shape functions
    function addShape(shapeType) {
        const shapeId = 'shape-' + Date.now();
        const shape = document.createElement('div');
        shape.className = `shape ${shapeType}`;
        shape.id = shapeId;
        shape.innerHTML = `
            <div class="shape-label">${shapeType.charAt(0).toUpperCase() + shapeType.slice(1)}</div>
            <div class="shape-arrow top" data-side="top"><i class="bi bi-arrow-up"></i></div>
            <div class="shape-arrow right" data-side="right"><i class="bi bi-arrow-right"></i></div>
            <div class="shape-arrow bottom" data-side="bottom"><i class="bi bi-arrow-down"></i></div>
            <div class="shape-arrow left" data-side="left"><i class="bi bi-arrow-left"></i></div>
        `;

        // Set default size based on shape type
        let width, height;
        switch(shapeType) {
            case 'circle':
                width = height = 80;
                break;
            case 'diamond':
                width = height = 80;
                break;
            case 'parallelogram':
                width = 100;
                height = 60;
                break;
            case 'oval':
                width = 100;
                height = 60;
                break;
            default: // rectangle
                width = 100;
                height = 60;
        }

        // Position at center of canvas
        const canvasRect = canvas.getBoundingClientRect();
        const left = (canvasRect.width - width) / 2;
        const top = (canvasRect.height - height) / 2;

        Object.assign(shape.style, {
            width: `${width}px`,
            height: `${height}px`,
            left: `${left}px`,
            top: `${top}px`,
            backgroundColor: elementColor.value,
            borderColor: elementBorderColor.value
        });

        // Add drag functionality
        makeDraggable(shape);

        // Add click handler for selection
        shape.addEventListener('click', (e) => {
            if (e.target.classList.contains('shape-arrow')) return;
            selectElement(shape);
            e.stopPropagation();
        });

        // Add arrow click handlers
        const arrows = shape.querySelectorAll('.shape-arrow');
        arrows.forEach(arrow => {
            arrow.addEventListener('click', (e) => {
                if (!connectionMode) return;
                
                if (!connectionStart) {
                    // Starting a new connection
                    connectionStart = {
                        element: shape,
                        side: arrow.dataset.side
                    };
                    arrow.style.backgroundColor = '#198754';
                } else {
                    // Completing a connection
                    if (connectionStart.element === shape) {
                        // Can't connect to self
                        resetConnectionMode();
                        return;
                    }
                    
                    createConnection(
                        connectionStart.element, 
                        connectionStart.side, 
                        shape, 
                        arrow.dataset.side
                    );
                    resetConnectionMode();
                }
                
                e.stopPropagation();
            });
        });

        canvas.appendChild(shape);
        shapes.push(shape);
        selectElement(shape);
    }

    function makeDraggable(element) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        
        element.onmousedown = dragMouseDown;
        
        function dragMouseDown(e) {
            if (e.target.classList.contains('shape-arrow')) return;
            
            e = e || window.event;
            e.preventDefault();
            
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
            const newTop = element.offsetTop - pos2;
            const newLeft = element.offsetLeft - pos1;
            
            element.style.top = newTop + 'px';
            element.style.left = newLeft + 'px';
            
            // Update any connections
            updateConnectionsForElement(element);
        }
        
        function closeDragElement() {
            // Stop moving when mouse button is released
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    // Connection functions
    function toggleConnectionMode() {
        connectionMode = !connectionMode;
        connectBtn.classList.toggle('active', connectionMode);
        
        if (connectionMode) {
            // Show all arrows
            document.querySelectorAll('.shape-arrow').forEach(arrow => {
                arrow.style.display = 'flex';
            });
        } else {
            resetConnectionMode();
        }
    }

    function resetConnectionMode() {
        connectionStart = null;
        connectionMode = false;
        connectBtn.classList.remove('active');
        
        // Hide all arrows and reset colors
        document.querySelectorAll('.shape-arrow').forEach(arrow => {
            arrow.style.display = 'none';
            arrow.style.backgroundColor = '#0d6efd';
        });
    }

    function createConnection(fromElement, fromSide, toElement, toSide) {
        const connectionId = 'conn-' + Date.now();
        
        // Create SVG path
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.id = connectionId;
        path.classList.add('connection-line');
        
        // Add text element for connection label
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.classList.add('connection-text');
        text.setAttribute('dy', -5);
        text.setAttribute('data-connection', connectionId);
        
        connectionsSvg.appendChild(path);
        connectionsSvg.appendChild(text);
        
        const connection = {
            id: connectionId,
            from: fromElement.id,
            fromSide,
            to: toElement.id,
            toSide,
            text: ''
        };
        
        connections.push(connection);
        updateConnection(connection);
        selectConnection(connection);
    }

    function updateConnection(connection) {
        const fromElement = document.getElementById(connection.from);
        const toElement = document.getElementById(connection.to);
        
        if (!fromElement || !toElement) return;
        
        const fromRect = fromElement.getBoundingClientRect();
        const toRect = toElement.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        
        // Calculate positions relative to canvas
        const from = {
            x: fromRect.left - canvasRect.left + fromRect.width / 2,
            y: fromRect.top - canvasRect.top + fromRect.height / 2
        };
        
        const to = {
            x: toRect.left - canvasRect.left + toRect.width / 2,
            y: toRect.top - canvasRect.top + toRect.height / 2
        };
        
        // Adjust based on connection sides
        switch(connection.fromSide) {
            case 'top':
                from.y = fromRect.top - canvasRect.top;
                break;
            case 'right':
                from.x = fromRect.right - canvasRect.left;
                break;
            case 'bottom':
                from.y = fromRect.bottom - canvasRect.top;
                break;
            case 'left':
                from.x = fromRect.left - canvasRect.left;
                break;
        }
        
        switch(connection.toSide) {
            case 'top':
                to.y = toRect.top - canvasRect.top;
                break;
            case 'right':
                to.x = toRect.right - canvasRect.left;
                break;
            case 'bottom':
                to.y = toRect.bottom - canvasRect.top;
                break;
            case 'left':
                to.x = toRect.left - canvasRect.left;
                break;
        }
        
        // Create a curved path
        const path = document.getElementById(connection.id);
        const text = document.querySelector(`text[data-connection="${connection.id}"]`);
        
        if (!path) return;
        
        // Calculate control points for a curved line
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Adjust control points based on direction to make nicer curves
        let cp1x, cp1y, cp2x, cp2y;
        
        if (Math.abs(dx) > Math.abs(dy)) {
            // More horizontal than vertical
            cp1x = from.x + dx * 0.5;
            cp1y = from.y;
            cp2x = from.x + dx * 0.5;
            cp2y = to.y;
        } else {
            // More vertical than horizontal
            cp1x = from.x;
            cp1y = from.y + dy * 0.5;
            cp2x = to.x;
            cp2y = from.y + dy * 0.5;
        }
        
        path.setAttribute('d', `M${from.x},${from.y} C${cp1x},${cp1y} ${cp2x},${cp2y} ${to.x},${to.y}`);
        
        // Position text at midpoint
        if (text) {
            const midX = (from.x + cp1x + cp2x + to.x) / 4;
            const midY = (from.y + cp1y + cp2y + to.y) / 4;
            text.setAttribute('x', midX);
            text.setAttribute('y', midY);
            text.textContent = connection.text || '';
        }
    }

    function updateConnectionsForElement(element) {
        connections.forEach(conn => {
            if (conn.from === element.id || conn.to === element.id) {
                updateConnection(conn);
            }
        });
    }

    // Selection functions
    function selectElement(element) {
        // Deselect current selection
        if (selectedElement) {
            if (selectedElement instanceof HTMLElement) {
                selectedElement.classList.remove('selected');
            } else {
                const path = document.getElementById(selectedElement.id);
                if (path) path.style.stroke = '#495057';
            }
        }
        
        // Select new element
        selectedElement = element;
        element.classList.add('selected');
        
        // Show properties
        propertiesForm.classList.remove('d-none');
        noSelection.classList.add('d-none');
        connectionText.parentElement.classList.add('d-none');
        
        // Set property values
        elementLabel.value = element.querySelector('.shape-label').textContent;
        elementColor.value = rgbToHex(element.style.backgroundColor) || '#e9ecef';
        elementBorderColor.value = rgbToHex(element.style.borderColor) || '#6c757d';
    }

    function selectConnection(connection) {
        // Deselect current selection
        if (selectedElement) {
            if (selectedElement instanceof HTMLElement) {
                selectedElement.classList.remove('selected');
            } else {
                const path = document.getElementById(selectedElement.id);
                if (path) path.style.stroke = '#495057';
            }
            selectedElement = null;
        }
        
        // Highlight connection
        const path = document.getElementById(connection.id);
        if (path) {
            path.style.stroke = '#0d6efd';
        }
        
        // Show properties
        propertiesForm.classList.remove('d-none');
        noSelection.classList.add('d-none');
        connectionText.parentElement.classList.remove('d-none');
        
        // Set property values
        connectionText.value = connection.text || '';
        selectedElement = connection;
    }

    function updateSelectedElement() {
        if (!selectedElement) return;
        
        if (selectedElement instanceof HTMLElement) {
            // Update shape properties
            selectedElement.querySelector('.shape-label').textContent = elementLabel.value;
            selectedElement.style.backgroundColor = elementColor.value;
            selectedElement.style.borderColor = elementBorderColor.value;
        } else {
            // Update connection properties
            const connection = connections.find(c => c.id === selectedElement.id);
            if (connection) {
                connection.text = connectionText.value;
                
                const text = document.querySelector(`text[data-connection="${connection.id}"]`);
                if (text) {
                    text.textContent = connection.text;
                } else {
                    // Create text element if it doesn't exist
                    const newText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                    newText.classList.add('connection-text');
                    newText.setAttribute('data-connection', connection.id);
                    newText.setAttribute('dy', -5);
                    newText.textContent = connection.text;
                    connectionsSvg.appendChild(newText);
                    
                    // Update connection to position the text
                    updateConnection(connection);
                }
            }
        }
    }

    // Helper functions
    function rgbToHex(rgb) {
        if (!rgb) return '#000000';
        
        // Convert rgb(r, g, b) to #rrggbb
        const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
        if (!match) return rgb;
        
        const hex = (x) => {
            const hex = parseInt(x).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        
        return '#' + hex(match[1]) + hex(match[2]) + hex(match[3]);
    }

    function clearSelection() {
        if (selectedElement) {
            if (selectedElement instanceof HTMLElement) {
                selectedElement.classList.remove('selected');
            } else {
                const path = document.getElementById(selectedElement.id);
                if (path) path.style.stroke = '#495057';
            }
            selectedElement = null;
        }
        
        propertiesForm.classList.add('d-none');
        noSelection.classList.remove('d-none');
    }

    // Delete functions
    function deleteSelected() {
        if (!selectedElement) return;
        
        if (selectedElement instanceof HTMLElement) {
            // Delete shape and its connections
            const shapeId = selectedElement.id;
            
            // Remove connections involving this shape
            connections = connections.filter(conn => {
                if (conn.from === shapeId || conn.to === shapeId) {
                    const path = document.getElementById(conn.id);
                    if (path) path.remove();
                    
                    const text = document.querySelector(`text[data-connection="${conn.id}"]`);
                    if (text) text.remove();
                    
                    return false;
                }
                return true;
            });
            
            // Remove shape
            selectedElement.remove();
            shapes = shapes.filter(shape => shape.id !== shapeId);
        } else {
            // Delete connection
            const path = document.getElementById(selectedElement.id);
            if (path) path.remove();
            
            const text = document.querySelector(`text[data-connection="${selectedElement.id}"]`);
            if (text) text.remove();
            
            connections = connections.filter(conn => conn.id !== selectedElement.id);
        }
        
        selectedElement = null;
        propertiesForm.classList.add('d-none');
        noSelection.classList.remove('d-none');
    }

    function clearCanvas() {
        if (!confirm('Are you sure you want to clear the canvas?')) return;
        
        // Remove all shapes
        shapes.forEach(shape => shape.remove());
        shapes = [];
        
        // Remove all connections
        connections.forEach(conn => {
            const path = document.getElementById(conn.id);
            if (path) path.remove();
            
            const text = document.querySelector(`text[data-connection="${conn.id}"]`);
            if (text) text.remove();
        });
        connections = [];
        
        selectedElement = null;
        propertiesForm.classList.add('d-none');
        noSelection.classList.remove('d-none');
    }

    // Save/Load functions
    function saveToJson() {
        const data = {
            shapes: shapes.map(shape => ({
                id: shape.id,
                type: Array.from(shape.classList).find(cls => cls !== 'shape' && cls !== 'selected'),
                label: shape.querySelector('.shape-label').textContent,
                left: shape.style.left,
                top: shape.style.top,
                width: shape.style.width,
                height: shape.style.height,
                backgroundColor: shape.style.backgroundColor,
                borderColor: shape.style.borderColor
            })),
            connections: connections.map(conn => ({
                id: conn.id,
                from: conn.from,
                fromSide: conn.fromSide,
                to: conn.to,
                toSide: conn.toSide,
                text: conn.text
            }))
        };
        
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'flowchart.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Also save to localStorage
        localStorage.setItem('flowchartData', json);
    }

    function loadFromJson() {
        const file = fileInput.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                loadData(data);
            } catch (err) {
                alert('Error loading file: ' + err.message);
            }
        };
        reader.readAsText(file);
    }

    function loadFromLocalStorage() {
        const data = localStorage.getItem('flowchartData');
        if (data) {
            try {
                loadData(JSON.parse(data));
            } catch (err) {
                console.error('Error loading from localStorage:', err);
            }
        }
    }

    function loadData(data) {
        // Clear existing elements
        clearCanvas();
        
        // Create shapes
        data.shapes.forEach(shapeData => {
            const shape = document.createElement('div');
            shape.className = `shape ${shapeData.type}`;
            shape.id = shapeData.id;
            shape.innerHTML = `
                <div class="shape-label">${shapeData.label}</div>
                <div class="shape-arrow top" data-side="top"><i class="bi bi-arrow-up"></i></div>
                <div class="shape-arrow right" data-side="right"><i class="bi bi-arrow-right"></i></div>
                <div class="shape-arrow bottom" data-side="bottom"><i class="bi bi-arrow-down"></i></div>
                <div class="shape-arrow left" data-side="left"><i class="bi bi-arrow-left"></i></div>
            `;
            
            Object.assign(shape.style, {
                left: shapeData.left,
                top: shapeData.top,
                width: shapeData.width,
                height: shapeData.height,
                backgroundColor: shapeData.backgroundColor,
                borderColor: shapeData.borderColor
            });
            
            makeDraggable(shape);
            
            shape.addEventListener('click', (e) => {
                if (e.target.classList.contains('shape-arrow')) return;
                selectElement(shape);
                e.stopPropagation();
            });
            
            const arrows = shape.querySelectorAll('.shape-arrow');
            arrows.forEach(arrow => {
                arrow.addEventListener('click', (e) => {
                    if (!connectionMode) return;
                    
                    if (!connectionStart) {
                        connectionStart = {
                            element: shape,
                            side: arrow.dataset.side
                        };
                        arrow.style.backgroundColor = '#198754';
                    } else {
                        if (connectionStart.element === shape) {
                            resetConnectionMode();
                            return;
                        }
                        
                        createConnection(
                            connectionStart.element, 
                            connectionStart.side, 
                            shape, 
                            arrow.dataset.side
                        );
                        resetConnectionMode();
                    }
                    
                    e.stopPropagation();
                });
            });
            
            canvas.appendChild(shape);
            shapes.push(shape);
        });
        
        // Create connections
        data.connections.forEach(connData => {
            const fromElement = document.getElementById(connData.from);
            const toElement = document.getElementById(connData.to);
            
            if (fromElement && toElement) {
                const connectionId = connData.id;
                
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.id = connectionId;
                path.classList.add('connection-line');
                
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.classList.add('connection-text');
                text.setAttribute('data-connection', connectionId);
                text.setAttribute('dy', -5);
                text.textContent = connData.text || '';
                
                connectionsSvg.appendChild(path);
                connectionsSvg.appendChild(text);
                
                const connection = {
                    id: connectionId,
                    from: connData.from,
                    fromSide: connData.fromSide,
                    to: connData.to,
                    toSide: connData.toSide,
                    text: connData.text
                };
                
                connections.push(connection);
                updateConnection(connection);
            }
        })
    }

    // Export function
    function exportAsImage() {
        html2canvas(canvas).then(canvas => {
            const image = canvas.toDataURL('image/png');
            downloadLink.href = image;
            downloadLink.click();
        });
    }
});