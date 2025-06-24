import { PotentialMatch, getProfileAndPhotos } from '@/services/matches-service';

/**
 * Get profile photo URL for a user
 * @param user User object with photos array
 * @returns URL of the profile photo or null if not found
 */
export const getUserProfilePhotoUrl = (user: any) => {
  if (user?.photos && user.photos.length > 0) {
    // Find the profile photo (is_profile_photo = true)
    const profilePhoto = user.photos.find((photo: any) => photo.is_profile_photo);
    if (profilePhoto) {
      // Handle different photo URL formats
      const photoUrl = profilePhoto.original_url || profilePhoto.medium_url || profilePhoto.photo_url;
      if (photoUrl) {
        // Check if the URL is already absolute or needs the base URL
        if (photoUrl.startsWith('http') || photoUrl.startsWith('https')) {
          return photoUrl;
        } else {
          return `https://incredibly-evident-hornet.ngrok-free.app${photoUrl}`;
        }
      }
    }

    // If no profile photo is marked, use the first photo
    const firstPhoto = user.photos[0];
    const photoUrl = firstPhoto.original_url || firstPhoto.medium_url || firstPhoto.photo_url;

    if (photoUrl) {
      // Check if the URL is already absolute or needs the base URL
      if (photoUrl.startsWith('http')) {
        return photoUrl;
      } else {
        return `https://incredibly-evident-hornet.ngrok-free.app${photoUrl}`;
      }
    }
  }
  return null;
};

/**
 * Get profile photo URL for a potential match
 * @param match Potential match object
 * @returns URL of the profile photo or null if not found
 */
export const getMatchProfilePhotoUrl = (match: PotentialMatch | null) => {
  if (!match) return null;

  // Get photos from the included array
  const { photos } = getProfileAndPhotos(match);

  // Find the profile photo (is_profile_photo = true)
  const profilePhoto = photos.find(photo => photo.attributes.is_profile_photo);

  if (profilePhoto) {
    // Use medium URL for faster loading, fallback to original if needed
    const photoUrl = profilePhoto.attributes.medium_url || profilePhoto.attributes.original_url;

    if (photoUrl) {
      // Check if the URL is already absolute or needs the base URL
      if (photoUrl.startsWith('http') || photoUrl.startsWith('https')) {
        return photoUrl;
      } else {
        return `https://incredibly-evident-hornet.ngrok-free.app${photoUrl}`;
      }
    }
  }

  // If no profile photo is marked, try to use profile_photo_path from attributes
  if (match.attributes.profile_photo_path) {
    const photoUrl = match.attributes.profile_photo_path;
    if (photoUrl.startsWith('http') || photoUrl.startsWith('https')) {
      return photoUrl;
    } else {
      return `https://incredibly-evident-hornet.ngrok-free.app${photoUrl}`;
    }
  }

  // If still no photo found and there are other photos, use the first one
  if (photos.length > 0) {
    const firstPhoto = photos[0];
    const photoUrl = firstPhoto.attributes.medium_url || firstPhoto.attributes.original_url;

    if (photoUrl) {
      if (photoUrl.startsWith('http') || photoUrl.startsWith('https')) {
        return photoUrl;
      } else {
        return `https://incredibly-evident-hornet.ngrok-free.app${photoUrl}`;
      }
    }
  }

  return null;
};

/**
 * Get current match details including profile and photos
 * @param currentMatch Current potential match
 * @returns Object containing profile and photos
 */
export const getCurrentMatchDetails = (currentMatch: PotentialMatch | null) => {
  if (!currentMatch) return { profile: null, photos: [] };
  return getProfileAndPhotos(currentMatch);
};
