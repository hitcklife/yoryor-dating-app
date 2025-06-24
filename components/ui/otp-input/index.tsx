import React, { useRef, useState, useEffect } from 'react';
import { TextInput as RNTextInput, Keyboard } from 'react-native';
import {
  Box,
  HStack,
  Input,
  InputField,
  useToken
} from '@gluestack-ui/themed';

interface OTPInputProps {
  length: number;
  value: string;
  onChange: (value: string) => void;
  isInvalid?: boolean;
  isDisabled?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function OTPInput({
  length = 4,
  value,
  onChange,
  isInvalid = false,
  isDisabled = false,
  size = 'lg'
}: OTPInputProps) {
  const inputRefs = useRef<Array<RNTextInput | null>>([]);
  const [localValue, setLocalValue] = useState<string[]>(
    value.split('').concat(Array(length - value.length).fill(''))
  );
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  // Get theme tokens
  const primary500 = useToken('colors', 'primary500');
  const primary600 = useToken('colors', 'primary600');
  const error500 = useToken('colors', 'error500');
  const borderLight300 = useToken('colors', 'borderLight300');
  const backgroundLight0 = useToken('colors', 'backgroundLight0');

  useEffect(() => {
    // Update local state when value prop changes
    setLocalValue(value.split('').concat(Array(length - value.length).fill('')));
  }, [value, length]);

  const handleChange = (text: string, index: number) => {
    const newValue = [...localValue];
    newValue[index] = text;
    setLocalValue(newValue);

    // Notify parent component
    onChange(newValue.join(''));

    // Auto-focus next input if value is entered
    if (text && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    // Move to previous input on backspace if current input is empty
    if (e.nativeEvent.key === 'Backspace' && !localValue[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (text: string) => {
    // Handle paste of the entire OTP
    if (text.length <= length) {
      const newValue = text.split('').concat(Array(length - text.length).fill(''));
      setLocalValue(newValue);
      onChange(text);

      // Focus the next empty input or the last one
      const focusIndex = Math.min(text.length, length - 1);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  const handleFocus = (index: number) => {
    setFocusedIndex(index);
  };

  const handleBlur = () => {
    setFocusedIndex(null);
  };

  // Size configurations
  const sizeConfig = {
    sm: { size: '$12', fontSize: '$lg' },
    md: { size: '$14', fontSize: '$xl' },
    lg: { size: '$16', fontSize: '$2xl' },
    xl: { size: '$20', fontSize: '$3xl' }
  };

  const currentSize = sizeConfig[size];

  return (
    <HStack space="md" justifyContent="center" alignItems="center">
      {Array(length)
        .fill(0)
        .map((_, index) => {
          const isFocused = focusedIndex === index;
          const hasValue = localValue[index] !== '';
          const shouldShowError = isInvalid && !isFocused;

          return (
            <Box key={index} position="relative">
              <Input
                variant="outline"
                size={size}
                isInvalid={shouldShowError}
                isDisabled={isDisabled}
                w={currentSize.size}
                h={currentSize.size}
                borderRadius="$xl"
                borderWidth="$2"
                bg="$backgroundLight0"
                borderColor={
                  shouldShowError
                    ? "$error500"
                    : isFocused
                      ? "$primary600"
                      : hasValue
                        ? "$primary500"
                        : "$borderLight300"
                }
                shadowColor="$backgroundLight900"
                shadowOffset={{ width: 0, height: 2 }}
                shadowOpacity={0.1}
                shadowRadius={4}
                elevation={3}
                $focus={{
                  borderColor: "$primary600",
                  shadowColor: "$primary600",
                  shadowOpacity: 0.2,
                  shadowRadius: 6,
                }}
                $invalid={{
                  borderColor: "$error500",
                  shadowColor: "$error500",
                  shadowOpacity: 0.15,
                }}
              >
                <InputField
                  ref={(ref) => (inputRefs.current[index] = ref)}
                  value={localValue[index]}
                  onChangeText={(text) => handleChange(text.slice(-1), index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  onPaste={(e) => handlePaste((e as any).nativeEvent.text)}
                  onFocus={() => handleFocus(index)}
                  onBlur={handleBlur}
                  keyboardType="number-pad"
                  maxLength={1}
                  textAlign="center"
                  fontSize={currentSize.fontSize}
                  fontWeight="$bold"
                  color="$textLight900"
                  selectTextOnFocus
                  returnKeyType="next"
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  placeholder=""
                  placeholderTextColor="$textLight400"
                  $focus={{
                    color: "$primary700",
                  }}
                  $invalid={{
                    color: "$error700",
                  }}
                />
              </Input>

              {/* Focus indicator dot */}
              {isFocused && (
                <Box
                  position="absolute"
                  bottom="$-2"
                  left="50%"
                  w="$1"
                  h="$1"
                  bg="$primary600"
                  rounded="$full"
                  transform={[{ translateX: -2 }]}
                />
              )}
            </Box>
          );
        })}
    </HStack>
  );
}
