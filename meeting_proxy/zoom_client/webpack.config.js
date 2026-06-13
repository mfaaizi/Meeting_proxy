const path = require('path');

module.exports = {
  // Entry point — where webpack starts bundling
  entry: './src/index.js',

  output: {
    // Output bundled file to dist/bundle.js
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
    // Expose the module as a global variable "ZoomApp"
    library: 'ZoomApp',
    libraryTarget: 'window'
  },

  resolve: {
    fallback: {
      // Zoom SDK needs these Node.js polyfills for browser
      crypto: false,
      stream: false,
      buffer: false
    }
  }
};