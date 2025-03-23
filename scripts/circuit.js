export class CircuitComponent {
  constructor(type, x, y) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.inputs = [];
    this.output = false;
    this.selected = false;
    this.connections = [];
    this.hovered = false;
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
    this.hoveredComponent = null;
    this.mouseX = 0;
    this.mouseY = 0;
    this.solution = null;
    this.isComplete = false;
    this.confettiParticles = [];
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
          // Check if components are already connected
          if (this.areConnected(this.connectionStart, component)) {
            this.disconnect(this.connectionStart, component);
          } else {
            this.connect(this.connectionStart, component);
          }
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
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.mouseX = x;
    this.mouseY = y;

    // Update hover state
    const hoveredComponent = this.findComponentAt(x, y);
    if (this.hoveredComponent !== hoveredComponent) {
      if (this.hoveredComponent) {
        this.hoveredComponent.hovered = false;
      }
      if (hoveredComponent) {
        hoveredComponent.hovered = true;
      }
      this.hoveredComponent = hoveredComponent;
    }

    // Handle dragging
    if (this.dragging) {
      this.dragging.x = x;
      this.dragging.y = y;
    }

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

  areConnected(comp1, comp2) {
    // Check both directions
    return comp1.connections.includes(comp2) || comp2.connections.includes(comp1) ||
      comp1.inputs.includes(comp2) || comp2.inputs.includes(comp1);
  }

  connect(from, to) {
    if (to.type !== 'INPUT' && to.inputs.length < 2) {
      to.inputs.push(from);
      from.connections.push(to);
      this.evaluate();
      this.checkWinCondition(); // Check for win after each connection
    }
  }

  disconnect(comp1, comp2) {
    // Check and remove connections in both directions
    if (comp1.connections.includes(comp2)) {
      const idx = comp1.connections.indexOf(comp2);
      comp1.connections.splice(idx, 1);
      const inputIdx = comp2.inputs.indexOf(comp1);
      if (inputIdx !== -1) comp2.inputs.splice(inputIdx, 1);
    }

    if (comp2.connections.includes(comp1)) {
      const idx = comp2.connections.indexOf(comp1);
      comp2.connections.splice(idx, 1);
      const inputIdx = comp1.inputs.indexOf(comp2);
      if (inputIdx !== -1) comp1.inputs.splice(inputIdx, 1);
    }

    this.evaluate();
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

  getComponentLabel(type) {
    const labels = {
      'INPUT': 'Input Node (click to toggle)',
      'OUTPUT': 'Output Node',
      'AND': 'AND Gate (A·B)',
      'OR': 'OR Gate (A+B)',
      'NOT': 'NOT Gate (¬A)'
    };
    return labels[type] || type;
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
      this.ctx.strokeStyle = component.selected ? '#0984e3' : '#2d3436';
      this.ctx.lineWidth = component.selected ? 3 : 2;
      this.ctx.fillStyle = component.output ? '#00cec9' : '#fff';

      switch (component.type) {
        case 'INPUT':
          // Draw input node (small circle)
          this.ctx.beginPath();
          this.ctx.arc(component.x, component.y, 15, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.stroke();
          break;

        case 'OUTPUT':
          // Draw output node (double circle)
          this.ctx.beginPath();
          this.ctx.arc(component.x, component.y, 15, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.stroke();
          this.ctx.beginPath();
          this.ctx.arc(component.x, component.y, 12, 0, Math.PI * 2);
          this.ctx.stroke();
          break;

        case 'AND':
          // Draw AND gate
          this.ctx.beginPath();
          this.ctx.moveTo(component.x - 20, component.y - 20); // Start top-left
          this.ctx.lineTo(component.x - 20, component.y + 20); // Down
          this.ctx.lineTo(component.x, component.y + 20);      // Right bottom
          this.ctx.arc(component.x, component.y, 20, Math.PI / 2, -Math.PI / 2, true); // Right curve
          this.ctx.closePath();
          this.ctx.fill();
          this.ctx.stroke();
          break;

        case 'OR':
          // Draw OR gate
          this.ctx.beginPath();
          // Left curve
          this.ctx.moveTo(component.x - 20, component.y - 20);
          this.ctx.quadraticCurveTo(component.x - 35, component.y, component.x - 20, component.y + 20);
          // Right curve
          this.ctx.quadraticCurveTo(component.x, component.y + 15, component.x + 20, component.y);
          this.ctx.quadraticCurveTo(component.x, component.y - 15, component.x - 20, component.y - 20);
          this.ctx.fill();
          this.ctx.stroke();
          break;

        case 'NOT':
          // Draw NOT gate (triangle with circle)
          this.ctx.beginPath();
          this.ctx.moveTo(component.x - 20, component.y - 20); // Top
          this.ctx.lineTo(component.x - 20, component.y + 20); // Down
          this.ctx.lineTo(component.x + 15, component.y);      // Point
          this.ctx.closePath();
          this.ctx.fill();
          this.ctx.stroke();

          // Output bubble
          this.ctx.beginPath();
          this.ctx.arc(component.x + 20, component.y, 5, 0, Math.PI * 2);
          this.ctx.fill();
          this.ctx.stroke();
          break;
      }

      // Draw hover tooltip
      if (component.hovered) {
        const label = this.getComponentLabel(component.type);
        this.ctx.font = '14px system-ui';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        // Draw tooltip background
        const metrics = this.ctx.measureText(label);
        const padding = 8;
        const tooltipWidth = metrics.width + padding * 2;
        const tooltipHeight = 24;
        const tooltipX = component.x;
        const tooltipY = component.y - 40;

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.beginPath();
        this.ctx.roundRect(
          tooltipX - tooltipWidth / 2,
          tooltipY - tooltipHeight / 2,
          tooltipWidth,
          tooltipHeight,
          4
        );
        this.ctx.fill();

        // Draw tooltip text
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillText(label, tooltipX, tooltipY);
      }
    });
  }

  setSolution(solution) {
    // Solution format: Array of {from: componentIndex, to: componentIndex}
    this.solution = solution;
  }

  checkWinCondition() {
    if (!this.solution || this.isComplete) return false;

    // Check if all required connections exist
    const allConnectionsCorrect = this.solution.every(connection => {
      const fromComponent = this.components[connection.from];
      const toComponent = this.components[connection.to];
      return this.areConnected(fromComponent, toComponent);
    });

    // Check if all outputs are correct
    const outputsCorrect = this.components
      .filter(c => c.type === 'OUTPUT')
      .every(c => c.output === true);

    if (allConnectionsCorrect && outputsCorrect && !this.isComplete) {
      this.isComplete = true;
      this.celebrateWin();
      return true;
    }

    return false;
  }

  celebrateWin() {
    // Create and show modal immediately
    const modal = document.createElement('div');
    modal.className = 'win-modal';
    modal.style.opacity = '1'; // Force opacity
    modal.innerHTML = `
      <div class="win-modal-content">
        <h2>Circuit Complete! 🎉</h2>
        <p>Excellent work! You've successfully solved this circuit puzzle.</p>
        <div class="win-stats">
          <div>Score: +100</div>
          <div>Perfect Solution! ⭐</div>
        </div>
        <button class="next-level-btn">Next Circuit →</button>
      </div>
    `;
    document.body.appendChild(modal);

    // Add click handler for next level button
    const nextButton = modal.querySelector('.next-level-btn');
    nextButton.addEventListener('click', () => {
      modal.remove();
      if (typeof this.onNextLevel === 'function') {
        this.onNextLevel();
      }
    });

    // Create confetti with more particles and better spread
    const createConfettiParticle = () => {
      const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
      const confetti = document.createElement('div');
      confetti.className = 'confetti';

      // Randomize starting position across entire window width
      confetti.style.left = Math.random() * window.innerWidth + 'px';

      // Randomize size between 8px and 12px
      const size = Math.random() * 4 + 8;
      confetti.style.width = size + 'px';
      confetti.style.height = size + 'px';

      // Randomize color
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];

      // Randomize animation duration between 2s and 5s
      confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';

      // Add rotation
      confetti.style.transform = `rotate(${Math.random() * 360}deg)`;

      // Start from above the viewport
      confetti.style.top = '-20px';

      document.body.appendChild(confetti);

      // Remove after animation
      setTimeout(() => confetti.remove(), 5000);
    };

    // Create more confetti particles with staggered timing
    for (let i = 0; i < 150; i++) {
      setTimeout(createConfettiParticle, i * 20);
    }

    // Animate circuit components with rainbow effect
    let frame = 0;
    const celebrationAnimation = () => {
      if (frame > 180) return; // 3 second animation

      this.components.forEach((component, index) => {
        // Calculate pulsing effect
        const scale = 1 + Math.sin(frame * 0.1) * 0.15;
        const bounce = Math.sin(frame * 0.2 + index) * 5;

        // Save context state
        this.ctx.save();

        // Apply transformations
        this.ctx.translate(component.x, component.y + bounce);
        this.ctx.scale(scale, scale);
        this.ctx.translate(-component.x, -(component.y + bounce));

        // Rainbow color effect for components
        const hue = (frame * 3 + index * 30) % 360;
        this.ctx.strokeStyle = `hsl(${hue}, 70%, 60%)`;
        this.ctx.fillStyle = `hsl(${hue}, 70%, 95%)`;
        this.ctx.lineWidth = 2 + Math.sin(frame * 0.1);

        // Draw component with celebration effect
        this.drawComponent(component);

        // Restore context
        this.ctx.restore();
      });

      // Animate connections with rainbow effect
      this.components.forEach(component => {
        component.connections.forEach((target, index) => {
          const hue = (frame * 3 + index * 30) % 360;
          this.ctx.strokeStyle = `hsl(${hue}, 70%, 60%)`;
          this.ctx.lineWidth = 2 + Math.sin(frame * 0.1);
          this.ctx.beginPath();
          this.ctx.moveTo(component.x, component.y);
          this.ctx.lineTo(target.x, target.y);
          this.ctx.stroke();
        });
      });

      frame++;
      requestAnimationFrame(celebrationAnimation);
    };

    celebrationAnimation();
  }
} 