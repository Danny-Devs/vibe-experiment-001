export class CircuitComponent {
  constructor(type, x, y) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.inputs = [];
    this.output = false;
    this.selected = false;
    this.connections = [];
  }

  evaluate() {
    switch (this.type) {
      case 'AND':
        this.output = this.inputs.length === 2 &&
          this.inputs[0].output &&
          this.inputs[1].output;
        break;
      case 'OR':
        this.output = this.inputs.length === 2 &&
          (this.inputs[0].output ||
            this.inputs[1].output);
        break;
      case 'NOT':
        this.output = this.inputs.length === 1 &&
          !this.inputs[0].output;
        break;
      case 'INPUT':
        // Input nodes maintain their own state
        break;
      case 'OUTPUT':
        this.output = this.inputs.length === 1 &&
          this.inputs[0].output;
        break;
    }
  }
}

export class Circuit {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.components = [];
    this.dragging = null;
    this.connectionStart = null; // Store the first component clicked for connection
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
  }

  addComponent(type, x, y) {
    const component = new CircuitComponent(type, x, y);
    this.components.push(component);
    this.render();
    return component;
  }

  handleMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Find clicked component
    const component = this.findComponentAt(x, y);

    if (component) {
      if (e.shiftKey) {
        // If shift is held and we have a connection start component
        if (this.connectionStart && this.connectionStart !== component) {
          this.connect(this.connectionStart, component);
          this.connectionStart.selected = false;
          this.connectionStart = null;
        }
      } else {
        // If no shift key, either start dragging or start connection
        if (this.connectionStart) {
          // Clear previous connection attempt
          this.connectionStart.selected = false;
          this.connectionStart = null;
        }
        this.dragging = component;
        component.selected = true;

        // Start new connection (will be completed on shift-click)
        this.connectionStart = component;
      }
      this.render();
    }
  }

  handleMouseMove(e) {
    if (!this.dragging) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.dragging.x = x;
    this.dragging.y = y;
    this.render();
  }

  handleMouseUp(e) {
    if (this.dragging) {
      // Keep the component selected if it's the connection start
      if (this.dragging !== this.connectionStart) {
        this.dragging.selected = false;
      }
      this.dragging = null;
      this.render();
    }
  }

  connect(from, to) {
    if (to.type !== 'INPUT' && to.inputs.length < 2) {
      to.inputs.push(from);
      from.connections.push(to);
      this.evaluate();
    }
  }

  findComponentAt(x, y) {
    const radius = 20;
    return this.components.find(component => {
      const dx = component.x - x;
      const dy = component.y - y;
      return (dx * dx + dy * dy) <= radius * radius;
    });
  }

  evaluate() {
    // Reset all components except inputs
    this.components.forEach(component => {
      if (component.type !== 'INPUT') {
        component.output = false;
      }
    });

    // Evaluate in topological order
    let changed;
    do {
      changed = false;
      this.components.forEach(component => {
        const oldOutput = component.output;
        component.evaluate();
        if (oldOutput !== component.output) {
          changed = true;
        }
      });
    } while (changed);

    this.render();
  }

  render() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw connections
    this.ctx.strokeStyle = '#666';
    this.ctx.lineWidth = 2;
    this.components.forEach(component => {
      component.connections.forEach(target => {
        this.ctx.beginPath();
        this.ctx.moveTo(component.x, component.y);
        this.ctx.lineTo(target.x, target.y);
        this.ctx.stroke();
      });
    });

    // Draw components
    this.components.forEach(component => {
      this.ctx.fillStyle = component.output ? '#00cec9' : '#dfe6e9';
      this.ctx.strokeStyle = component.selected ? '#0984e3' : '#2d3436';
      this.ctx.lineWidth = component.selected ? 3 : 2;

      this.ctx.beginPath();
      this.ctx.arc(component.x, component.y, 20, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();

      this.ctx.fillStyle = '#2d3436';
      this.ctx.font = '12px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(component.type, component.x, component.y);
    });
  }
} 