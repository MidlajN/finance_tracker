const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, {
  // Default inline rem is 14; 16 keeps the Tailwind px scale exact
  // (p-4 = 16px) so StyleSheet values migrate 1:1.
  inlineRem: 16,
  input: "./global.css",
});
