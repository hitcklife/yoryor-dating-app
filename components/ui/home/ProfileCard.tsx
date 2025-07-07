import React, { useEffect, useRef } from 'react';
import { StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator, Animated, Dimensions, View } from 'react-native';
import { Box, Text, HStack, VStack, Heading, Badge, BadgeText, Divider } from '@gluestack-ui/themed';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { PotentialMatch } from '@/services/matches-service';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CARD_HEIGHT = screenHeight * 0.65; // 65% of screen height
const IMAGE_HEIGHT = CARD_HEIGHT * 0.75; // 75% of card height for image

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

// Styles for stamp overlays
const styles = StyleSheet.create({
  stamp: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    marginTop: -50,
    marginLeft: -75,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 6,
    borderRadius: 10,
    transform: [{ rotate: '-20deg' }],
    zIndex: 9999,
    width: 200,
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

// Skeleton Loading Component
const SkeletonLoader = () => {
  const shimmerTranslateX = useRef(new Animated.Value(-screenWidth)).current;

  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.timing(shimmerTranslateX, {
        toValue: screenWidth,
        duration: 1500,
        useNativeDriver: true,
      })
    );
    shimmerAnimation.start();

    return () => shimmerAnimation.stop();
  }, [shimmerTranslateX]);

  const SkeletonBox = ({ width, height, borderRadius = 8, mb = 0 }: { width: any, height: number, borderRadius?: number, mb?: number }) => (
    <View
      style={{
        width,
        height,
        backgroundColor: '#E8D5E8', // Light purple base
        borderRadius,
        marginBottom: mb,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          transform: [{ translateX: shimmerTranslateX }],
        }}
      >
        <LinearGradient
          colors={[
            'transparent',              // Fully transparent left edge
            'rgba(139, 92, 246, 0.05)', // Very faint purple
            'rgba(139, 92, 246, 0.2)',  // Light purple
            'rgba(139, 92, 246, 0.4)',  // Bright purple center
            'rgba(139, 92, 246, 0.2)',  // Light purple
            'rgba(139, 92, 246, 0.05)', // Very faint purple
            'transparent'               // Fully transparent right edge
          ]}
          locations={[0, 0.1, 0.3, 0.5, 0.7, 0.9, 1]}
          start={[0, 0]}
          end={[1, 0]}
          style={{
            width: screenWidth,
            height: '100%',
          }}
        />
      </Animated.View>
    </View>
  );

  return (
    <Box
      width="100%"
      height={CARD_HEIGHT}
      position="relative"
    >
      <Box
        bg="#FFFFFF"
        borderRadius="$3xl"
        borderWidth="$0"
        overflow="hidden"
        shadowColor="#000"
        shadowOffset={{ width: 0, height: 12 }}
        shadowOpacity={0.25}
        shadowRadius={25}
        elevation={15}
        width="100%"
        height="100%"
        style={{
          backgroundColor: '#FFFFFF',
          borderWidth: 1,
          borderColor: 'rgba(255, 107, 157, 0.1)',
        }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ backgroundColor: '#FFFFFF', width: '100%', height: '100%' }}
          contentContainerStyle={{ backgroundColor: '#FFFFFF', paddingBottom: 20 }}
        >
          {/* Main Profile Image Skeleton */}
          <Box width="100%" height={IMAGE_HEIGHT} position="relative">
            <SkeletonBox width="100%" height={IMAGE_HEIGHT} borderRadius={24} />
            
            {/* Profile Name and Age Skeleton */}
            <Box position="absolute" bottom="$6" left="$6" right="$6">
              <SkeletonBox width="70%" height={32} borderRadius={16} mb={8} />
              <SkeletonBox width="50%" height={20} borderRadius={10} />
            </Box>
          </Box>

          {/* Profile Information Skeleton */}
          <Box p="$6" bg="#FFFFFF">
            {/* About Section Skeleton */}
            <Box mb="$6">
              <HStack space="sm" alignItems="center" mb="$4">
                <SkeletonBox width={24} height={24} borderRadius={12} />
                <SkeletonBox width={100} height={24} borderRadius={12} />
              </HStack>
              <Box 
                bg="#F8F9FA" 
                borderRadius="$2xl" 
                p="$4"
                borderWidth={1}
                borderColor="#E2E8F0"
              >
                <SkeletonBox width="100%" height={20} borderRadius={10} mb={8} />
                <SkeletonBox width="90%" height={20} borderRadius={10} mb={8} />
                <SkeletonBox width="70%" height={20} borderRadius={10} />
              </Box>
            </Box>

            <Divider bg="#E2E8F0" mb="$6" />

            {/* Basic Information Skeleton */}
            <Box mb="$6">
              <HStack space="sm" alignItems="center" mb="$4">
                <SkeletonBox width={24} height={24} borderRadius={12} />
                <SkeletonBox width={140} height={24} borderRadius={12} />
              </HStack>
              <Box 
                bg="#F8F9FA" 
                borderRadius="$2xl" 
                p="$4"
                borderWidth={1}
                borderColor="#E2E8F0"
              >
                <VStack space="lg">
                  {[...Array(6)].map((_, index) => (
                    <HStack key={index} justifyContent="space-between" alignItems="center">
                      <SkeletonBox width={80} height={20} borderRadius={10} />
                      <SkeletonBox width={120} height={20} borderRadius={10} />
                    </HStack>
                  ))}
                </VStack>
              </Box>
            </Box>

            <Divider bg="#E2E8F0" mb="$6" />

            {/* Interests Skeleton */}
            <Box mb="$6">
              <HStack space="sm" alignItems="center" mb="$4">
                <SkeletonBox width={24} height={24} borderRadius={12} />
                <SkeletonBox width={80} height={24} borderRadius={12} />
              </HStack>
              <HStack space="sm" flexWrap="wrap">
                {[...Array(6)].map((_, index) => (
                  <SkeletonBox 
                    key={index} 
                    width={Math.random() * 60 + 80} 
                    height={32} 
                    borderRadius={16} 
                    mb={8} 
                  />
                ))}
              </HStack>
            </Box>

            <Divider bg="#E2E8F0" mb="$6" />

            {/* Additional Photos Skeleton */}
            <Box mb="$8">
              <HStack space="sm" alignItems="center" mb="$4">
                <SkeletonBox width={24} height={24} borderRadius={12} />
                <SkeletonBox width={100} height={24} borderRadius={12} />
              </HStack>
              <HStack space="sm" flexWrap="wrap">
                {[...Array(4)].map((_, index) => (
                  <Box key={index} width="48%" mb="$3">
                    <SkeletonBox width="100%" height={128} borderRadius={16} />
                  </Box>
                ))}
              </HStack>
            </Box>
          </Box>
        </ScrollView>
      </Box>
    </Box>
  );
};

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
  // Show skeleton loader when loading
  if (isLoading) {
    return <SkeletonLoader />;
  }

  // Check if user is private
  const isPrivateUser = profileDetails.photos.some(photo => photo.attributes.is_private === true);

  // Get current match photos for gallery (use medium_url for display, original_url for opening)
  const getCurrentMatchPhotos = () => {
    const { photos } = profileDetails;

    return photos.map(photo => {
      // Use medium_url for gallery display (faster loading)
      const photoUrl = photo.attributes.medium_url || photo.attributes.original_url;
      // Always use AWS links now
      return photoUrl;
    });
  };

  // Get original photo URLs for opening in modal
  const getOriginalPhotoUrls = () => {
    const { photos } = profileDetails;

    return photos.map(photo => {
      // Always use original_url for opening photos
      return photo.attributes.original_url;
    });
  };

  // Get main profile photo using original_url
  const getMainProfilePhoto = () => {
    if (!currentMatch) return null;
    
    // Use original_url for main photo
    const mainPhoto = profileDetails.photos.find(photo => photo.attributes.is_main === true) || profileDetails.photos[0];
    return mainPhoto ? mainPhoto.attributes.original_url : getProfilePhotoUrl(currentMatch);
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

  return (
    <Box
      width="100%"
      height={CARD_HEIGHT}
      position="relative"
    >
      <Animated.View
        style={cardPosition ? {
          flex: 1,
          transform: [{ translateX: cardPosition }]
        } : {
          flex: 1
        }}
      >
        {/* Render stamps */}
        {renderStamps()}

        <Box
          bg="#FFFFFF"
          borderRadius="$3xl"
          borderWidth="$0"
          overflow="hidden"
          shadowColor="#000"
          shadowOffset={{ width: 0, height: 12 }}
          shadowOpacity={0.25}
          shadowRadius={25}
          elevation={15}
          width="100%"
          height="100%"
          style={{
            backgroundColor: '#FFFFFF',
            borderWidth: 1,
            borderColor: 'rgba(255, 107, 157, 0.1)',
          }}
        >
          {/* Scrollable Content */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ backgroundColor: '#FFFFFF', width: '100%', height: '100%' }}
            contentContainerStyle={{ backgroundColor: '#FFFFFF', paddingBottom: 20 }}
          >
            {/* Main Profile Image */}
            <Box width="100%" height={IMAGE_HEIGHT} position="relative">
              {currentMatch ? (
                <TouchableOpacity
                  onPress={() => {
                    const mainPhotoOriginal = getMainProfilePhoto();
                    if (mainPhotoOriginal) {
                      onPhotoPress(mainPhotoOriginal); // Use original URL for opening main photo
                    }
                  }}
                  style={{ width: '100%', height: '100%' }}
                >
                  <Box position="relative" width="100%" height="100%">
                    <Image
                      source={{
                        uri: getMainProfilePhoto() ||
                             "https://via.placeholder.com/400x600?text=No+Photo"
                      }}
                      style={{
                        width: '100%',
                        height: '100%',
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                        ...(isPrivateUser && { opacity: 0.3 })
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
                      borderTopLeftRadius={24}
                      borderTopRightRadius={24}
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
                        style={{
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.25,
                          shadowRadius: 3,
                          elevation: 5,
                        }}
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

                  {/* Enhanced gradient overlay with multiple stops */}
                  <LinearGradient
                    colors={[
                      'transparent',
                      'rgba(0,0,0,0.1)',
                      'rgba(0,0,0,0.4)',
                      'rgba(0,0,0,0.8)',
                      'rgba(0,0,0,0.95)'
                    ]}
                    locations={[0, 0.3, 0.6, 0.8, 1]}
                    start={[0, 0]}
                    end={[0, 1]}
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 200,
                    }}
                  />

                  {/* Profile Name and Age with improved styling */}
                  <Box position="absolute" bottom="$6" left="$6" right="$6">
                    {hasError ? (
                      <VStack space="sm" alignItems="center">
                        <Ionicons name="sad-outline" size={32} color="#ffffff" />
                        <Text size="lg" color="$white" fontWeight="$medium" textAlign="center">
                          Error loading matches. Please try again.
                        </Text>
                      </VStack>
                    ) : currentMatch ? (
                      <>
                        <Heading 
                          size="3xl" 
                          color="$white" 
                          mb="$3" 
                          fontWeight="$bold"
                          style={{
                            textShadowColor: 'rgba(0, 0, 0, 0.8)',
                            textShadowOffset: { width: 0, height: 2 },
                            textShadowRadius: 4,
                          }}
                        >
                          {currentMatch?.attributes.full_name}, {currentMatch?.attributes.age}
                        </Heading>
                        <HStack space="md" alignItems="center">
                          <HStack space="xs" alignItems="center">
                            <Ionicons name="location" size={16} color="#ffffff" />
                            <Text 
                              size="md" 
                              color="$white" 
                              fontWeight="$medium"
                              style={{
                                textShadowColor: 'rgba(0, 0, 0, 0.6)',
                                textShadowOffset: { width: 0, height: 1 },
                                textShadowRadius: 2,
                              }}
                            >
                              {profileDetails.profile?.attributes.city}, {profileDetails.profile?.attributes.state}
                              {profileDetails.country && `, ${profileDetails.country.attributes.name} ${profileDetails.country.attributes.flag}`}
                            </Text>
                          </HStack>
                        </HStack>
                      </>
                    ) : (
                      <VStack space="sm" alignItems="center">
                        <Ionicons name="heart-outline" size={32} color="#ffffff" />
                        <Text size="lg" color="$white" fontWeight="$medium" textAlign="center">
                          No matches available
                        </Text>
                      </VStack>
                    )}
                  </Box>
                </Box>
              </TouchableOpacity>
              ) : (
                <Box position="relative" width="100%" height="100%">
                  <Image
                    source={{ uri: "https://via.placeholder.com/400x600?text=No+Photo" }}
                    style={{ 
                      width: '100%', 
                      height: '100%', 
                      borderTopLeftRadius: 24,
                      borderTopRightRadius: 24 
                    }}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                    start={[0, 0]}
                    end={[0, 1]}
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 120,
                    }}
                  />
                </Box>
              )}
            </Box>

            {/* Profile Information with improved spacing and styling */}
            <Box p="$6" bg="#FFFFFF">
              {/* About Section */}
              <Box mb="$6">
                <HStack space="sm" alignItems="center" mb="$4">
                  <Ionicons name="person-outline" size={20} color="#FF6B9D" />
                  <Heading size="xl" color="#2D3748" fontWeight="$bold">
                    About Me
                  </Heading>
                </HStack>
                {currentMatch ? (
                  <Box 
                    bg="#F8F9FA" 
                    borderRadius="$2xl" 
                    p="$4"
                    borderWidth={1}
                    borderColor="#E2E8F0"
                  >
                    <Text size="md" color="#4A5568" lineHeight="$xl" fontWeight="$normal">
                      {profileDetails.profile?.attributes.bio || "No bio available"}
                    </Text>
                  </Box>
                ) : (
                  <Text size="md" color="#4A5568" lineHeight="$lg" fontWeight="$normal">
                    No profile information available
                  </Text>
                )}
              </Box>

              <Divider bg="#E2E8F0" mb="$6" />

              {/* Basic Information */}
              <Box mb="$6">
                <HStack space="sm" alignItems="center" mb="$4">
                  <Ionicons name="information-circle-outline" size={20} color="#FF6B9D" />
                  <Heading size="xl" color="#2D3748" fontWeight="$bold">
                    Basic Information
                  </Heading>
                </HStack>
                {currentMatch ? (
                  <Box 
                    bg="#F8F9FA" 
                    borderRadius="$2xl" 
                    p="$4"
                    borderWidth={1}
                    borderColor="#E2E8F0"
                  >
                    <VStack space="lg">
                      <HStack justifyContent="space-between" alignItems="center">
                        <HStack space="sm" alignItems="center">
                          <Text fontSize="$md">💼</Text>
                          <Text size="md" color="#718096" fontWeight="$medium">Profession</Text>
                        </HStack>
                        <Text size="md" color="#2D3748" fontWeight="$semibold">
                          {profileDetails.profile?.attributes.profession || "Not specified"}
                        </Text>
                      </HStack>
                      <HStack justifyContent="space-between" alignItems="center">
                        <HStack space="sm" alignItems="center">
                          <Text fontSize="$md">🌍</Text>
                          <Text size="md" color="#718096" fontWeight="$medium">Location</Text>
                        </HStack>
                        <Text size="md" color="#2D3748" fontWeight="$semibold" textAlign="right" flex={1} ml="$2">
                          {profileDetails.profile?.attributes.city}, {profileDetails.profile?.attributes.state}
                          {profileDetails.country && `, ${profileDetails.country.attributes.name} ${profileDetails.country.attributes.flag}`}
                        </Text>
                      </HStack>
                      <HStack justifyContent="space-between" alignItems="center">
                        <HStack space="sm" alignItems="center">
                          <Text fontSize="$md">👤</Text>
                          <Text size="md" color="#718096" fontWeight="$medium">Gender</Text>
                        </HStack>
                        <Text size="md" color="#2D3748" fontWeight="$semibold">
                          {profileDetails.profile?.attributes.gender ?
                            profileDetails.profile?.attributes.gender.charAt(0).toUpperCase() +
                            profileDetails.profile?.attributes.gender.slice(1) :
                            "Not specified"}
                        </Text>
                      </HStack>
                      <HStack justifyContent="space-between" alignItems="center">
                        <HStack space="sm" alignItems="center">
                          <Text fontSize="$md">🎂</Text>
                          <Text size="md" color="#718096" fontWeight="$medium">Age</Text>
                        </HStack>
                        <Text size="md" color="#2D3748" fontWeight="$semibold">
                          {currentMatch?.attributes.age || "Not specified"}
                        </Text>
                      </HStack>
                      <HStack justifyContent="space-between" alignItems="center">
                        <HStack space="sm" alignItems="center">
                          <Text fontSize="$md">💕</Text>
                          <Text size="md" color="#718096" fontWeight="$medium">Looking for</Text>
                        </HStack>
                        <Text size="md" color="#2D3748" fontWeight="$semibold">
                          {profileDetails.profile?.attributes.looking_for ||
                           profileDetails.profile?.attributes.relationship_type ||
                           "Not specified"}
                        </Text>
                      </HStack>
                      <HStack justifyContent="space-between" alignItems="center">
                        <HStack space="sm" alignItems="center">
                          <Text fontSize="$md">💍</Text>
                          <Text size="md" color="#718096" fontWeight="$medium">Status</Text>
                        </HStack>
                        <Text size="md" color="#2D3748" fontWeight="$semibold">
                          {profileDetails.profile?.attributes.relationship_status ||
                           profileDetails.profile?.attributes.marital_status ||
                           "Single"}
                        </Text>
                      </HStack>
                    </VStack>
                  </Box>
                ) : (
                  <Text size="md" color="#4A5568">
                    No information available
                  </Text>
                )}
              </Box>

              <Divider bg="#E2E8F0" mb="$6" />

              {/* Interests */}
              <Box mb="$6">
                <HStack space="sm" alignItems="center" mb="$4">
                  <Ionicons name="heart-outline" size={20} color="#FF6B9D" />
                  <Heading size="xl" color="#2D3748" fontWeight="$bold">
                    Interests
                  </Heading>
                </HStack>
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
                          style={{
                            shadowColor: '#FF6B9D',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.1,
                            shadowRadius: 2,
                            elevation: 2,
                          }}
                        >
                          <BadgeText color="#FF6B9D" fontWeight="$semibold" fontSize="$sm">
                            {getInterestEmoji(interest)} {interest.charAt(0).toUpperCase() + interest.slice(1)}
                          </BadgeText>
                        </Badge>
                      );
                    })}
                  </HStack>
                ) : (
                  <Text size="md" color="#4A5568">
                    No interests specified
                  </Text>
                )}
              </Box>

              <Divider bg="#E2E8F0" mb="$6" />

              {/* Additional Photos */}
              <Box mb="$8">
                <HStack space="sm" alignItems="center" mb="$4">
                  <Ionicons name="images-outline" size={20} color="#FF6B9D" />
                  <Heading size="xl" color="#2D3748" fontWeight="$bold">
                    More Photos
                  </Heading>
                </HStack>
                {currentMatch && profileDetails.photos.length > 0 ? (
                  <HStack space="sm" flexWrap="wrap">
                    {getCurrentMatchPhotos().map((photo, index) => {
                      const originalPhotoUrls = getOriginalPhotoUrls();
                      return (
                        <TouchableOpacity
                          key={index}
                          onPress={() => onPhotoPress(originalPhotoUrls[index])} // Use original URL for opening
                          style={{ width: '48%', marginBottom: 12 }}
                        >
                                                  <Box
                          width="100%"
                          height="$32"
                          borderRadius="$2xl"
                          overflow="hidden"
                          shadowColor="#000"
                          shadowOffset={{ width: 0, height: 6 }}
                          shadowOpacity={0.15}
                          shadowRadius={10}
                          elevation={6}
                          position="relative"
                          borderWidth={1}
                          borderColor="rgba(255, 107, 157, 0.1)"
                        >
                            <Image
                              source={{ uri: photo }} // Use medium URL for display
                              style={{
                                width: '100%',
                                height: '100%',
                                ...(isPrivateUser && { opacity: 0.3 })
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
                      );
                    })}
                  </HStack>
                ) : (
                  <Text size="md" color="#4A5568">
                    No additional photos available
                  </Text>
                )}
              </Box>
            </Box>
          </ScrollView>
        </Box>
      </Animated.View>
    </Box>
  );
};

export default ProfileCard;
