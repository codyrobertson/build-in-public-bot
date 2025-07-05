const os = jest.requireActual('os');

module.exports = {
  ...os,
  homedir: jest.fn(() => process.env.TEST_HOME || '/home/testuser')
};