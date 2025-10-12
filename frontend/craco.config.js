// Minimal CRACO configuration to allow "craco start/build/test" to run.
// We keep CRA defaults and do not override anything unless needed later.
const path = require('path');

module.exports = {
  style: {
    // Keep default PostCSS pipeline; this just ensures CRACO doesn't fail if Tailwind/PostCSS is present.
    postcss: {
      mode: 'extends',
    },
  },
  webpack: {
    // Return CRA's default webpack config unchanged.
    configure: (webpackConfig) => {
      return webpackConfig;
    },
  },
};
