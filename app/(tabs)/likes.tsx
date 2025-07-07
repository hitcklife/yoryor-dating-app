import React, { useState, useEffect, useCallback, useRef } from "react";
import { TouchableOpacity, Image as RNImage, ActivityIndicator, RefreshControl, Animated, Dimensions, View } from "react-native";
import {
  Box,
  Text,
  VStack,
  HStack,
  Pressable,
  Image,
  Button,
  ButtonText,
  ScrollView,
  Divider,
  Avatar,
  AvatarImage,
} from "@gluestack-ui/themed";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { likesService, Like, Match, getProfilePhotoUrl } from "@/services/likes-service";
import MatchModal from "@/components/ui/home/MatchModal";

const { width: screenWidth } = Dimensions.get('window');

// Define a common interface for both likes and matches
type UserItem = Like | Match;

// Define the match data structure that MatchModal expects
interface MatchData {
  like: {
    user_id: number;
    liked_user_id: string;
    updated_at: string;
    created_at: string;
    id: number;
  };
  is_match: boolean;
  match: {
    user_id: number;
    matched_user_id: string;
    updated_at: string;
    created_at: string;
    id: number;
  };
  chat: {
    type: string;
    is_active: boolean;
    last_activity_at: string;
    updated_at: string;
    created_at: string;
    id: number;
  };
  liked_user: {
    type: string;
    id: string;
    attributes: {
      email: string;
      phone: string;
      profile_photo_path: string;
      registration_completed: boolean;
      is_private: boolean;
      created_at: string;
      updated_at: string;
      age: number;
      full_name: string;
      is_online: boolean;
      last_active_at: string;
    };
    included: Array<{
      type: string;
      id: string;
      attributes: any;
    }>;
  };
}

// Skeleton Loading Component
const SkeletonLoader = ({ count = 5 }: { count?: number }) => {
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
        backgroundColor: '#F8E7F8', // Light purple base
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
            'transparent',                 // Fully transparent left edge
            'rgba(255, 107, 157, 0.05)',   // Very faint pink
            'rgba(255, 107, 157, 0.2)',    // Light pink
            'rgba(255, 107, 157, 0.4)',    // Bright pink center
            'rgba(255, 107, 157, 0.2)',    // Light pink
            'rgba(255, 107, 157, 0.05)',   // Very faint pink
            'transparent'                  // Fully transparent right edge
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
    <VStack space="sm" pb="$6">
      {[...Array(count)].map((_, index) => (
        <Box
          key={index}
          bg="white"
          p="$4"
          mb="$3"
          borderRadius="$xl"
          shadowColor="#000"
          shadowOffset={{ width: 0, height: 2 }}
          shadowOpacity={0.1}
          shadowRadius={4}
          elevation={2}
        >
          <VStack space="md">
            <HStack space="md" alignItems="center">
              {/* Profile Image Skeleton */}
              <SkeletonBox width={60} height={60} borderRadius={30} />

              {/* Name and Location Skeleton */}
              <VStack flex={1} space="xs">
                <SkeletonBox width="70%" height={20} borderRadius={10} />
                <SkeletonBox width="50%" height={16} borderRadius={8} />
              </VStack>

              {/* Action Buttons Skeleton */}
              <HStack space="sm">
                <SkeletonBox width={40} height={40} borderRadius={20} />
                <SkeletonBox width={40} height={40} borderRadius={20} />
              </HStack>
            </HStack>
          </VStack>
        </Box>
      ))}
    </VStack>
  );
};

type LikeItemProps = {
  item: UserItem;
  onLike: (userId: number) => void;
  onDislike: (userId: number) => void;
  expanded: boolean;
  onToggleExpand: () => void;
  isMatch?: boolean;
};

const LikeItem = ({ item, onLike, onDislike, expanded, onToggleExpand, isMatch = false }: LikeItemProps) => {
  // Get user data from the item
  const user = item.user;
  const profile = user.profile;
  const photoUrl = getProfilePhotoUrl(user);

  return (
    <Pressable
      onPress={onToggleExpand}
      $pressed={{
        bg: "$backgroundLight100",
      }}
    >
      <Box
        bg="white"
        p="$4"
        mb="$3"
        borderRadius="$xl"
        shadowColor="#000"
        shadowOffset={{ width: 0, height: 2 }}
        shadowOpacity={0.1}
        shadowRadius={4}
        elevation={2}
      >
        <VStack space="md">
          <HStack space="md" alignItems="center">
            <RNImage
              source={{
                uri: photoUrl || "https://via.placeholder.com/60x60?text=No+Photo"
              }}
              style={{
                width: 60,
                height: 60,
                borderRadius: 30,
              }}
            />

            <VStack flex={1} space="xs">
              <Text
                color="#1E1E1E"
                size="lg"
                fontWeight="$bold"
              >
                {profile.first_name} {profile.last_name.charAt(0)}., {profile.age}
              </Text>
              <Text
                color="#6B7280"
                size="sm"
              >
                {user.profile.city || "Unknown location"}
              </Text>
            </VStack>

            {!isMatch ? (
              <HStack space="sm">
                <TouchableOpacity onPress={() => onDislike(user.id)}>
                  <Box
                    bg="#FEE2E2"
                    p="$2"
                    borderRadius="$full"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Ionicons name="close" size={24} color="#EF4444" />
                  </Box>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onLike(user.id)}>
                  <Box
                    bg="#DCFCE7"
                    p="$2"
                    borderRadius="$full"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Ionicons name="heart" size={24} color="#10B981" />
                  </Box>
                </TouchableOpacity>
              </HStack>
            ) : (
              <Box
                bg="#DCFCE7"
                px="$3"
                py="$1"
                borderRadius="$full"
                alignItems="center"
                justifyContent="center"
              >
                <Text color="#10B981" fontWeight="$medium" size="sm">
                  Matched
                </Text>
              </Box>
            )}
          </HStack>

          {expanded && (
            <VStack space="sm" mt="$2">
              <Text color="#6B7280" size="sm">
                {profile.bio || "No bio available"}
              </Text>
              {isMatch && (
                <Button
                  size="sm"
                  bg="#FF6B9D"
                  borderRadius="$lg"
                  onPress={() => console.log(`Message ${profile.first_name}`)}
                  $pressed={{
                    bg: "#E64980",
                  }}
                >
                  <ButtonText
                    color="$white"
                    fontWeight="$medium"
                    size="sm"
                  >
                    Send Message
                  </ButtonText>
                </Button>
              )}
            </VStack>
          )}
        </VStack>
      </Box>
    </Pressable>
  );
};

export default function LikesScreen() {
  const [likes, setLikes] = useState<Like[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
  const [activeTab, setActiveTab] = useState<'likes' | 'matches'>('likes');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [likesPage, setLikesPage] = useState(1);
  const [matchesPage, setMatchesPage] = useState(1);
  const [hasMoreLikes, setHasMoreLikes] = useState(true);
  const [hasMoreMatches, setHasMoreMatches] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Ref to track last scroll position to prevent duplicate calls
  const lastScrollY = useRef(0);

  // Match modal state
  const [matchModalVisible, setMatchModalVisible] = useState(false);
  const [matchData, setMatchData] = useState<MatchData | null>(null);

  // Function to fetch likes
  const fetchLikes = useCallback(async (page = 1, refresh = false) => {
    try {
      setIsLoading(true);
      const response = await likesService.fetchReceivedLikes(page);

      if (response && response.status === 'success') {
        const newLikes = response.data.likes;
        const pagination = response.data.pagination;

        if (refresh) {
          setLikes(newLikes);
          setLikesPage(pagination.current_page);
        } else {
          setLikes(prev => [...prev, ...newLikes]);
          setLikesPage(pagination.current_page);
        }

        // Set hasMoreLikes to false immediately if we're at the last page or if there are no results
        setHasMoreLikes(pagination.current_page < pagination.last_page && pagination.total > 0);
      } else {
        // If response is not successful, stop trying to load more
        setHasMoreLikes(false);
      }
    } catch (error) {
      console.error('Error fetching likes:', error);
      setHasMoreLikes(false);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Function to fetch matches
  const fetchMatches = useCallback(async (page = 1, refresh = false) => {
    try {
      setIsLoading(true);
      const response = await likesService.fetchMatches(page);

      if (response && response.status === 'success') {
        const newMatches = response.data.matches;
        const pagination = response.data.pagination;

        if (refresh) {
          setMatches(newMatches);
          setMatchesPage(pagination.current_page);
        } else {
          setMatches(prev => [...prev, ...newMatches]);
          setMatchesPage(pagination.current_page);
        }

        // Set hasMoreMatches to false immediately if we're at the last page or if there are no results
        setHasMoreMatches(pagination.current_page < pagination.last_page && pagination.total > 0);
      } else {
        // If response is not successful, stop trying to load more
        setHasMoreMatches(false);
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
      setHasMoreMatches(false);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Load data when component mounts
  useEffect(() => {
    fetchLikes(1, true);
    fetchMatches(1, true);
  }, [fetchLikes, fetchMatches]);

  // Function to handle refresh
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    if (activeTab === 'likes') {
      fetchLikes(1, true);
    } else {
      fetchMatches(1, true);
    }
  }, [activeTab, fetchLikes, fetchMatches]);

  // Function to load more data
  const handleLoadMore = useCallback(() => {
    if (isLoading || isLoadingMore) return;

    if (activeTab === 'likes' && hasMoreLikes && likesPage > 0) {
      setIsLoadingMore(true);
      fetchLikes(likesPage + 1).finally(() => setIsLoadingMore(false));
    } else if (activeTab === 'matches' && hasMoreMatches && matchesPage > 0) {
      setIsLoadingMore(true);
      fetchMatches(matchesPage + 1).finally(() => setIsLoadingMore(false));
    }
  }, [activeTab, fetchLikes, fetchMatches, hasMoreLikes, hasMoreMatches, isLoading, isLoadingMore, likesPage, matchesPage]);

  // Function to convert Like response to MatchData format
  const convertLikeResponseToMatchData = (likeResponse: any, likedUser: Like): MatchData => {
    const user = likedUser.user;
    const profile = user.profile;

    return {
      like: likeResponse.data.like,
      is_match: likeResponse.data.is_match,
      match: likeResponse.data.match,
      chat: likeResponse.data.chat,
      liked_user: {
        type: 'users',
        id: user.id.toString(),
        attributes: {
          email: user.email || '',
          phone: user.phone || '',
          profile_photo_path: user.profile_photo_path || '',
          registration_completed: user.registration_completed || true,
          is_private: false,
          created_at: user.created_at || new Date().toISOString(),
          updated_at: user.updated_at || new Date().toISOString(),
          age: profile.age,
          full_name: `${profile.first_name} ${profile.last_name}`,
          is_online: user.is_online || false,
          last_active_at: user.last_active_at || new Date().toISOString(),
        },
        included: [
          {
            type: 'profiles',
            id: user.id.toString(),
            attributes: {
              first_name: profile.first_name,
              last_name: profile.last_name,
              gender: profile.gender || 'unknown',
              date_of_birth: profile.date_of_birth || new Date().toISOString(),
              city: profile.city || '',
              state: profile.state || '',
              province: null,
              country_id: profile.country_id || 1,
              latitude: null,
              longitude: null,
              marital_status: null,
              looking_for: 'all',
              bio: profile.bio || '',
              profession: profile.profession || '',
              interests: profile.interests || [],
            }
          },
          // Add photo data if available
          ...(user.profile_photo ? [{
            type: 'photos',
            id: '1',
            attributes: {
              user_id: user.id,
              original_url: user.profile_photo.original_url,
              thumbnail_url: user.profile_photo.thumbnail_url || user.profile_photo.original_url,
              medium_url: user.profile_photo.medium_url || user.profile_photo.original_url,
              is_profile_photo: true,
              order: 0,
              is_private: false,
              is_verified: false,
              status: 'approved',
              uploaded_at: new Date().toISOString(),
            }
          }] : []),
          // Add country data (placeholder for now)
          {
            type: 'countries',
            id: '1',
            attributes: {
              name: 'United States',
              code: 'US',
              flag: '🇺🇸',
              phone_code: '+1',
              phone_template: '(###) ###-####'
            }
          }
        ]
      }
    };
  };

  // Match modal handlers
  const handleCloseMatchModal = () => {
    setMatchModalVisible(false);
    setMatchData(null);
  };

  const handleKeepSwiping = () => {
    setMatchModalVisible(false);
    setMatchData(null);
  };

  // Function to handle like action
  const handleLike = async (userId: number) => {
    try {
      // Find the user in the likes list
      const likedUser = likes.find(like => like.user.id === userId);

      if (!likedUser) {
        console.error('User not found in likes list');
        return;
      }

      const response = await likesService.likeUser(userId);

      if (response && response.status === 'success') {
        // Remove the liked user from likes list
        setLikes(prev => prev.filter(like => like.user.id !== userId));

        // Check if it's a match
        if (response.data?.is_match) {
          // Convert the response to MatchData format
          const convertedMatchData = convertLikeResponseToMatchData(response, likedUser);
          setMatchData(convertedMatchData);
          setMatchModalVisible(true);
        }

        // Refresh matches to get the new match
        fetchMatches(1, true);
      }
    } catch (error) {
      console.error('Error liking user:', error);
    }
  };

  // Function to handle dislike action
  const handleDislike = (userId: number) => {
    // Remove the disliked user from the list
    setLikes(prev => prev.filter(like => like.user.id !== userId));
  };

  // Function to toggle expanded state
  const toggleExpand = (userId: number) => {
    setExpandedItems(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  return (
    <Box
      flex={1}
      bg="#FDF7FD"
      pt="$12" // Added padding top for camera area
    >
      <VStack flex={1}>
        {/* Header */}
        <Box px="$4" pt="$4" pb="$3">
          <HStack justifyContent="space-between" alignItems="center">
            <Text
              color="#1E1E1E"
              size="xl"
              fontWeight="$bold"
              fontSize={24}
            >
              Likes
            </Text>
            <HStack space="md" alignItems="center">
              <TouchableOpacity>
                <Ionicons name="search" size={24} color="#1E1E1E" />
              </TouchableOpacity>
              <TouchableOpacity>
                <Ionicons name="ellipsis-horizontal" size={24} color="#1E1E1E" />
              </TouchableOpacity>
            </HStack>
          </HStack>
        </Box>

        {/* Tabs */}
        <Box px="$4" pb="$2">
          <HStack space="md">
            <TouchableOpacity onPress={() => {
              setActiveTab('likes');
              lastScrollY.current = 0; // Reset scroll position tracking
            }}>
              <Box
                pb="$2"
                borderBottomWidth={2}
                borderBottomColor={activeTab === 'likes' ? "#FF6B9D" : "transparent"}
              >
                <Text
                  color={activeTab === 'likes' ? "#FF6B9D" : "#6B7280"}
                  fontWeight={activeTab === 'likes' ? "$bold" : "$medium"}
                  size="md"
                >
                  Likes ({likes.length})
                </Text>
              </Box>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => {
              setActiveTab('matches');
              lastScrollY.current = 0; // Reset scroll position tracking
            }}>
              <Box
                pb="$2"
                borderBottomWidth={2}
                borderBottomColor={activeTab === 'matches' ? "#FF6B9D" : "transparent"}
              >
                <Text
                  color={activeTab === 'matches' ? "#FF6B9D" : "#6B7280"}
                  fontWeight={activeTab === 'matches' ? "$bold" : "$medium"}
                  size="md"
                >
                  Matches ({matches.length})
                </Text>
              </Box>
            </TouchableOpacity>
          </HStack>
        </Box>

        {/* Content */}
        <ScrollView
          flex={1}
          px="$4"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#FF6B9D"
              colors={["#FF6B9D"]}
            />
          }
          onMomentumScrollEnd={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            const paddingToBottom = 20;
            const isNearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;
            
            // Only trigger if we're near the bottom and have scrolled down significantly
            if (isNearBottom && contentOffset.y > lastScrollY.current + 50) {
              lastScrollY.current = contentOffset.y;
              handleLoadMore();
            }
          }}
        >
          <VStack space="sm" pb="$6">
            {activeTab === 'likes' ? (
              likes.length > 0 ? (
                likes.map((like) => (
                  <LikeItem
                    key={like.id}
                    item={like as any}
                    onLike={handleLike}
                    onDislike={handleDislike}
                    expanded={expandedItems[like.user.id] || false}
                    onToggleExpand={() => toggleExpand(like.user.id)}
                  />
                ))
              ) : isLoading ? (
                <SkeletonLoader count={5} />
              ) : (
                <Box
                  alignItems="center"
                  justifyContent="center"
                  py="$20"
                >
                  <Ionicons name="heart-outline" size={64} color="#D1D5DB" />
                  <Text
                    color="#6B7280"
                    size="lg"
                    fontWeight="$medium"
                    mt="$4"
                    textAlign="center"
                  >
                    No likes yet
                  </Text>
                  <Text
                    color="#9CA3AF"
                    size="sm"
                    mt="$2"
                    textAlign="center"
                    maxWidth="$64"
                  >
                    People who like you will appear here
                  </Text>
                </Box>
              )
            ) : (
              matches.length > 0 ? (
                matches.map((match) => (
                  <LikeItem
                    key={match.id}
                    item={match as any}
                    onLike={() => {}}
                    onDislike={() => {}}
                    expanded={expandedItems[match.user.id] || false}
                    onToggleExpand={() => toggleExpand(match.user.id)}
                    isMatch={true}
                  />
                ))
              ) : isLoading ? (
                <SkeletonLoader count={5} />
              ) : (
                <Box
                  alignItems="center"
                  justifyContent="center"
                  py="$20"
                >
                  <Ionicons name="people-outline" size={64} color="#D1D5DB" />
                  <Text
                    color="#6B7280"
                    size="lg"
                    fontWeight="$medium"
                    mt="$4"
                    textAlign="center"
                  >
                    No matches yet
                  </Text>
                  <Text
                    color="#9CA3AF"
                    size="sm"
                    mt="$2"
                    textAlign="center"
                    maxWidth="$64"
                  >
                    Your matches will appear here
                  </Text>
                </Box>
              )
            )}

            {isLoading && ((activeTab === 'likes' && likes.length > 0) || (activeTab === 'matches' && matches.length > 0)) && (
              <SkeletonLoader count={3} />
            )}
          </VStack>
        </ScrollView>
      </VStack>

      {/* Match Modal */}
      <MatchModal
        visible={matchModalVisible}
        matchData={matchData}
        onClose={handleCloseMatchModal}
        onKeepSwiping={handleKeepSwiping}
      />
    </Box>
  );
}
