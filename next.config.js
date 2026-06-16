/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  // این بخش پوشه data شما را در خروجی out کپی می‌کند تا خطای 404 برطرف شود
  webpack: (config, { isServer }) => {
    if (!isServer) {
      const CopyPlugin = require('copy-webpack-plugin');
      config.plugins.push(
        new CopyPlugin({
          patterns: [{ from: 'data', to: 'data' }],
        })
      );
    }
    return config;
  },
};

module.exports = nextConfig;
