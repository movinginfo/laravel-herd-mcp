module.exports = {
  content: [
    './src/**/*.vue',
  ],
  theme: {
    extend: {
      colors: {
        black: '#181a1a',
        'laravel-red': '#F41922',
        'onboarding-gray': 'rgb(86, 84, 84)',
        'onboarding-red': 'rgb(248, 51, 43)',
      },
      fontFamily: {
        sans: [
          'Segoe UI',
          'sans-serif'
        ],
        icon: [
          'Segoe Fluent Icons',
          'sans-serif'
        ],
      },
      screens: {
        xs: '530px'
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('tailwindcss/plugin')(function({ addVariant }) {
      addVariant('em', ({ container }) => {
        container.walkRules(rule => {
          rule.selector = `.em\\:${rule.selector.slice(1)}`;
          rule.walkDecls((decl) => {
            decl.value = decl.value.replace('rem', 'em');
          });
        })
      })
    })
  ],
}
