import React from 'react';
import { Button as GluestackButton, ButtonText, ButtonSpinner } from '@gluestack-ui/themed';
import { useColorScheme } from 'nativewind';

export interface ButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'solid' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isDisabled?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  className?: string;
}

export function Button({
  onPress,
  title,
  variant = 'solid',
  size = 'md',
  isDisabled = false,
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
}: ButtonProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Map custom variants to Gluestack variants
  const getGluestackVariant = () => {
    switch (variant) {
      case 'outline':
        return 'outline';
      case 'ghost':
        return 'link'; // Gluestack uses 'link' for ghost-like appearance
      case 'solid':
      default:
        return 'solid';
    }
  };

  // Map custom sizes to Gluestack sizes
  const getGluestackSize = () => {
    switch (size) {
      case 'sm':
        return 'sm';
      case 'lg':
        return 'lg';
      case 'md':
      default:
        return 'md';
    }
  };

  // Get the appropriate action prop for theming
  const getAction = () => {
    if (isDisabled) return 'secondary';
    return 'primary';
  };

  return (
    <GluestackButton
      onPress={onPress}
      variant={getGluestackVariant()}
      size={getGluestackSize()}
      action={getAction()}
      isDisabled={isDisabled || isLoading}
      className={className}
    >
      {isLoading && <ButtonSpinner mr="$1" />}
      {leftIcon && !isLoading && leftIcon}
      <ButtonText>{title}</ButtonText>
      {rightIcon && !isLoading && rightIcon}
    </GluestackButton>
  );
}
