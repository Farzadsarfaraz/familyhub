import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Typography } from '@/constants/theme';

type Variant = 'display' | 'h1' | 'h2' | 'h3' | 'h4' | 'body' | 'bodyLarge' | 'bodySmall' | 'caption' | 'label' | 'overline';
type Weight  = 'regular' | 'medium' | 'semibold' | 'bold' | 'black';

interface Props extends TextProps {
  variant?:  Variant;
  weight?:   Weight;
  color?:    string;
  center?:   boolean;
  muted?:    boolean;
  secondary?: boolean;
}

const variantStyles: Record<Variant, { fontSize: number; lineHeight: number; letterSpacing?: number }> = {
  display:    { fontSize: Typography.fontSize['5xl'], lineHeight: Typography.fontSize['5xl'] * 1.1, letterSpacing: Typography.letterSpacing.tighter },
  h1:         { fontSize: Typography.fontSize['4xl'], lineHeight: Typography.fontSize['4xl'] * 1.15, letterSpacing: Typography.letterSpacing.tight },
  h2:         { fontSize: Typography.fontSize['3xl'], lineHeight: Typography.fontSize['3xl'] * 1.2, letterSpacing: Typography.letterSpacing.tight },
  h3:         { fontSize: Typography.fontSize['2xl'], lineHeight: Typography.fontSize['2xl'] * 1.25 },
  h4:         { fontSize: Typography.fontSize.xl,    lineHeight: Typography.fontSize.xl    * 1.3  },
  bodyLarge:  { fontSize: Typography.fontSize.lg,    lineHeight: Typography.fontSize.lg    * 1.5  },
  body:       { fontSize: Typography.fontSize.base,  lineHeight: Typography.fontSize.base  * 1.55 },
  bodySmall:  { fontSize: Typography.fontSize.sm,    lineHeight: Typography.fontSize.sm    * 1.5  },
  caption:    { fontSize: Typography.fontSize.xs,    lineHeight: Typography.fontSize.xs    * 1.4  },
  label:      { fontSize: Typography.fontSize.sm,    lineHeight: Typography.fontSize.sm    * 1.2,  letterSpacing: Typography.letterSpacing.wide },
  overline:   { fontSize: Typography.fontSize.xs,    lineHeight: Typography.fontSize.xs    * 1.2,  letterSpacing: Typography.letterSpacing.widest },
};

const defaultWeights: Partial<Record<Variant, Weight>> = {
  display:  'black',
  h1:       'bold',
  h2:       'bold',
  h3:       'semibold',
  h4:       'semibold',
  label:    'semibold',
  overline: 'semibold',
  caption:  'regular',
};

export function Text({ variant = 'body', weight, color, center, muted, secondary, style, ...rest }: Props) {
  const { tokens } = useTheme();
  const vStyle = variantStyles[variant];
  const fw     = weight ?? defaultWeights[variant] ?? 'regular';

  const textColor = color
    ?? (muted      ? tokens.textTertiary
     : secondary   ? tokens.textSecondary
     : tokens.text);

  return (
    <RNText
      style={[
        {
          fontSize:      vStyle.fontSize,
          lineHeight:    vStyle.lineHeight,
          letterSpacing: vStyle.letterSpacing ?? 0,
          fontWeight:    Typography.fontWeight[fw],
          color:         textColor,
          textAlign:     center ? 'center' : 'left',
        },
        style,
      ]}
      {...rest}
    />
  );
}
