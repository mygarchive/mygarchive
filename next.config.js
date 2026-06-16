/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // این خط فوق‌العاده مهم است
  images: {
    unoptimized: true, // چون سرور نداریم، به این خط نیاز داریم
  },
};

export default nextConfig;
