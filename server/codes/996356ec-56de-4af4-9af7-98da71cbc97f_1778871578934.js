const buttons = document.querySelectorAll('.button');

// Create an empty calculator object
const calculator = {
  display: document.getElementById('display'),
  currentNumber: '',
  previousNumber: '',
  operation: null
};

// Add event listeners to each button
buttons.forEach(button => {
  button.addEventListener('click', () => {
    const value = button.textContent;

    // Handle number buttons
    if (!isNaN(value) || value === '.') {
      calculator.currentNumber += value;
      calculator.display.value = calculator.currentNumber;
    }
    // Handle operation buttons
    else if (value === '+' || value === '-' || value === '*' || value === '/') {
      if (calculator.previousNumber !== '') {
        calculator.operation = value;
        calculator.previousNumber = calculator.currentNumber;
        calculator.currentNumber = '';
        calculator.display.value = calculator.previousNumber + ' ' + calculator.operation;
      }
    }
    // Handle equals button
    else if (value === '=') {
      if (calculator.previousNumber !== '' && calculator.operation !== null) {
        const result = eval(calculator.previousNumber + calculator.operation + calculator.currentNumber);
        calculator.display.value = result;
        calculator.currentNumber = result.toString();
        calculator.previousNumber = '';
        calculator.operation = null;
      }
    }
    // Handle clear button
    else if (value === 'C') {
      calculator.currentNumber = '';
      calculator.previousNumber = '';
      calculator.operation = null;
      calculator.display.value = '';
    }
  });
});
`,
  "description": "Sets up event listeners and basic JavaScript functionality for calculator buttons",
  "expected_output": "A working calculator with buttons for numbers, operations, and equals"
}