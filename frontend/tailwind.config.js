/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './index.html',
        './src/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {
            colors: {
                // Custom color palette for the monitoring dashboard
                'cyber': {
                    50:  '#eef2ff',
                    100: '#dde6ff',
                    200: '#c2cfff',
                    300: '#9db1ff',
                    400: '#7088ff',
                    500: '#4a5cff',
                    600: '#3635f5',
                    700: '#2c27d8',
                    800: '#2521ae',
                    900: '#242189',
                    950: '#161350',
                },
                'neon': {
                    green: '#00ff88',
                    red: '#ff3366',
                    blue: '#00ccff',
                    yellow: '#ffcc00',
                    purple: '#aa55ff',
                },
            },
            fontFamily: {
                'sans': ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
                'mono': ['JetBrains Mono', 'Fira Code', 'monospace'],
            },
            animation: {
                'pulse-slow': 'pulse 3s ease-in-out infinite',
                'glow': 'glow 2s ease-in-out infinite alternate',
                'slide-up': 'slideUp 0.3s ease-out',
                'fade-in': 'fadeIn 0.3s ease-out',
            },
            keyframes: {
                glow: {
                    '0%': { boxShadow: '0 0 5px rgba(0, 255, 136, 0.2)' },
                    '100%': { boxShadow: '0 0 20px rgba(0, 255, 136, 0.4)' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(10px)', opacity: 0 },
                    '100%': { transform: 'translateY(0)', opacity: 1 },
                },
                fadeIn: {
                    '0%': { opacity: 0 },
                    '100%': { opacity: 1 },
                },
            },
            backdropBlur: {
                xs: '2px',
            },
        },
    },
    plugins: [],
};
