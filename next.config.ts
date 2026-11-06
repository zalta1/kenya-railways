import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const api = "http://127.0.0.1:4300";
    return [
      { source: "/console/:path*", destination: `${api}/console/:path*` },
      { source: "/api/:path*", destination: `${api}/api/:path*` },
      { source: "/tickets/:path*", destination: `${api}/tickets/:path*` },
      { source: "/fetch.php", destination: `${api}/fetch.php` },
      { source: "/validate.php", destination: `${api}/validate.php` },
    ];
  },
};

export default nextConfig;
