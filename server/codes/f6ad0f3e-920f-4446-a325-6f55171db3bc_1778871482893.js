const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

// Initialize variables to store user input
let num1 = null;
let num2 = null;
let operator = null;

// Function to handle user input
function getUserInput() {
  // Prompt user for first number
  readline.question('Enter the first number: ', (answer) => {
    num1 = parseFloat(answer);
    // Prompt user for operator
    readline.question('Enter the operator (+, -, *, /): ', (answer) => {
      operator = answer;
      // Prompt user for second number
      readline.question('Enter the second number: ', (answer) => {
        num2 = parseFloat(answer);
        // Perform calculation
        calculate();
        // Close the readline interface
        readline.close();
      });
    });
  });
}

// Function to perform calculation
function calculate() {
  try {
    // Perform calculation based on operator
    switch (operator) {
      case '+':
        console.log(`Result: ${num1} + ${num2} = ${num1 + num2}`);
        break;
      case '-':
        console.log(`Result: ${num1} - ${num2} = ${num1 - num2}`);
        break;
      case '*':
        console.log(`Result: ${num1} * ${num2} = ${num1 * num2}`);
        break;
      case '/':
        if (num2 !== 0) {
          console.log(`Result: ${num1} / ${num2} = ${num1 / num2}`);
        } else {
          console.log('Error: Division by zero is not allowed.');
        }
        break;
      default:
        console.log('Error: Invalid operator.');
    }
  } catch (error) {
    console.log('Error: Invalid input.');
  }
}

// Get user input
getUserInput();
",
  "description": "This code handles user input and performs basic arithmetic calculations.",
  "expected_output": "Result of the calculation (e.g. 2 + 3 = 5)"
}