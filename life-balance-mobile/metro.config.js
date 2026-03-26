const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// react-native-svg 15.8+ imports Node's 'buffer' module.
// Redirect it to the safe React Native compatible version.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  buffer: path.resolve(__dirname, 'node_modules/buffer'),
};

module.exports = config;
