import { connectionManager } from './connection-manager';
import { OtherUser, Profile, ProfilePhoto } from '../chats-service';
import { WrappedConnection } from './performance-wrapper';

export interface IUserRepository {
  saveOtherUser(chatId: number, user: OtherUser): Promise<void>;
  getOtherUserForChat(chatId: number): Promise<OtherUser | null>;
  getOtherUserById(userId: number): Promise<OtherUser | null>;
  updateOtherUser(userId: number, updates: Partial<OtherUser>): Promise<void>;
  deleteOtherUser(userId: number): Promise<void>;
  saveProfile(userId: number, profile: Profile): Promise<void>;
  getProfileForUser(userId: number): Promise<Profile | null>;
  updateProfile(userId: number, updates: Partial<Profile>): Promise<void>;
  deleteProfile(userId: number): Promise<void>;
  saveProfilePhoto(userId: number, photo: ProfilePhoto): Promise<void>;
  getProfilePhotoForUser(userId: number): Promise<ProfilePhoto | null>;
  getProfilePhotosForUser(userId: number): Promise<ProfilePhoto[]>;
  updateProfilePhoto(photoId: number, updates: Partial<ProfilePhoto>): Promise<void>;
  deleteProfilePhoto(photoId: number): Promise<void>;
  setProfilePhoto(userId: number, photoId: number): Promise<void>;
  getUsersByIds(userIds: number[]): Promise<OtherUser[]>;
}

/**
 * User Repository
 * Handles all user and profile-related database operations
 */
export class UserRepository implements IUserRepository {
  /**
   * Save an other user to the database
   */
  async saveOtherUser(chatId: number, user: OtherUser): Promise<void> {
    const db = await connectionManager.getConnection();

    try {
      await db.withTransactionAsync(async () => {
        // Save user
        await db.runAsync(`
          INSERT OR REPLACE INTO other_users (
            id, chat_id, email, phone, google_id, facebook_id, email_verified_at,
            phone_verified_at, disabled_at, registration_completed, is_admin,
            is_private, profile_photo_path, last_active_at, deleted_at,
            created_at, updated_at, two_factor_enabled, last_login_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          user.id,
          chatId,
          user.email,
          user.phone,
          user.google_id || null,
          user.facebook_id || null,
          user.email_verified_at || null,
          user.phone_verified_at || null,
          user.disabled_at || null,
          user.registration_completed ? 1 : 0,
          user.is_admin ? 1 : 0,
          user.is_private ? 1 : 0,
          user.profile_photo_path || null,
          user.last_active_at,
          user.deleted_at || null,
          user.created_at,
          user.updated_at,
          user.two_factor_enabled ? 1 : 0,
          user.last_login_at
        ]);

        // Save profile if exists
        if (user.profile) {
          await this.saveProfile(user.id, user.profile);
        }

        // Save profile photo if exists
        if (user.profile_photo) {
          await this.saveProfilePhoto(user.id, user.profile_photo);
        }
      });

      console.log(`Other user ${user.id} saved successfully`);
    } catch (error) {
      console.error('Error saving other user:', error);
      throw error;
    }
  }

  /**
   * Get other user for a chat
   */
  async getOtherUserForChat(chatId: number): Promise<OtherUser | null> {
    const db = await connectionManager.getConnection();

    try {
      const user = await db.getFirstAsync<any>(`
        SELECT * FROM other_users 
        WHERE chat_id = ? AND deleted_at IS NULL
      `, [chatId]);

      if (!user) return null;

      return await this.buildOtherUserFromQuery(user);
    } catch (error) {
      console.error('Error getting other user for chat:', error);
      throw error;
    }
  }

  /**
   * Get other user by ID
   */
  async getOtherUserById(userId: number): Promise<OtherUser | null> {
    const db = await connectionManager.getConnection();

    try {
      const user = await db.getFirstAsync<any>(`
        SELECT * FROM other_users 
        WHERE id = ? AND deleted_at IS NULL
      `, [userId]);

      if (!user) return null;

      return await this.buildOtherUserFromQuery(user);
    } catch (error) {
      console.error('Error getting other user by ID:', error);
      throw error;
    }
  }

  /**
   * Update other user
   */
  async updateOtherUser(userId: number, updates: Partial<OtherUser>): Promise<void> {
    const db = await connectionManager.getConnection();

    try {
      const setClause = [];
      const params = [];

      if (updates.email !== undefined) {
        setClause.push('email = ?');
        params.push(updates.email);
      }
      if (updates.phone !== undefined) {
        setClause.push('phone = ?');
        params.push(updates.phone);
      }
      if (updates.is_private !== undefined) {
        setClause.push('is_private = ?');
        params.push(updates.is_private ? 1 : 0);
      }
      if (updates.profile_photo_path !== undefined) {
        setClause.push('profile_photo_path = ?');
        params.push(updates.profile_photo_path);
      }
      if (updates.last_active_at !== undefined) {
        setClause.push('last_active_at = ?');
        params.push(updates.last_active_at);
      }

      if (setClause.length === 0) {
        return; // No updates to make
      }

      setClause.push('updated_at = ?');
      params.push(new Date().toISOString());
      params.push(userId);

      await db.runAsync(`
        UPDATE other_users 
        SET ${setClause.join(', ')} 
        WHERE id = ?
      `, params);

      console.log(`Other user ${userId} updated successfully`);
    } catch (error) {
      console.error('Error updating other user:', error);
      throw error;
    }
  }

  /**
   * Delete other user (soft delete)
   */
  async deleteOtherUser(userId: number): Promise<void> {
    const db = await connectionManager.getConnection();

    try {
      await db.withTransactionAsync(async () => {
        const now = new Date().toISOString();
        
        // Soft delete user
        await db.runAsync(`
          UPDATE other_users 
          SET deleted_at = ? 
          WHERE id = ?
        `, [now, userId]);

        // Soft delete profile
        await db.runAsync(`
          UPDATE profiles 
          SET deleted_at = ? 
          WHERE user_id = ?
        `, [now, userId]);

        // Soft delete profile photos
        await db.runAsync(`
          UPDATE profile_photos 
          SET deleted_at = ? 
          WHERE user_id = ?
        `, [now, userId]);
      });

      console.log(`Other user ${userId} deleted successfully`);
    } catch (error) {
      console.error('Error deleting other user:', error);
      throw error;
    }
  }

  /**
   * Save a profile to the database
   */
  async saveProfile(userId: number, profile: Profile): Promise<void> {
    const db = await connectionManager.getConnection();

    try {
      await db.runAsync(`
        INSERT OR REPLACE INTO profiles (
          id, user_id, first_name, last_name, gender, date_of_birth,
          age, city, state, province, country_id, latitude, longitude,
          bio, interests, looking_for, profile_views, profile_completed_at,
          status, occupation, profession, country_code, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        profile.id,
        userId,
        profile.first_name,
        profile.last_name,
        profile.gender,
        profile.date_of_birth,
        profile.age,
        profile.city,
        profile.state,
        profile.province || null,
        profile.country_id,
        profile.latitude || null,
        profile.longitude || null,
        profile.bio,
        JSON.stringify(profile.interests),
        profile.looking_for,
        profile.profile_views,
        profile.profile_completed_at,
        profile.status || null,
        profile.occupation || null,
        profile.profession || null,
        profile.country_code || null,
        profile.created_at,
        profile.updated_at
      ]);

      console.log(`Profile ${profile.id} saved successfully`);
    } catch (error) {
      console.error('Error saving profile:', error);
      throw error;
    }
  }

  /**
   * Get profile for a user
   */
  async getProfileForUser(userId: number): Promise<Profile | null> {
    const db = await connectionManager.getConnection();

    try {
      const profile = await db.getFirstAsync<any>(`
        SELECT * FROM profiles 
        WHERE user_id = ? AND deleted_at IS NULL
      `, [userId]);

      if (!profile) return null;

      return this.transformProfileFromQuery(profile);
    } catch (error) {
      console.error('Error getting profile for user:', error);
      throw error;
    }
  }

  /**
   * Update profile
   */
  async updateProfile(userId: number, updates: Partial<Profile>): Promise<void> {
    const db = await connectionManager.getConnection();

    try {
      const setClause = [];
      const params = [];

      if (updates.first_name !== undefined) {
        setClause.push('first_name = ?');
        params.push(updates.first_name);
      }
      if (updates.last_name !== undefined) {
        setClause.push('last_name = ?');
        params.push(updates.last_name);
      }
      if (updates.bio !== undefined) {
        setClause.push('bio = ?');
        params.push(updates.bio);
      }
      if (updates.interests !== undefined) {
        setClause.push('interests = ?');
        params.push(JSON.stringify(updates.interests));
      }
      if (updates.occupation !== undefined) {
        setClause.push('occupation = ?');
        params.push(updates.occupation);
      }
      if (updates.city !== undefined) {
        setClause.push('city = ?');
        params.push(updates.city);
      }
      if (updates.state !== undefined) {
        setClause.push('state = ?');
        params.push(updates.state);
      }

      if (setClause.length === 0) {
        return; // No updates to make
      }

      setClause.push('updated_at = ?');
      params.push(new Date().toISOString());
      params.push(userId);

      await db.runAsync(`
        UPDATE profiles 
        SET ${setClause.join(', ')} 
        WHERE user_id = ?
      `, params);

      console.log(`Profile for user ${userId} updated successfully`);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  /**
   * Delete profile (soft delete)
   */
  async deleteProfile(userId: number): Promise<void> {
    const db = await connectionManager.getConnection();

    try {
      await db.runAsync(`
        UPDATE profiles 
        SET deleted_at = ? 
        WHERE user_id = ?
      `, [new Date().toISOString(), userId]);

      console.log(`Profile for user ${userId} deleted successfully`);
    } catch (error) {
      console.error('Error deleting profile:', error);
      throw error;
    }
  }

  /**
   * Save a profile photo to the database
   */
  async saveProfilePhoto(userId: number, photo: ProfilePhoto): Promise<void> {
    const db = await connectionManager.getConnection();

    try {
      await db.runAsync(`
        INSERT OR REPLACE INTO profile_photos (
          id, user_id, original_url, thumbnail_url, medium_url,
          is_profile_photo, order_num, is_private, is_verified,
          status, rejection_reason, metadata, uploaded_at,
          deleted_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        photo.id,
        userId,
        photo.original_url,
        photo.thumbnail_url,
        photo.medium_url,
        photo.is_profile_photo ? 1 : 0,
        photo.order,
        photo.is_private ? 1 : 0,
        photo.is_verified ? 1 : 0,
        photo.status,
        photo.rejection_reason || null,
        photo.metadata ? JSON.stringify(photo.metadata) : null,
        photo.uploaded_at,
        photo.deleted_at || null,
        photo.created_at,
        photo.updated_at
      ]);

      console.log(`Profile photo ${photo.id} saved successfully`);
    } catch (error) {
      console.error('Error saving profile photo:', error);
      throw error;
    }
  }

  /**
   * Get profile photo for a user
   */
  async getProfilePhotoForUser(userId: number): Promise<ProfilePhoto | null> {
    const db = await connectionManager.getConnection();

    try {
      const photo = await db.getFirstAsync<any>(`
        SELECT * FROM profile_photos 
        WHERE user_id = ? AND is_profile_photo = 1 AND deleted_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
      `, [userId]);

      if (!photo) return null;

      return this.transformProfilePhotoFromQuery(photo);
    } catch (error) {
      console.error('Error getting profile photo for user:', error);
      throw error;
    }
  }

  /**
   * Get all profile photos for a user
   */
  async getProfilePhotosForUser(userId: number): Promise<ProfilePhoto[]> {
    const db = await connectionManager.getConnection();

    try {
      const photos = await db.getAllAsync<any>(`
        SELECT * FROM profile_photos 
        WHERE user_id = ? AND deleted_at IS NULL
        ORDER BY order_num ASC, created_at DESC
      `, [userId]);

      return photos.map(photo => this.transformProfilePhotoFromQuery(photo));
    } catch (error) {
      console.error('Error getting profile photos for user:', error);
      throw error;
    }
  }

  /**
   * Update profile photo
   */
  async updateProfilePhoto(photoId: number, updates: Partial<ProfilePhoto>): Promise<void> {
    const db = await connectionManager.getConnection();

    try {
      const setClause = [];
      const params = [];

      if (updates.is_profile_photo !== undefined) {
        setClause.push('is_profile_photo = ?');
        params.push(updates.is_profile_photo ? 1 : 0);
      }
      if (updates.order !== undefined) {
        setClause.push('order_num = ?');
        params.push(updates.order);
      }
      if (updates.is_private !== undefined) {
        setClause.push('is_private = ?');
        params.push(updates.is_private ? 1 : 0);
      }
      if (updates.status !== undefined) {
        setClause.push('status = ?');
        params.push(updates.status);
      }

      if (setClause.length === 0) {
        return; // No updates to make
      }

      setClause.push('updated_at = ?');
      params.push(new Date().toISOString());
      params.push(photoId);

      await db.runAsync(`
        UPDATE profile_photos 
        SET ${setClause.join(', ')} 
        WHERE id = ?
      `, params);

      console.log(`Profile photo ${photoId} updated successfully`);
    } catch (error) {
      console.error('Error updating profile photo:', error);
      throw error;
    }
  }

  /**
   * Delete profile photo (soft delete)
   */
  async deleteProfilePhoto(photoId: number): Promise<void> {
    const db = await connectionManager.getConnection();

    try {
      await db.runAsync(`
        UPDATE profile_photos 
        SET deleted_at = ? 
        WHERE id = ?
      `, [new Date().toISOString(), photoId]);

      console.log(`Profile photo ${photoId} deleted successfully`);
    } catch (error) {
      console.error('Error deleting profile photo:', error);
      throw error;
    }
  }

  /**
   * Set a photo as the profile photo
   */
  async setProfilePhoto(userId: number, photoId: number): Promise<void> {
    const db = await connectionManager.getConnection();

    try {
      await db.withTransactionAsync(async () => {
        // Remove profile photo flag from all photos
        await db.runAsync(`
          UPDATE profile_photos 
          SET is_profile_photo = 0 
          WHERE user_id = ?
        `, [userId]);

        // Set the new profile photo
        await db.runAsync(`
          UPDATE profile_photos 
          SET is_profile_photo = 1 
          WHERE id = ?
        `, [photoId]);
      });

      console.log(`Profile photo set for user ${userId}`);
    } catch (error) {
      console.error('Error setting profile photo:', error);
      throw error;
    }
  }

  /**
   * Get users by IDs
   */
  async getUsersByIds(userIds: number[]): Promise<OtherUser[]> {
    const db = await connectionManager.getConnection();

    try {
      const placeholders = userIds.map(() => '?').join(',');
      const users = await db.getAllAsync<any>(`
        SELECT * FROM other_users 
        WHERE id IN (${placeholders}) AND deleted_at IS NULL
      `, userIds);

      const result = [];
      for (const user of users) {
        result.push(await this.buildOtherUserFromQuery(user));
      }
      return result;
    } catch (error) {
      console.error('Error getting users by IDs:', error);
      throw error;
    }
  }

  /**
   * Build complete OtherUser object from query result
   */
  private async buildOtherUserFromQuery(rawUser: any): Promise<OtherUser> {
    const profile = await this.getProfileForUser(rawUser.id);
    const profilePhoto = await this.getProfilePhotoForUser(rawUser.id);

    return {
      id: rawUser.id,
      email: rawUser.email,
      phone: rawUser.phone,
      google_id: rawUser.google_id,
      facebook_id: rawUser.facebook_id,
      email_verified_at: rawUser.email_verified_at,
      phone_verified_at: rawUser.phone_verified_at,
      disabled_at: rawUser.disabled_at,
      registration_completed: rawUser.registration_completed === 1,
      is_admin: rawUser.is_admin === 1,
      is_private: rawUser.is_private === 1,
      profile_photo_path: rawUser.profile_photo_path,
      last_active_at: rawUser.last_active_at,
      deleted_at: rawUser.deleted_at,
      created_at: rawUser.created_at,
      updated_at: rawUser.updated_at,
      two_factor_enabled: rawUser.two_factor_enabled === 1,
      last_login_at: rawUser.last_login_at,
      pivot: {
        chat_id: rawUser.chat_id,
        user_id: rawUser.id,
        is_muted: false,
        last_read_at: null,
        joined_at: rawUser.created_at,
        left_at: null,
        role: 'member',
        created_at: rawUser.created_at,
        updated_at: rawUser.updated_at
      },
      profile: profile!,
      profile_photo: profilePhoto
    };
  }

  /**
   * Transform raw profile data from database query
   */
  private transformProfileFromQuery(rawProfile: any): Profile {
    return {
      id: rawProfile.id,
      user_id: rawProfile.user_id,
      first_name: rawProfile.first_name,
      last_name: rawProfile.last_name,
      gender: rawProfile.gender,
      date_of_birth: rawProfile.date_of_birth,
      age: rawProfile.age,
      city: rawProfile.city,
      state: rawProfile.state,
      province: rawProfile.province,
      country_id: rawProfile.country_id,
      latitude: rawProfile.latitude,
      longitude: rawProfile.longitude,
      bio: rawProfile.bio,
      interests: rawProfile.interests ? JSON.parse(rawProfile.interests) : [],
      looking_for: rawProfile.looking_for,
      profile_views: rawProfile.profile_views,
      profile_completed_at: rawProfile.profile_completed_at,
      status: rawProfile.status,
      occupation: rawProfile.occupation,
      profession: rawProfile.profession,
      country_code: rawProfile.country_code,
      created_at: rawProfile.created_at,
      updated_at: rawProfile.updated_at
    };
  }

  /**
   * Transform raw profile photo data from database query
   */
  private transformProfilePhotoFromQuery(rawPhoto: any): ProfilePhoto {
    return {
      id: rawPhoto.id,
      user_id: rawPhoto.user_id,
      original_url: rawPhoto.original_url,
      thumbnail_url: rawPhoto.thumbnail_url,
      medium_url: rawPhoto.medium_url,
      is_profile_photo: rawPhoto.is_profile_photo === 1,
      order: rawPhoto.order_num,
      is_private: rawPhoto.is_private === 1,
      is_verified: rawPhoto.is_verified === 1,
      status: rawPhoto.status,
      rejection_reason: rawPhoto.rejection_reason,
      metadata: rawPhoto.metadata ? JSON.parse(rawPhoto.metadata) : null,
      uploaded_at: rawPhoto.uploaded_at,
      deleted_at: rawPhoto.deleted_at,
      created_at: rawPhoto.created_at,
      updated_at: rawPhoto.updated_at
    };
  }
}

// Export a singleton instance
export const userRepository = new UserRepository(); 