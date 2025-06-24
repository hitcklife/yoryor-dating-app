import React from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { useColorScheme } from 'nativewind';

export interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad' | 'numeric' | 'email-address' | 'phone-pad';
  secureTextEntry?: boolean;
  label?: string;
  error?: string;
  maxLength?: number;
}

export function Input({
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  secureTextEntry = false,
  label,
  error,
  maxLength,
  ...props
}: InputProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View className="mb-4">
      {label && (
        <Text
          className={`mb-1 text-sm font-medium ${
            isDark ? 'text-typography-600' : 'text-typography-700'
          }`}
        >
          {label}
        </Text>
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        maxLength={maxLength}
        className={`w-full px-4 py-3 rounded-lg border ${
          error
            ? 'border-error-500 bg-error-50'
            : isDark
            ? 'border-outline-300 bg-background-100'
            : 'border-outline-200 bg-background-0'
        } text-base ${
          isDark ? 'text-typography-600' : 'text-typography-900'
        }`}
        placeholderTextColor={
          isDark ? 'rgb(140, 140, 140)' : 'rgb(115, 115, 115)'
        }
        {...props}
      />
      {error && (
        <Text className="mt-1 text-sm text-error-500">{error}</Text>
      )}
    </View>
  );
}
