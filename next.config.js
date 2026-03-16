/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  experimental: {
    scrollRestoration: true,
  },
};

module.exports = nextConfig;
