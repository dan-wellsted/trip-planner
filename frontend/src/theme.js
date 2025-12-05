import { extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
  styles: {
    global: {
      body: {
        bg: '#0c111b',
        color: '#eaf1ff',
        backgroundImage:
          'radial-gradient(circle at 20% 20%, rgba(255, 127, 80, 0.12), transparent 30%), radial-gradient(circle at 80% 0%, rgba(124, 123, 255, 0.12), transparent 25%), radial-gradient(circle at 50% 80%, rgba(79, 209, 197, 0.1), transparent 30%), #0c111b',
      },
    },
  },
  fonts: {
    heading: "'Space Grotesk', 'Inter', system-ui, -apple-system, sans-serif",
    body: "'Space Grotesk', 'Inter', system-ui, -apple-system, sans-serif",
  },
  colors: {
    brand: {
      50: '#ffe9e0',
      100: '#ffc7b3',
      200: '#ffa180',
      300: '#ff7f50',
      400: '#ff6633',
      500: '#e54d1f',
      600: '#b83a17',
      700: '#8a2a11',
      800: '#5c1c0b',
      900: '#2e0d05',
    },
    indigo: {
      50: '#eef2ff',
      100: '#e0e7ff',
      200: '#c7d2fe',
      300: '#a5b4fc',
      400: '#818cf8',
      500: '#6366f1',
      600: '#4f46e5',
      700: '#4338ca',
      800: '#3730a3',
      900: '#312e81',
    },
  },
  components: {
    Button: {
      variants: {
        solid: {
          bgGradient: 'linear(to-r, brand.300, indigo.500)',
          color: '#0c0c0c',
          _hover: { filter: 'brightness(1.05)' },
        },
        ghost: {
          bg: 'whiteAlpha.100',
          color: 'white',
          _hover: { bg: 'whiteAlpha.200' },
        },
      },
    },
    Card: {
      baseStyle: {
        bg: '#0f1624',
        color: '#eaf1ff',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: 'lg',
        backdropFilter: 'blur(12px)',
        borderRadius: '16px',
      },
    },
  },
});

export default theme;
