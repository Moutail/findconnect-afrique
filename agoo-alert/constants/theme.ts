/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const togoGreen = '#006a4e';
const togoYellow = '#ffce00';
const togoRed = '#d21034';

const tintColorLight = togoGreen;
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#0f172a',
    textSecondary: '#64748b',
    textMuted: '#94a3b8',
    background: '#f8fafc',
    surface: '#ffffff',
    surfaceHover: '#f1f5f9',
    border: '#e2e8f0',
    borderLight: '#f1f5f9',
    tint: tintColorLight,
    icon: '#64748b',
    tabIconDefault: '#94a3b8',
    tabIconSelected: tintColorLight,
    togoGreen,
    togoGreenLight: 'rgba(0, 106, 78, 0.1)',
    togoYellow,
    togoYellowLight: 'rgba(255, 206, 0, 0.15)',
    togoRed,
    togoRedLight: 'rgba(210, 16, 52, 0.1)',
    success: '#16a34a',
    successLight: '#dcfce7',
    warning: '#f59e0b',
    warningLight: '#fef3c7',
    error: '#dc2626',
    errorLight: '#fef2f2',
  },
  dark: {
    text: '#f8fafc',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    background: '#0f172a',
    surface: '#1e293b',
    surfaceHover: '#334155',
    border: '#334155',
    borderLight: '#1e293b',
    tint: tintColorDark,
    icon: '#94a3b8',
    tabIconDefault: '#64748b',
    tabIconSelected: tintColorDark,
    togoGreen,
    togoGreenLight: 'rgba(0, 106, 78, 0.2)',
    togoYellow,
    togoYellowLight: 'rgba(255, 206, 0, 0.2)',
    togoRed,
    togoRedLight: 'rgba(210, 16, 52, 0.2)',
    success: '#22c55e',
    successLight: 'rgba(34, 197, 94, 0.15)',
    warning: '#fbbf24',
    warningLight: 'rgba(251, 191, 36, 0.15)',
    error: '#ef4444',
    errorLight: 'rgba(239, 68, 68, 0.15)',
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
