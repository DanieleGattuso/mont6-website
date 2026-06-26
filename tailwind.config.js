/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './privacy.html', './success.html', './src/**/*.{html,js}'],
  theme: {
    extend: {
      colors: {
        ivory: '#FDFBF7',
        charcoal: '#1A221E',
        gold: '#C5A059',
        'gold-light': 'rgba(197, 160, 89, 0.08)',
        'gold-medium': 'rgba(197, 160, 89, 0.15)',
        'gold-dark': '#9A7A3D',
        'text-main': '#1A1A1A',
        'text-muted': '#5A5A5A',
        'surface': '#F8F5EF',
      },
      fontFamily: {
        heading: ['"Playfair Display"', 'Georgia', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        'display': ['clamp(3.2rem, 9vw, 6.5rem)', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        'hero-title': ['clamp(3rem, 8vw, 6rem)', { lineHeight: '1.05', letterSpacing: '-0.03em' }],
        'section': ['clamp(2.2rem, 5vw, 3.8rem)', { lineHeight: '1.15', letterSpacing: '-0.01em' }],
        'lead': ['1.2rem', { lineHeight: '1.8' }],
        'body': ['1rem', { lineHeight: '1.7' }],
        'caption': ['0.85rem', { lineHeight: '1.5' }],
        'small': ['0.75rem', { lineHeight: '1.4' }],
      },
      letterSpacing: {
        'ultra-wide': '0.3em',
        'wider-custom': '0.1em',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
        '34': '8.5rem',
        '38': '9.5rem',
        'vh-70': '70vh',
        'vh-80': '80vh',
        'vh-90': '90vh',
      },
      maxWidth: {
        'content': '1200px',
        'prose-narrow': '650px',
        'prose-wide': '900px',
      },
      boxShadow: {
        'luxe-xs': '0 2px 15px rgba(0, 0, 0, 0.03)',
        'luxe-sm': '0 4px 30px rgba(0, 0, 0, 0.04)',
        'luxe-md': '0 15px 50px rgba(0, 0, 0, 0.08)',
        'luxe-lg': '0 30px 80px rgba(0, 0, 0, 0.12)',
        'luxe-xl': '0 25px 60px rgba(0, 0, 0, 0.06)',
        'luxe-2xl': '0 40px 100px rgba(0, 0, 0, 0.15)',
        'gold-glow': '0 10px 40px rgba(197, 160, 89, 0.3)',
        'gold-glow-lg': '0 15px 60px rgba(197, 160, 89, 0.4)',
        'inner-gold': 'inset 0 2px 10px rgba(197, 160, 89, 0.1)',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'fade-in-up': 'fadeInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in-right': 'fadeInRight 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 2s infinite',
        'line-drop': 'lineDrop 2s infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'scale-in': 'scaleIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'stagger-1': 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards',
        'stagger-2': 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.2s forwards',
        'stagger-3': 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards',
        'stagger-4': 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.4s forwards',
        'stagger-5': 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.5s forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(40px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInRight: {
          '0%': { opacity: '0', transform: 'translateX(40px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-15px)' },
        },
        lineDrop: {
          '0%': { top: '-100%' },
          '100%': { top: '100%' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
      transitionTimingFunction: {
        'luxe': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'bounce-soft': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      backdropBlur: {
        xs: '2px',
      },
      screens: {
        'xs': '480px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms')({
      strategy: 'class',
    }),
  ],
}
