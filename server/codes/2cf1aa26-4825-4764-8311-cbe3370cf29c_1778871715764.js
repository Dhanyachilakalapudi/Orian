const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Calculator</title>
    <style>
      /* CSS styles for calculator layout */
      body {
        font-family: Arial, sans-serif;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        background-color: #f0f0f0;
      }
      .calculator {
        width: 300px;
        height: 400px;
        background-color: #fff;
        padding: 20px;
        border: 1px solid #ddd;
        border-radius: 10px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
      }
      .display {
        width: 100%;
        height: 50px;
        background-color: #f0f0f0;
        padding: 10px;
        border: none;
        border-radius: 10px;
        font-size: 24px;
        text-align: right;
        box-sizing: border-box;
      }
      .buttons {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
      }
      .button {
        width: 100%;
        height: 50px;
        background-color: #4CAF50;
        color: #fff;
        padding: 10px;
        border: none;
        border-radius: 10px;
        font-size: 18px;
        cursor: pointer;
      }
      .button:hover {
        background-color: #3e8e41;
      }
      .clear {
        background-color: #f44336;
      }
      .clear:hover {
        background-color: #e91e63;
      }
    </style>
  </head>
  <body>
    <div class="calculator">
      <input type="text" id="display" class="display" disabled>
      <div class="buttons">
        <button class="button" id="clear">C</button>
        <button class="button" id="backspace">&larr;</button>
        <button class="button" id="divide">/</button>
        <button class="button" id="multiply">*</button>
        <button class="button" id="seven">7</button>
        <button class="button" id="eight">8</button>
        <button class="button" id="nine">9</button>
        <button class="button" id="subtract">-</button>
        <button class="button" id="four">4</button>
        <button class="button" id="five">5</button>
        <button class="button" id="six">6</button>
        <button class="button" id="add">+</button>
        <button class="button" id="one">1</button>
        <button class="button" id="two">2</button>
        <button class="button" id="three">3</button>
        <button class="button" id="equals">=</button>
        <button class="button" id="zero">0</button>
        <button class="button" id="decimal">.</button>
      </div>
    </div>
    <script>
      // JavaScript code for calculator functionality
      const display = document.getElementById('display');
      const buttons = document.querySelectorAll('.button');
      let equation = '';

      buttons.forEach(button => {
        button.addEventListener('click', () => {
          const value = button.textContent;
          if (value === 'C') {
            display.value = '';
            equation = '';
          } else if (value === '&larr;') {
            display.value = display.value.slice(0, -1);
          } else if (value === '=') {
            try {
              display.value = eval(equation);
              equation = display.value;
            } catch (error) {
              display.value = 'Error';
              equation = '';
            }
          } else {
            equation += value;
            display.value = equation;
          }
        });
      });
    </script>
  </body>
  </html>
`;

// Create a new HTML element and append the code to it
const calculator = document.createElement('div');
calculator.innerHTML = html;
document.body.appendChild(calculator);
`,
  "description": "A simple calculator layout using HTML and CSS, with basic functionality implemented in JavaScript.",
  "expected_output": "A simple calculator layout with buttons for digits, operators, and equals, and a display field to show the current equation and result."
}