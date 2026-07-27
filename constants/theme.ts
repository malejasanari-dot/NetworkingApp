/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#333333',
    secondaryText: '#666666',
    background: '#FFFFFF',
    card: '#FAEEFC',
    primary: '#4F185A',
    accent1: '#AA0285', // Bright Plum
    accent2: '#EA1E80', // Passion Pink
    tint: '#4F185A',
    icon: '#4F185A',
    tabIconDefault: '#B2B2B2',
    tabIconSelected: '#4F185A',
    border: '#E5E5E5',
    notification: '#FF586C',
  },
  dark: {
    text: '#FFFFFF',
    secondaryText: '#E5E5E5',
    background: '#000000',
    card: '#333333',
    primary: '#DEB8E6',
    accent1: '#FDF361', // Vibrant Yellow
    accent2: '#EA1E80', // Passion Pink
    tint: '#DEB8E6',
    icon: '#DEB8E6',
    tabIconDefault: '#666666',
    tabIconSelected: '#DEB8E6',
    border: '#666666',
    notification: '#FF586C',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
