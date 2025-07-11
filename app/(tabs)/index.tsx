import { StyleSheet, Dimensions, ScrollView, Animated } from 'react-native';
import { Box } from '@gluestack-ui/themed';
import { StyledProvider } from '@gluestack-style/react';
import { gluestackConfig } from '@/lib/gluestack-theme';
import { useAuth } from "@/context/auth-context";
import { useEffect, useState, useRef, useCallback } from 'react';
import { matchesService, PotentialMatch, getProfileAndPhotos } from '@/services/matches-service';
import { preferencesService } from '@/services/preferences-service';

// Import custom components
import Header from '@/components/ui/home/Header';
import StoriesSection from '@/components/ui/home/StoriesSection';
import ProfileCard from '@/components/ui/home/ProfileCard';
import ActionButtons from '@/components/ui/home/ActionButtons';
import PhotoModal from '@/components/ui/home/PhotoModal';
import PreferencesModal from '@/components/ui/home/PreferencesModal';
import MatchModal from '@/components/ui/home/MatchModal';
import { getUserProfilePhotoUrl, getMatchProfilePhotoUrl, getCurrentMatchDetails } from '@/components/ui/home/utils';

export default function TabOneScreen() {
  const { user, stats, isAuthenticated, isRegistrationCompleted } = useAuth();
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [preferencesModalVisible, setPreferencesModalVisible] = useState(false);

  // Match modal state
  const [matchModalVisible, setMatchModalVisible] = useState(false);
  const [matchData, setMatchData] = useState<any | null>(null);

  // Potential matches state
  const [potentialMatches, setPotentialMatches] = useState<PotentialMatch[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [hasError, setHasError] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  // Dating Preferences State
  const [selectedCountry, setSelectedCountry] = useState('');
  const [ageRange, setAgeRange] = useState<[number, number]>([18, 35]);
  const [preferredGender, setPreferredGender] = useState('all');
  const [searchGlobal, setSearchGlobal] = useState(true);
  const [maxDistance, setMaxDistance] = useState(25);

  // Animation State
  const [cardPosition, setCardPosition] = useState<Animated.Value | null>(null);
  const [stampOpacity, setStampOpacity] = useState<Animated.Value | null>(null);
  const [showLikeStamp, setShowLikeStamp] = useState(false);
  const [showDislikeStamp, setShowDislikeStamp] = useState(false);

  // Fetch potential matches
  const fetchPotentialMatches = useCallback(async () => {
    if (!isAuthenticated || !isRegistrationCompleted) return;

    try {
      setIsLoadingMatches(true);
      setHasError(false);

      const response = await matchesService.fetchPotentialMatches();

      if (response && response.data) {
        setPotentialMatches(response.data);
        setCurrentMatchIndex(0);
      } else {
        setHasError(true);
      }
    } catch (error) {
      console.error('Error fetching potential matches:', error);
      setHasError(true);
    } finally {
      setIsLoadingMatches(false);
    }
  }, [isAuthenticated, isRegistrationCompleted]);

  // Load more matches when approaching the end of the list
  const loadMoreMatches = useCallback(async () => {
    // Double-check to prevent unnecessary API calls
    if (isLoadingMatches || !matchesService.hasMorePages()) {
      console.log('Skipping loadMoreMatches: already loading or no more pages');
      return;
    }

    // Check if we already have enough matches loaded
    // Only load more if we're close to the end of the current matches
    if (potentialMatches.length - currentMatchIndex > 5) {
      console.log('Skipping loadMoreMatches: already have enough matches loaded');
      return;
    }

    try {
      console.log('Loading more matches...');
      setIsLoadingMatches(true);

      const response = await matchesService.fetchNextPage();

      if (response && response.data) {
        setPotentialMatches(prevMatches => [...prevMatches, ...response.data]);
        console.log(`Loaded ${response.data.length} more matches`);
      } else {
        console.log('No more matches to load');
      }
    } catch (error) {
      console.error('Error loading more matches:', error);
    } finally {
      setIsLoadingMatches(false);
    }
  }, [isLoadingMatches, potentialMatches.length, currentMatchIndex]);

  // Handle like/dislike actions
  const handleLike = async () => {
    const currentMatch = getCurrentMatch();
    if (currentMatch) {
      try {
        // Send like request to API
        const response = await matchesService.likeUser(currentMatch.id);
        if (response && response.status === 'success') {
          console.log('Like sent successfully:', response.message);
          if (response.data?.is_match) {
            console.log('It\'s a match! 🎉');
            // Show match modal with the match data
            setMatchData(response.data);
            setMatchModalVisible(true);
            // Don't advance to next match yet - wait for user to dismiss the match modal
            return;
          }
        }
      } catch (error) {
        console.error('Error sending like:', error);
      }
    }

    // Keep existing navigation logic
    if (currentMatchIndex < potentialMatches.length - 1) {
      setCurrentMatchIndex(prevIndex => prevIndex + 1);
    }

    // If we're approaching the end of the loaded matches, load more
    // Only load more if we're not already loading and there are more pages to load
    if (potentialMatches.length - currentMatchIndex <= 3 && !isLoadingMatches && matchesService.hasMorePages()) {
      loadMoreMatches();
    }
  };

  // Match modal handlers
  const handleCloseMatchModal = () => {
    setMatchModalVisible(false);
    // Move to next match after closing the modal
    if (currentMatchIndex < potentialMatches.length - 1) {
      setCurrentMatchIndex(prevIndex => prevIndex + 1);
    }
  };

  const handleSendMessage = () => {
    setMatchModalVisible(false);
    // Here you would typically navigate to the chat screen with the matched user
    console.log('Navigate to chat with user:', matchData?.liked_user?.id);
    // Move to next match after closing the modal
    if (currentMatchIndex < potentialMatches.length - 1) {
      setCurrentMatchIndex(prevIndex => prevIndex + 1);
    }
  };

  const handleKeepSwiping = () => {
    setMatchModalVisible(false);
    // Move to next match after closing the modal
    if (currentMatchIndex < potentialMatches.length - 1) {
      setCurrentMatchIndex(prevIndex => prevIndex + 1);
    }
  };

  const handleDislike = async () => {
    const currentMatch = getCurrentMatch();
    if (currentMatch) {
      try {
        // Send dislike request to API
        const response = await matchesService.dislikeUser(currentMatch.id);
        if (response && response.status === 'success') {
          console.log('Dislike sent successfully:', response.message);
        }
      } catch (error) {
        console.error('Error sending dislike:', error);
      }
    }

    // Keep existing navigation logic
    if (currentMatchIndex < potentialMatches.length - 1) {
      setCurrentMatchIndex(prevIndex => prevIndex + 1);
    }

    // If we're approaching the end of the loaded matches, load more
    // Only load more if we're not already loading and there are more pages to load
    if (potentialMatches.length - currentMatchIndex <= 3 && !isLoadingMatches && matchesService.hasMorePages()) {
      loadMoreMatches();
    }
  };

  // Fetch potential matches when component mounts
  useEffect(() => {
    if (isAuthenticated && isRegistrationCompleted) {
      fetchPotentialMatches();
      // Load user preferences
      loadUserPreferences();
    }
  }, [isAuthenticated, isRegistrationCompleted, fetchPotentialMatches]);

  // Load user preferences
  const loadUserPreferences = useCallback(async () => {
    try {
      const response = await preferencesService.fetchPreferences();
      if (response?.success && response.data) {
        const uiPreferences = preferencesService.convertFromApiFormat(response.data);
        setAgeRange(uiPreferences.ageRange);
        setPreferredGender(uiPreferences.preferredGender);
        setSearchGlobal(uiPreferences.searchGlobal);
        setSelectedCountry(uiPreferences.selectedCountry);
        setMaxDistance(uiPreferences.maxDistance);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  }, []);

  // Get user's profile photo URL using the utility function
  const profilePhotoUrl = getUserProfilePhotoUrl(user);

  // Get current match data
  const getCurrentMatch = () => {
    if (potentialMatches.length === 0 || currentMatchIndex >= potentialMatches.length) {
      return null;
    }
    return potentialMatches[currentMatchIndex];
  };

  // Note: getProfilePhotoUrl, getCurrentMatchDetails, and getCurrentMatchPhotos functions
  // have been moved to utils.ts and are now imported at the top of the file

  const handlePhotoPress = (photo: string) => {
    setSelectedPhoto(photo);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedPhoto(null);
  };

  const openPreferencesModal = () => {
    setPreferencesModalVisible(true);
  };

  const closePreferencesModal = () => {
    console.log('Closing preferences modal');
    setPreferencesModalVisible(false);
    // Reset any corrupted states
    if (isNaN(ageRange[0]) || isNaN(ageRange[1])) {
      setAgeRange([18, 35]);
    }
    if (isNaN(maxDistance)) {
      setMaxDistance(25);
    }
  };

  const savePreferences = () => {
    console.log('Preferences saved, closing modal');
    // Preferences are now saved in the modal itself
    closePreferencesModal();
  };

  const countries = [
    'United States', 'Canada', 'United Kingdom', 'Germany', 'France',
    'Italy', 'Spain', 'Australia', 'Japan', 'South Korea', 'Brazil',
    'Mexico', 'India', 'Russia', 'China', 'Netherlands', 'Sweden',
    'Norway', 'Denmark', 'Switzerland'
  ];

  return (
    <StyledProvider config={gluestackConfig}>
      <Box
        flex={1}
        bg="#FDF7FD"
        style={{
          flex: 1,
          height: '100%',
          width: '100%',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <Header onSettingsPress={openPreferencesModal} />

        {/* Stories Section */}
        <StoriesSection
          userId={user?.id}
          profilePhotoUrl={getUserProfilePhotoUrl(user)}
        />

        {/* Main Content Area - Dating Profile */}
        <Box
          flex={1}
          px="$4"
          position="relative"
          bg="#FDF7FD"
          style={{
            flex: 1,
            position: 'relative',
            height: '100%',
            width: '100%',
            overflow: 'hidden'
          }}
        >
          {/* Profile Card */}
          <Box
            style={{
              flex: 1,
              width: '100%',
              height: '100%',
              paddingBottom: 100, // Add padding at the bottom to ensure the ActionButtons don't overlap
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <ProfileCard
              isLoading={isLoadingMatches}
              hasError={hasError}
              currentMatch={getCurrentMatch()}
              profileDetails={getCurrentMatchDetails(getCurrentMatch())}
              onPhotoPress={handlePhotoPress}
              getProfilePhotoUrl={getMatchProfilePhotoUrl}
              cardPosition={cardPosition}
              stampOpacity={stampOpacity}
              showLikeStamp={showLikeStamp}
              showDislikeStamp={showDislikeStamp}
            />
          </Box>

          {/* Action Buttons */}
          <Box
            style={{
              position: 'absolute',
              bottom: 20,
              left: 0,
              right: 0,
              zIndex: 9000,
              height: 180,
              backgroundColor: 'transparent'
            }}
          >
            <ActionButtons
              isLoading={isLoadingMatches}
              hasError={hasError}
              hasMatches={potentialMatches.length > 0}
              onLike={handleLike}
              onDislike={handleDislike}
              onRetry={fetchPotentialMatches}
              setCardPosition={setCardPosition}
              setStampOpacity={setStampOpacity}
              setShowLikeStampParent={setShowLikeStamp}
              setShowDislikeStampParent={setShowDislikeStamp}
            />
          </Box>
        </Box>

        {/* Photo Modal */}
        <PhotoModal
          visible={modalVisible}
          photoUrl={selectedPhoto}
          onClose={closeModal}
        />

        {/* Dating Preferences Modal */}
        <PreferencesModal
          visible={preferencesModalVisible}
          selectedCountry={selectedCountry}
          ageRange={ageRange}
          preferredGender={preferredGender}
          searchGlobal={searchGlobal}
          maxDistance={maxDistance}
          onClose={closePreferencesModal}
          onSave={savePreferences}
          onCountryChange={setSelectedCountry}
          onAgeRangeChange={setAgeRange}
          onGenderChange={setPreferredGender}
          onSearchGlobalChange={setSearchGlobal}
          onMaxDistanceChange={setMaxDistance}
        />

        {/* Match Modal */}
        <MatchModal
          visible={matchModalVisible}
          matchData={matchData}
          onClose={handleCloseMatchModal}
          onKeepSwiping={handleKeepSwiping}
        />
      </Box>
    </StyledProvider>
  );
}

// Styles have been moved to their respective component files
const styles = StyleSheet.create({});
