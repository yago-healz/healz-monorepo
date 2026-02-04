import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

export default {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  plugins: [animate],
} satisfies Config
