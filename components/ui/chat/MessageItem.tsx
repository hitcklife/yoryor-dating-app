import React from 'react';
import { Box, Text, HStack, VStack } from '@gluestack-ui/themed';
import { Message } from '@/services/chats-service';
import { format } from 'date-fns';

interface MessageItemProps {
  message: Message;
  isOwn: boolean;
  isDark: boolean;
}

export default function MessageItem({ message, isOwn, isDark }: MessageItemProps) {
  const formatTime = (timestamp: string) => {
    return format(new Date(timestamp), 'HH:mm');
  };

  return (
    <Box mb="$3">
      <HStack
        justifyContent={isOwn ? "flex-end" : "flex-start"}
        alignItems="flex-end"
        space="xs"
      >
        <Box
          maxWidth="75%"
          bg={isOwn
            ? "$primary600"
            : isDark ? "$backgroundDark800" : "$backgroundLight100"
          }
          px="$3"
          py="$2"
          borderRadius="$lg"
          $style={{
            borderBottomRightRadius: isOwn ? 4 : 16,
            borderBottomLeftRadius: isOwn ? 16 : 4,
          }}
        >
          <Text
            color={isOwn
              ? "$white"
              : isDark ? "$textDark100" : "$textLight900"
            }
            fontSize="$sm"
            lineHeight="$sm"
          >
            {message.content}
          </Text>
        </Box>
      </HStack>

      <HStack
        justifyContent={isOwn ? "flex-end" : "flex-start"}
        mt="$1"
        px="$2"
      >
        <Text
          color={isDark ? "$textDark400" : "$textLight500"}
          fontSize="$xs"
        >
          {formatTime(message.sent_at || message.created_at)}
        </Text>
      </HStack>
    </Box>
  );
}
