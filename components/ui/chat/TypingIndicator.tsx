import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { Box, HStack, Text, Avatar, AvatarImage } from '@gluestack-ui/themed';
import { CachedImage } from '@/components/ui/CachedImage';

interface TypingIndicatorProps {
    typingUser?: string | null;
    userAvatar?: string;
    userName?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
                                                                    typingUser,
                                                                    userAvatar,
                                                                    userName
                                                                }) => {
    const dot1Animation = useRef(new Animated.Value(0.4)).current;
    const dot2Animation = useRef(new Animated.Value(0.4)).current;
    const dot3Animation = useRef(new Animated.Value(0.4)).current;

    useEffect(() => {
        const createPulseAnimation = (animatedValue: Animated.Value, delay: number) => {
            return Animated.loop(
                Animated.sequence([
                    Animated.timing(animatedValue, {
                        toValue: 1,
                        duration: 600,
                        delay,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: false,
                    }),
                    Animated.timing(animatedValue, {
                        toValue: 0.4,
                        duration: 600,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: false,
                    }),
                ])
            );
        };

        const dot1Anim = createPulseAnimation(dot1Animation, 0);
        const dot2Anim = createPulseAnimation(dot2Animation, 200);
        const dot3Anim = createPulseAnimation(dot3Animation, 400);

        dot1Anim.start();
        dot2Anim.start();
        dot3Anim.start();

        return () => {
            dot1Anim.stop();
            dot2Anim.stop();
            dot3Anim.stop();
        };
    }, []);

    const displayName = userName || typingUser;

    return (
        <Box
            bg="$backgroundLight50"
            $dark-bg="$backgroundDark900"
            px="$4"
            py="$3"
            borderTopWidth={1}
            borderTopColor="$borderLight100"
            $dark-borderTopColor="$borderDark800"
        >
            <HStack space="sm" alignItems="center">
                {userAvatar && (
                    <CachedImage
                        source={{ uri: userAvatar }}
                        style={{ width: 24, height: 24, borderRadius: 12 }}
                        type="profile"
                        userId={0} // We don't have user ID in typing indicator
                        fallbackSource={{ uri: "https://via.placeholder.com/24" }}
                    />
                )}

                <Box
                    bg="$backgroundLight200"
                    $dark-bg="$backgroundDark700"
                    borderRadius="$2xl"
                    px="$3"
                    py="$2.5"
                    shadowColor="$shadowColor"
                    shadowOffset={{ width: 0, height: 1 }}
                    shadowOpacity={0.1}
                    shadowRadius={2}
                    elevation={2}
                    borderWidth={1}
                    borderColor="$borderLight300"
                    $dark-borderColor="$borderDark600"
                >
                    <HStack space="sm" alignItems="center">
                        {/* Animated typing dots */}
                        <HStack space="xs" alignItems="center" pr="$1">
                            <Animated.View
                                style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: 3,
                                    backgroundColor: '#8B5CF6',
                                    opacity: dot1Animation,
                                }}
                            />
                            <Animated.View
                                style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: 3,
                                    backgroundColor: '#8B5CF6',
                                    opacity: dot2Animation,
                                }}
                            />
                            <Animated.View
                                style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: 3,
                                    backgroundColor: '#8B5CF6',
                                    opacity: dot3Animation,
                                }}
                            />
                        </HStack>

                        <Text
                            color="$textLight700"
                            $dark-color="$textDark200"
                            fontSize="$sm"
                            fontWeight="$medium"
                            fontStyle="italic"
                        >
                            typing...
                        </Text>
                    </HStack>
                </Box>
            </HStack>
        </Box>
    );
};
