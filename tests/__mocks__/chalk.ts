// Mock chalk module for Jest
const mockChalk = {
  red: (str: string) => str,
  green: (str: string) => str,
  blue: (str: string) => str,
  yellow: (str: string) => str,
  gray: (str: string) => str,
  white: (str: string) => str,
};

export default mockChalk;
module.exports = mockChalk;