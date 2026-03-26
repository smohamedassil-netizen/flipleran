/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#1B4F72',
          hover:   '#154060',
          light:   '#EBF3FA',
        },
        accent: {
          DEFAULT: '#E8A838',
          hover:   '#D4952A',
          light:   '#FEF6E7',
        },
        bg:      '#F4F6F8',
        surface: '#FFFFFF',
        border:  '#E2E8F0',
        text: {
          DEFAULT:   '#1A202C',
          secondary: '#718096',
          disabled:  '#A0AEC0',
        },
      },
      borderRadius: {
        sm:  '4px',
        DEFAULT: '6px',
        md:  '6px',
        lg:  '8px',
        xl:  '8px',
        '2xl': '8px',
        full: '9999px',
      },
      boxShadow: {
        xs:  '0 1px 2px rgba(0,0,0,0.06)',
        sm:  '0 1px 3px rgba(0,0,0,0.08)',
        DEFAULT: '0 1px 3px rgba(0,0,0,0.08)',
        md:  '0 1px 3px rgba(0,0,0,0.08)',
        lg:  '0 1px 3px rgba(0,0,0,0.08)',
        xl:  '0 1px 3px rgba(0,0,0,0.08)',
        none: 'none',
      },
      fontSize: {
        xs:   ['11px', '1.4'],
        sm:   ['13px', '1.5'],
        base: ['14px', '1.6'],
        md:   ['15px', '1.5'],
        lg:   ['17px', '1.4'],
        xl:   ['20px', '1.4'],
        '2xl':['24px', '1.3'],
        '3xl':['30px', '1.2'],
      },
    },
  },
  plugins: [],
};
