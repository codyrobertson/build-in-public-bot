// Mock for chalk module
const chalk = {
  bold: (str) => str,
  dim: (str) => str,
  red: (str) => str,
  green: (str) => str,
  yellow: (str) => str,
  blue: (str) => str,
  cyan: (str) => str,
  white: (str) => str,
  gray: (str) => str,
  grey: (str) => str,
  bgRed: (str) => str,
  bgGreen: (str) => str,
  bgYellow: (str) => str,
  bgBlue: (str) => str,
  // Chain methods
  bold: {
    red: (str) => str,
    green: (str) => str,
    yellow: (str) => str,
    blue: (str) => str,
  },
};

// Make chainable
Object.keys(chalk).forEach(key => {
  if (typeof chalk[key] === 'function') {
    Object.keys(chalk).forEach(innerKey => {
      chalk[key][innerKey] = chalk[innerKey];
    });
  }
});

module.exports = chalk;
module.exports.default = chalk;