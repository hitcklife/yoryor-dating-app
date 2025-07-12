import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import {
  Avatar,
  AvatarImage,
  AvatarFallbackText,
  Box
} from '@gluestack-ui/themed';

interface CircularProgressAvatarProps {
  imageUrl?: string | null;
  fallbackText?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  percentage: number;
  showPercentageBadge?: boolean;
  strokeWidth?: number;
  activeColor?: string;
  inactiveColor?: string;
}

export function CircularProgressAvatar({
  imageUrl,
  fallbackText = 'U',
  size = 'xl',
  percentage = 0,
  showPercentageBadge = true,
  strokeWidth = 4,
  activeColor = '#8F3BBF',
  inactiveColor = '#E5E7EB'
}: CircularProgressAvatarProps) {
  // Map avatar sizes to pixel values
  const sizeMap = {
    xs: 24,
    sm: 32,
    md: 48,
    lg: 64,
    xl: 96,
    '2xl': 128
  };

  const avatarSize = sizeMap[size] || 96;
  const svgSize = avatarSize + (strokeWidth * 4); // Add padding for the progress ring
  const radius = (svgSize - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const center = svgSize / 2;

  // Badge size based on avatar size
  const badgeSize = avatarSize < 64 ? 20 : 28;
  const badgeFontSize = avatarSize < 64 ? 10 : 12;

  return (
    <Box position="relative" width={svgSize} height={svgSize} alignItems="center" justifyContent="center">
      {/* Progress Ring */}
      <Box position="absolute" top={0} left={0}>
        <Svg width={svgSize} height={svgSize}>
          <G rotation="-90" origin={`${center}, ${center}`}>
            {/* Background Circle */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={inactiveColor}
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Progress Circle */}
            <Circle
              cx={center}
              cy={center}
              r={radius}
              stroke={activeColor}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </G>
        </Svg>
      </Box>

      {/* Avatar */}
      <Avatar size={size}>
        {imageUrl ? (
          <AvatarImage source={{ uri: imageUrl }} alt="Profile" />
        ) : (
          <AvatarFallbackText>{fallbackText}</AvatarFallbackText>
        )}
      </Avatar>

      {/* Percentage Badge */}
      {showPercentageBadge && percentage < 100 && (
        <Box
          position="absolute"
          bottom={-8}
          right={-8}
          bg="$primary600"
          borderRadius="$full"
          minWidth={36}
          height={36}
          alignItems="center"
          justifyContent="center"
          borderWidth="$2"
          borderColor="$white"
          shadowColor="$shadowColor"
          shadowOffset={{ width: 0, height: 4 }}
          shadowOpacity={0.25}
          shadowRadius={4}
          elevation={6}
        >
          <Text
            style={{
              fontSize: 12,
              fontWeight: 'bold',
              color: 'white'
            }}
          >
            {percentage}%
          </Text>
        </Box>
      )}
    </Box>
  );
} 