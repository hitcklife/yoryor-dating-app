import React from 'react';
import { StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator, Animated } from 'react-native';
import { Box, Text, HStack, VStack, Heading, Badge, BadgeText, Divider } from '@gluestack-ui/themed';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { PotentialMatch } from '@/services/matches-service';

interface ProfileCardProps {
  isLoading: boolean;
  hasError: boolean;
  currentMatch: PotentialMatch | null;
  profileDetails: {
    profile: any;
    photos: any[];
    country?: any;
  };
  onPhotoPress: (photoUrl: string) => void;
  getProfilePhotoUrl: (match: PotentialMatch | null) => string | null;
  cardPosition?: Animated.Value | null;
  stampOpacity?: Animated.Value | null;
  showLikeStamp?: boolean;
  showDislikeStamp?: boolean;
}

const ProfileCard = ({
  isLoading,
  hasError,
  currentMatch,
  profileDetails,
  onPhotoPress,
  getProfilePhotoUrl,
  cardPosition,
  stampOpacity,
  showLikeStamp,
  showDislikeStamp,
}: ProfileCardProps) => {
  // Check if user is private
  const isPrivateUser = profileDetails.photos.some(photo => photo.attributes.is_private === true);

  // Get current match photos for gallery (optimized for faster loading)
  const getCurrentMatchPhotos = () => {
    const { photos } = profileDetails;

    return photos.map(photo => {
      // Use medium URL for faster loading, fallback to original if needed
      const photoUrl = photo.attributes.medium_url || photo.attributes.original_url;
      if (photoUrl.startsWith('http') || photoUrl.startsWith('https')) {
        return photoUrl;
      } else {
        return `https://incredibly-evident-hornet.ngrok-free.app${photoUrl}`;
      }
    });
  };

  // Render stamp overlays
  const renderStamps = () => {
    return (
      <>
        {/* Like Stamp */}
        {showLikeStamp && stampOpacity && (
          <Animated.View
            style={[
              styles.stamp,
              styles.likeStamp,
              { opacity: stampOpacity }
            ]}
          >
            <Text style={styles.stampText}>LIKE</Text>
          </Animated.View>
        )}

        {/* Dislike Stamp */}
        {showDislikeStamp && stampOpacity && (
          <Animated.View
            style={[
              styles.stamp,
              styles.dislikeStamp,
              { opacity: stampOpacity }
            ]}
          >
            <Text style={styles.stampText}>NOPE</Text>
          </Animated.View>
        )}
      </>
    );
  };

  // Create animated container style if cardPosition is provided
  const baseStyle = {
    width: '100%',
    height: '100%',
    position: 'relative' as const
  };

  const animatedStyle = cardPosition ? [
    baseStyle,
    { transform: [{ translateX: cardPosition }] }
  ] : baseStyle;

  // @ts-ignore
  return (
    <Animated.View style={animatedStyle}>
      {/* Render stamps */}
      {renderStamps()}

      <Box
        bg="#FDF7FD"
        borderRadius="$3xl"
        borderWidth="$0"
        overflow="hidden"
        shadowColor="#000"
        shadowOffset={{ width: 0, height: 8 }}
        shadowOpacity={0.15}
        shadowRadius={20}
        elevation={8}
        width="100%"
        height="100%"
      >
        {/* Scrollable Content */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ backgroundColor: '#FDF7FD', width: '100%', height: '100%' }}
          contentContainerStyle={{ backgroundColor: '#FDF7FD', paddingBottom: 80 }}
        >
          {/* Main Profile Image */}
          <Box width="100%" height={300} position="relative">
            {currentMatch ? (
              <Box position="relative" width="100%" height="100%">
                <Image
                  source={{
                    uri: getProfilePhotoUrl(currentMatch) ||
                         "https://via.placeholder.com/400x600?text=No+Photo"
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    borderRadius: 24,
                    ...(isPrivateUser && { opacity: 0.3 }) // Blur effect alternative for React Native
                  }}
                  resizeMode="cover"
                />

                {/* Blur overlay for private users */}
                {isPrivateUser && (
                  <Box
                    position="absolute"
                    top={0}
                    left={0}
                    right={0}
                    bottom={0}
                    bg="rgba(255, 255, 255, 0.7)"
                    borderRadius={24}
                  />
                )}

                {/* Private badge with lock icon */}
                {isPrivateUser && (
                  <Box position="absolute" top="$4" right="$4">
                    <Badge
                      bg="#FF4444"
                      borderRadius="$full"
                      px="$3"
                      py="$2"
                      alignItems="center"
                      justifyContent="center"
                    >
                      <HStack space="xs" alignItems="center">
                        <Ionicons name="lock-closed" size={12} color="white" />
                        <BadgeText color="white" fontWeight="$bold" fontSize="$xs">
                          PRIVATE
                        </BadgeText>
                      </HStack>
                    </Badge>
                  </Box>
                )}
              </Box>
            ) : (
              <Image
                source={{ uri: "https://via.placeholder.com/400x600?text=No+Photo" }}
                style={{ width: '100%', height: '100%', borderRadius: 24 }}
                resizeMode="cover"
              />
            )}

            {/* Gradient Overlay for text visibility */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.8)']}
              start={[0, 0]}
              end={[0, 1]}
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 160,
                borderBottomLeftRadius: 24,
                borderBottomRightRadius: 24,
              }}
            />

            {/* Profile Name and Age */}
            <Box position="absolute" bottom="$6" left="$6" right="$6">
              {isLoading && !currentMatch ? (
                <HStack space="md" alignItems="center">
                  <ActivityIndicator color="#ffffff" />
                  <Text size="md" color="$white" fontWeight="$medium">
                    Loading matches...
                  </Text>
                </HStack>
              ) : hasError ? (
                <Text size="md" color="$white" fontWeight="$medium">
                  Error loading matches. Please try again.
                </Text>
              ) : currentMatch ? (
                <>
                  <Heading size="2xl" color="$white" mb="$2" fontWeight="$bold">
                    {currentMatch?.attributes.full_name}, {currentMatch?.attributes.age}
                  </Heading>
                  <HStack space="md" alignItems="center">
                    <Text size="md" color="$white" fontWeight="$medium">
                      📍 {profileDetails.profile?.attributes.city}, {profileDetails.profile?.attributes.state}
                      {profileDetails.country && `, ${profileDetails.country.attributes.name} ${profileDetails.country.attributes.flag}`}
                    </Text>
                  </HStack>
                </>
              ) : (
                <Text size="md" color="$white" fontWeight="$medium">
                  No matches available
                </Text>
              )}
            </Box>
          </Box>

          {/* Profile Information */}
          <Box p="$6" bg="#FDF7FD">
            {/* About Section */}
            <Box mb="$6">
              <Heading size="lg" color="#2D3748" mb="$3" fontWeight="$bold">
                About Me
              </Heading>
              {currentMatch ? (
                <Text size="md" color="#4A5568" lineHeight="$lg" fontWeight="$normal">
                  {profileDetails.profile?.attributes.bio || "No bio available"}
                </Text>
              ) : (
                <Text size="md" color="#4A5568" lineHeight="$lg" fontWeight="$normal">
                  {isLoading ? "Loading..." : "No profile information available"}
                </Text>
              )}
            </Box>

            <Divider bg="#E2E8F0" mb="$6" />

            {/* Basic Information */}
            <Box mb="$6">
              <Heading size="lg" color="#2D3748" mb="$4" fontWeight="$bold">
                Basic Information
              </Heading>
              {currentMatch ? (
                <VStack space="lg">
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text size="md" color="#718096" fontWeight="$medium">💼 Profession</Text>
                    <Text size="md" color="#2D3748" fontWeight="$semibold">
                      {profileDetails.profile?.attributes.profession || "Not specified"}
                    </Text>
                  </HStack>
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text size="md" color="#718096" fontWeight="$medium">🌍 Location</Text>
                    <Text size="md" color="#2D3748" fontWeight="$semibold">
                      {profileDetails.profile?.attributes.city}, {profileDetails.profile?.attributes.state}
                      {profileDetails.country && `, ${profileDetails.country.attributes.name} ${profileDetails.country.attributes.flag}`}
                    </Text>
                  </HStack>
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text size="md" color="#718096" fontWeight="$medium">👤 Gender</Text>
                    <Text size="md" color="#2D3748" fontWeight="$semibold">
                      {profileDetails.profile?.attributes.gender ?
                        profileDetails.profile?.attributes.gender.charAt(0).toUpperCase() +
                        profileDetails.profile?.attributes.gender.slice(1) :
                        "Not specified"}
                    </Text>
                  </HStack>
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text size="md" color="#718096" fontWeight="$medium">🎂 Age</Text>
                    <Text size="md" color="#2D3748" fontWeight="$semibold">
                      {currentMatch?.attributes.age || "Not specified"}
                    </Text>
                  </HStack>
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text size="md" color="#718096" fontWeight="$medium">💕 Looking for</Text>
                    <Text size="md" color="#2D3748" fontWeight="$semibold">
                      {profileDetails.profile?.attributes.looking_for ||
                       profileDetails.profile?.attributes.relationship_type ||
                       "Not specified"}
                    </Text>
                  </HStack>
                  <HStack justifyContent="space-between" alignItems="center">
                    <Text size="md" color="#718096" fontWeight="$medium">💍 Status</Text>
                    <Text size="md" color="#2D3748" fontWeight="$semibold">
                      {profileDetails.profile?.attributes.relationship_status ||
                       profileDetails.profile?.attributes.marital_status ||
                       "Single"}
                    </Text>
                  </HStack>
                </VStack>
              ) : (
                <Text size="md" color="#4A5568">
                  {isLoading ? "Loading..." : "No information available"}
                </Text>
              )}
            </Box>

            <Divider bg="#E2E8F0" mb="$6" />

            {/* Interests */}
            <Box mb="$6">
              <Heading size="lg" color="#2D3748" mb="$4" fontWeight="$bold">
                Interests
              </Heading>
              {currentMatch && profileDetails.profile?.attributes.interests?.length > 0 ? (
                <HStack space="sm" flexWrap="wrap">
                  {profileDetails.profile?.attributes.interests.map((interest: string, index: number) => {
                    // Map common interests to emojis
                    const getInterestEmoji = (interest: string) => {
                      const emojiMap: {[key: string]: string} = {
                        'photography': '📸',
                        'hiking': '🥾',
                        'cooking': '🍳',
                        'travel': '✈️',
                        'art': '🎨',
                        'music': '🎵',
                        'reading': '📚',
                        'sports': '🏀',
                        'movies': '🎬',
                        'dancing': '💃',
                        'gaming': '🎮',
                        'technology': '💻',
                        'fitness': '💪',
                        'yoga': '🧘',
                        'fashion': '👗',
                        'food': '🍔',
                        'nature': '🌿',
                        'animals': '🐾',
                        'writing': '✍️',
                        'gardening': '🌱'
                      };

                      const lowerInterest = interest.toLowerCase();
                      return emojiMap[lowerInterest] || '🌟';
                    };

                    return (
                      <Badge
                        key={index}
                        variant="outline"
                        size="md"
                        mb="$3"
                        mr="$2"
                        borderColor="#FF6B9D"
                        bg="#FFF0F5"
                        borderRadius="$full"
                        px="$4"
                        py="$2"
                      >
                        <BadgeText color="#FF6B9D" fontWeight="$medium" fontSize="$sm">
                          {getInterestEmoji(interest)} {interest.charAt(0).toUpperCase() + interest.slice(1)}
                        </BadgeText>
                      </Badge>
                    );
                  })}
                </HStack>
              ) : (
                <Text size="md" color="#4A5568">
                  {isLoading ? "Loading..." : "No interests specified"}
                </Text>
              )}
            </Box>

            <Divider bg="#E2E8F0" mb="$6" />

            {/* Additional Photos */}
            <Box mb="$8">
              <Heading size="lg" color="#2D3748" mb="$4" fontWeight="$bold">
                More Photos
              </Heading>
              {currentMatch && profileDetails.photos.length > 0 ? (
                <HStack space="sm" flexWrap="wrap">
                  {getCurrentMatchPhotos().map((photo, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => onPhotoPress(photo)}
                      style={{ width: '48%', marginBottom: 12 }}
                    >
                      <Box
                        width="100%"
                        height="$48"
                        borderRadius="$2xl"
                        overflow="hidden"
                        shadowColor="#000"
                        shadowOffset={{ width: 0, height: 4 }}
                        shadowOpacity={0.1}
                        shadowRadius={8}
                        elevation={3}
                        position="relative"
                      >
                        <Image
                          source={{ uri: photo }}
                          style={{
                            width: '100%',
                            height: '100%',
                            ...(isPrivateUser && { opacity: 0.3 }) // Blur effect for gallery images
                          }}
                          resizeMode="cover"
                        />

                        {/* Blur overlay for private gallery images */}
                        {isPrivateUser && (
                          <Box
                            position="absolute"
                            top={0}
                            left={0}
                            right={0}
                            bottom={0}
                            bg="rgba(255, 255, 255, 0.7)"
                            borderRadius="$2xl"
                            alignItems="center"
                            justifyContent="center"
                          >
                            <Ionicons name="lock-closed" size={24} color="#666" />
                          </Box>
                        )}
                      </Box>
                    </TouchableOpacity>
                  ))}
                </HStack>
              ) : (
                <Text size="md" color="#4A5568">
                  {isLoading ? "Loading..." : "No additional photos available"}
                </Text>
              )}
            </Box>
          </Box>
        </ScrollView>
      </Box>
    </Animated.View>
  );
};

// Styles for stamp overlays
const styles = StyleSheet.create({
  stamp: {
    position: 'absolute',
    top: '40%', // Position in the middle of the card
    left: '50%',
    marginTop: -50, // Half of the height to center it vertically
    marginLeft: -75, // Half of the width to center it horizontally
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 6,
    borderRadius: 10,
    transform: [{ rotate: '-20deg' }],
    zIndex: 9999, // Ensure it's above everything else
    width: 200, // Make it larger
  },
  likeStamp: {
    borderColor: '#00E878',
    backgroundColor: 'rgba(0, 232, 120, 0.8)',
  },
  dislikeStamp: {
    borderColor: '#FF4458',
    backgroundColor: 'rgba(255, 68, 88, 0.8)',
  },
  stampText: {
    fontSize: 40,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
  },
});

export default ProfileCard;
