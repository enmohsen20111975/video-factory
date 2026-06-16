/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: {
      rules: {
        "*.ttf": {
          loaders: ["default", "css"],
          as: "font"
        }
      }
    }
  }
};

module.exports = nextConfig;