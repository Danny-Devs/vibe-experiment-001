import { Circuit } from './circuit.js';

class Challenge {
  constructor(title, description, inputs, expectedOutput, availableComponents) {
    this.title = title;
    this.description = description;
    this.inputs = inputs;
    this.expectedOutput = expectedOutput;
    this.availableComponents = availableComponents;
  }

  verify(circuit) {
    // Test all input combinations
    for (let i = 0; i < this.inputs.length; i++) {
      const inputValues = this.inputs[i];
      const expectedOutput = this.expectedOutput[i];

      // Set input values
      circuit.components.forEach((component, index) => {
        if (component.type === 'INPUT') {
          component.output = inputValues[index];
        }
      });

      circuit.evaluate();

      // Check output
      const output = circuit.components.find(c => c.type === 'OUTPUT');
      if (output.output !== expectedOutput) {
        return false;
      }
    }
    return true;
  }

  // Add solution configurations for each challenge type
  getSolution() {
    const solutions = {
      'AND Gate': {
        components: [
          { type: 'INPUT', x: 50, y: 150 },
          { type: 'INPUT', x: 50, y: 250 },
          { type: 'AND', x: 200, y: 200 },
          { type: 'OUTPUT', x: 350, y: 200 }
        ],
        connections: [
          { from: 0, to: 2 },  // First input to AND
          { from: 1, to: 2 },  // Second input to AND
          { from: 2, to: 3 }   // AND to output
        ]
      },
      'OR Gate': {
        components: [
          { type: 'INPUT', x: 50, y: 150 },
          { type: 'INPUT', x: 50, y: 250 },
          { type: 'OR', x: 200, y: 200 },
          { type: 'OUTPUT', x: 350, y: 200 }
        ],
        connections: [
          { from: 0, to: 2 },
          { from: 1, to: 2 },
          { from: 2, to: 3 }
        ]
      },
      'NOT Gate': {
        components: [
          { type: 'INPUT', x: 50, y: 200 },
          { type: 'NOT', x: 200, y: 200 },
          { type: 'OUTPUT', x: 350, y: 200 }
        ],
        connections: [
          { from: 0, to: 1 },
          { from: 1, to: 2 }
        ]
      }
    };

    return solutions[this.title];
  }
}

class App {
  constructor() {
    this.circuit = new Circuit(document.getElementById('circuitCanvas'));
    this.currentChallenge = 0;
    this.challenges = this.setupChallenges();

    // Set up next level callback
    this.circuit.onNextLevel = () => {
      this.currentChallenge++;
      if (this.currentChallenge < this.challenges.length) {
        this.loadChallenge(this.currentChallenge);
      } else {
        // Game complete state
        const modal = document.createElement('div');
        modal.className = 'win-modal';
        modal.innerHTML = `
          <div class="win-modal-content">
            <h2>Game Complete! 🏆</h2>
            <p>Congratulations! You've mastered all the circuit challenges!</p>
            <div class="win-stats">
              <div>Total Score: 300</div>
              <div>All Challenges Complete! 🌟</div>
            </div>
            <button class="next-level-btn">Play Again</button>
          </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('.next-level-btn').addEventListener('click', () => {
          modal.remove();
          this.currentChallenge = 0;
          this.loadChallenge(0);
        });
      }
    };

    this.setupUI();
    this.loadChallenge(0);
  }

  setupChallenges() {
    return [
      new Challenge(
        'AND Gate',
        'Create a circuit that outputs TRUE only when both inputs are TRUE.',
        [[false, false], [false, true], [true, false], [true, true]],
        [false, false, false, true],
        ['AND']
      ),
      new Challenge(
        'OR Gate',
        'Create a circuit that outputs TRUE when at least one input is TRUE.',
        [[false, false], [false, true], [true, false], [true, true]],
        [false, true, true, true],
        ['OR']
      ),
      new Challenge(
        'NOT Gate',
        'Create a circuit that inverts the input.',
        [[false], [true]],
        [true, false],
        ['NOT']
      )
    ];
  }

  setupUI() {
    // Setup component buttons
    const componentList = document.querySelector('.component-list');
    ['INPUT', 'OUTPUT', 'AND', 'OR', 'NOT'].forEach(type => {
      const btn = document.createElement('button');
      btn.className = 'component-btn';
      btn.textContent = type;
      btn.addEventListener('click', () => {
        const x = Math.random() * (this.circuit.canvas.width - 100) + 50;
        const y = Math.random() * (this.circuit.canvas.height - 100) + 50;
        this.circuit.addComponent(type, x, y);
      });
      componentList.appendChild(btn);
    });

    // Setup control buttons
    document.getElementById('runCircuit').addEventListener('click', () => {
      this.circuit.evaluate();
      const currentChallenge = this.challenges[this.currentChallenge];
      if (currentChallenge.verify(this.circuit)) {
        const solution = currentChallenge.getSolution();
        // Force celebration immediately instead of waiting for connection check
        this.circuit.isComplete = true;
        this.circuit.celebrateWin();
      }
    });

    document.getElementById('resetCircuit').addEventListener('click', () => {
      this.circuit.components = [];
      this.circuit.render();
      this.loadChallenge(this.currentChallenge);
    });

    document.getElementById('showSolution').addEventListener('click', () => {
      this.showSolution();
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      this.resizeCanvas();
    });
    this.resizeCanvas();
  }

  showSolution() {
    const challenge = this.challenges[this.currentChallenge];
    const solution = challenge.getSolution();

    // Clear current circuit
    this.circuit.components = [];

    // Add components
    const components = solution.components.map(comp =>
      this.circuit.addComponent(comp.type, comp.x, comp.y)
    );

    // Add connections
    solution.connections.forEach(conn => {
      this.circuit.connect(components[conn.from], components[conn.to]);
    });

    // Set solution for win state detection
    this.circuit.setSolution(solution.connections);

    // Evaluate the circuit
    this.circuit.evaluate();
  }

  resizeCanvas() {
    const canvas = this.circuit.canvas;
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    this.circuit.render();
  }

  loadChallenge(index) {
    const challenge = this.challenges[index];
    document.querySelector('.current-challenge h3').textContent =
      `Challenge ${index + 1}: ${challenge.title}`;
    document.querySelector('.challenge-description').textContent =
      challenge.description;

    // Update progress
    const progress = ((index) / this.challenges.length) * 100;
    document.querySelector('.progress-fill').style.width = `${progress}%`;
    document.querySelector('.progress-text').textContent =
      `Challenge Progress: ${index}/${this.challenges.length}`;

    // Reset circuit and solution
    this.circuit.components = [];
    this.circuit.solution = null;
    this.circuit.isComplete = false;

    // Add initial components
    const inputY = this.circuit.canvas.height / 2;
    challenge.inputs[0].forEach((_, i) => {
      this.circuit.addComponent('INPUT', 50, inputY - 50 + i * 100);
    });
    this.circuit.addComponent('OUTPUT',
      this.circuit.canvas.width - 50,
      this.circuit.canvas.height / 2
    );

    // Set solution for win state detection
    const solution = challenge.getSolution();
    this.circuit.setSolution(solution.connections);
  }
}

// Initialize app
window.addEventListener('DOMContentLoaded', () => {
  new App();
});
