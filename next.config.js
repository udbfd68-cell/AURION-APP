/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: false,
  // Note: COEP/COOP headers are set in vercel.json to avoid duplication
};

module.exports = nextConfig;
