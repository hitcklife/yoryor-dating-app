import { User } from './api-client';

// Profile section weights (must add up to 100)
export const PROFILE_WEIGHTS = {
  profilePhoto: 20,
  bio: 15,
  culturalBackground: 15,
  familyValues: 15,
  careerEducation: 10,
  physicalLifestyle: 10,
  locationImmigration: 15
};

// Section field requirements
export const SECTION_FIELDS = {
  profilePhoto: ['profilePhoto'],
  bio: ['bio'],
  culturalBackground: [
    'languages',
    'ethnicity',
    'religion',
    'religiosity',
    'lifestyle',
    'uzbekistanRegion' // optional
  ],
  familyValues: [
    'familyImportance',
    'wantChildren',
    'childrenCount', // conditional
    'marriageTimeline',
    'livesWithFamily',
    'familyApprovalImportant'
  ],
  careerEducation: [
    'occupation',
    'profession',
    'educationLevel',
    'universityName', // optional
    'incomeRange'
  ],
  physicalLifestyle: [
    'height',
    'bodyType',
    'fitnessLevel',
    'smokingStatus',
    'drinkingStatus',
    'dietaryRestrictions'
  ],
  locationImmigration: [
    'immigrationStatus',
    'yearsInCountry',
    'visitsUzbekistan',
    'wouldRelocate',
    'relocateCountries' // conditional
  ]
};

export interface ProfileSection {
  id: string;
  title: string;
  icon: string;
  weight: number;
  completedFields: number;
  totalFields: number;
  requiredFields: number;
  percentage: number;
  isComplete: boolean;
  boostText?: string;
}

export interface ProfileCompletionData {
  overallPercentage: number;
  profileStrength: 'weak' | 'fair' | 'good' | 'strong' | 'excellent';
  sections: ProfileSection[];
  missingRequiredFields: string[];
  lastUpdated?: Date;
}

class ProfileCompletionService {
  /**
   * Calculate overall profile completion percentage and section details
   */
  calculateCompletion(user: User | null): ProfileCompletionData {
    if (!user || !user.profile) {
      return {
        overallPercentage: 0,
        profileStrength: 'weak',
        sections: this.getEmptySections(),
        missingRequiredFields: []
      };
    }

    const sections: ProfileSection[] = [];
    let totalPercentage = 0;
    const missingRequiredFields: string[] = [];

    // Profile Photo Section
    const profilePhotoSection = this.calculateProfilePhotoSection(user);
    sections.push(profilePhotoSection);
    totalPercentage += profilePhotoSection.percentage * (PROFILE_WEIGHTS.profilePhoto / 100);

    // Bio Section
    const bioSection = this.calculateBioSection(user);
    sections.push(bioSection);
    totalPercentage += bioSection.percentage * (PROFILE_WEIGHTS.bio / 100);

    // Cultural Background Section
    const culturalSection = this.calculateCulturalSection(user);
    sections.push(culturalSection);
    totalPercentage += culturalSection.percentage * (PROFILE_WEIGHTS.culturalBackground / 100);

    // Family Values Section
    const familySection = this.calculateFamilySection(user);
    sections.push(familySection);
    totalPercentage += familySection.percentage * (PROFILE_WEIGHTS.familyValues / 100);

    // Career & Education Section
    const careerSection = this.calculateCareerSection(user);
    sections.push(careerSection);
    totalPercentage += careerSection.percentage * (PROFILE_WEIGHTS.careerEducation / 100);

    // Physical & Lifestyle Section
    const physicalSection = this.calculatePhysicalSection(user);
    sections.push(physicalSection);
    totalPercentage += physicalSection.percentage * (PROFILE_WEIGHTS.physicalLifestyle / 100);

    // Location & Immigration Section
    const locationSection = this.calculateLocationSection(user);
    sections.push(locationSection);
    totalPercentage += locationSection.percentage * (PROFILE_WEIGHTS.locationImmigration / 100);

    // Collect missing required fields
    sections.forEach(section => {
      if (!section.isComplete && section.completedFields < section.requiredFields) {
        missingRequiredFields.push(section.title);
      }
    });

    return {
      overallPercentage: Math.round(totalPercentage),
      profileStrength: this.getProfileStrength(totalPercentage),
      sections,
      missingRequiredFields,
      lastUpdated: user.profile?.updated_at ? new Date(user.profile.updated_at) : undefined
    };
  }

  private calculateProfilePhotoSection(user: User): ProfileSection {
    const hasProfilePhoto = !!(user.photos && user.photos.length > 0 && 
      user.photos.some(photo => photo.is_profile_photo));
    
    return {
      id: 'profilePhoto',
      title: 'Profile Photo',
      icon: 'camera',
      weight: PROFILE_WEIGHTS.profilePhoto,
      completedFields: hasProfilePhoto ? 1 : 0,
      totalFields: 1,
      requiredFields: 1,
      percentage: hasProfilePhoto ? 100 : 0,
      isComplete: hasProfilePhoto,
      boostText: !hasProfilePhoto ? `Completes your profile by ${PROFILE_WEIGHTS.profilePhoto}%` : undefined
    };
  }

  private calculateBioSection(user: User): ProfileSection {
    const hasBio = !!(user.profile?.bio && user.profile.bio.trim().length >= 20);
    
    return {
      id: 'bio',
      title: 'Bio',
      icon: 'text',
      weight: PROFILE_WEIGHTS.bio,
      completedFields: hasBio ? 1 : 0,
      totalFields: 1,
      requiredFields: 1,
      percentage: hasBio ? 100 : 0,
      isComplete: hasBio,
      boostText: !hasBio ? `Completes your profile by ${PROFILE_WEIGHTS.bio}%` : undefined
    };
  }

  private calculateCulturalSection(user: User): ProfileSection {
    const profile = user.profile;
    let completed = 0;
    const required = 5; // All fields except uzbekistanRegion are required
    const total = 6;

    if (profile?.languages && profile.languages.length > 0) completed++;
    if (profile?.ethnicity) completed++;
    if (profile?.religion) completed++;
    if (profile?.religiosity) completed++;
    if (profile?.lifestyle) completed++;
    if (profile?.uzbekistan_region) completed++; // optional

    const percentage = (completed / total) * 100;

    return {
      id: 'culturalBackground',
      title: 'Cultural Background',
      icon: 'globe',
      weight: PROFILE_WEIGHTS.culturalBackground,
      completedFields: completed,
      totalFields: total,
      requiredFields: required,
      percentage: Math.round(percentage),
      isComplete: completed >= required,
      boostText: completed < required ? `${total - completed} fields to complete (${PROFILE_WEIGHTS.culturalBackground}% boost)` : undefined
    };
  }

  private calculateFamilySection(user: User): ProfileSection {
    const profile = user.profile;
    let completed = 0;
    let required = 5; // Base required fields
    let total = 5;

    if (profile?.family_importance !== undefined && profile.family_importance !== null) completed++;
    if (profile?.want_children) completed++;
    
    // Children count is conditional
    if (profile?.want_children === 'yes') {
      total = 6;
      required = 6;
      if (profile?.children_count) completed++;
    }
    
    if (profile?.marriage_timeline) completed++;
    if (profile?.lives_with_family !== undefined && profile.lives_with_family !== null) completed++;
    if (profile?.family_approval_important !== undefined && profile.family_approval_important !== null) completed++;

    const percentage = (completed / total) * 100;

    return {
      id: 'familyValues',
      title: 'Family & Marriage',
      icon: 'heart',
      weight: PROFILE_WEIGHTS.familyValues,
      completedFields: completed,
      totalFields: total,
      requiredFields: required,
      percentage: Math.round(percentage),
      isComplete: completed >= required,
      boostText: completed < required ? `${required - completed} fields to complete (${PROFILE_WEIGHTS.familyValues}% boost)` : undefined
    };
  }

  private calculateCareerSection(user: User): ProfileSection {
    const profile = user.profile;
    let completed = 0;
    const required = 4; // All fields except universityName are required
    const total = 5;

    if (profile?.occupation) completed++;
    if (profile?.profession) completed++;
    if (profile?.education_level) completed++;
    if (profile?.university_name) completed++; // optional
    if (profile?.income_range) completed++;

    const percentage = (completed / total) * 100;

    return {
      id: 'careerEducation',
      title: 'Career & Education',
      icon: 'briefcase',
      weight: PROFILE_WEIGHTS.careerEducation,
      completedFields: completed,
      totalFields: total,
      requiredFields: required,
      percentage: Math.round(percentage),
      isComplete: completed >= required,
      boostText: completed < required ? `${required - completed} fields to complete (${PROFILE_WEIGHTS.careerEducation}% boost)` : undefined
    };
  }

  private calculatePhysicalSection(user: User): ProfileSection {
    const profile = user.profile;
    let completed = 0;
    const required = 6;
    const total = 6;

    if (profile?.height) completed++;
    if (profile?.body_type) completed++;
    if (profile?.fitness_level) completed++;
    if (profile?.smoking_status) completed++;
    if (profile?.drinking_status) completed++;
    if (profile?.dietary_restrictions && profile.dietary_restrictions.length > 0) completed++;

    const percentage = (completed / total) * 100;

    return {
      id: 'physicalLifestyle',
      title: 'Physical & Lifestyle',
      icon: 'fitness',
      weight: PROFILE_WEIGHTS.physicalLifestyle,
      completedFields: completed,
      totalFields: total,
      requiredFields: required,
      percentage: Math.round(percentage),
      isComplete: completed >= required,
      boostText: completed < required ? `${required - completed} fields to complete (${PROFILE_WEIGHTS.physicalLifestyle}% boost)` : undefined
    };
  }

  private calculateLocationSection(user: User): ProfileSection {
    const profile = user.profile;
    let completed = 0;
    let required = 4; // Base required fields
    let total = 4;

    if (profile?.immigration_status) completed++;
    if (profile?.years_in_country) completed++;
    if (profile?.visits_uzbekistan) completed++;
    if (profile?.would_relocate !== undefined && profile.would_relocate !== null) completed++;
    
    // Relocate countries is conditional
    if (profile?.would_relocate === true) {
      total = 5;
      required = 5;
      if (profile?.relocate_countries && profile.relocate_countries.length > 0) completed++;
    }

    const percentage = (completed / total) * 100;

    return {
      id: 'locationImmigration',
      title: 'Location & Immigration',
      icon: 'location',
      weight: PROFILE_WEIGHTS.locationImmigration,
      completedFields: completed,
      totalFields: total,
      requiredFields: required,
      percentage: Math.round(percentage),
      isComplete: completed >= required,
      boostText: completed < required ? `${required - completed} fields to complete (${PROFILE_WEIGHTS.locationImmigration}% boost)` : undefined
    };
  }

  private getProfileStrength(percentage: number): 'weak' | 'fair' | 'good' | 'strong' | 'excellent' {
    if (percentage >= 90) return 'excellent';
    if (percentage >= 75) return 'strong';
    if (percentage >= 60) return 'good';
    if (percentage >= 40) return 'fair';
    return 'weak';
  }

  private getEmptySections(): ProfileSection[] {
    return [
      {
        id: 'profilePhoto',
        title: 'Profile Photo',
        icon: 'camera',
        weight: PROFILE_WEIGHTS.profilePhoto,
        completedFields: 0,
        totalFields: 1,
        requiredFields: 1,
        percentage: 0,
        isComplete: false,
        boostText: `Completes your profile by ${PROFILE_WEIGHTS.profilePhoto}%`
      },
      {
        id: 'bio',
        title: 'Bio',
        icon: 'text',
        weight: PROFILE_WEIGHTS.bio,
        completedFields: 0,
        totalFields: 1,
        requiredFields: 1,
        percentage: 0,
        isComplete: false,
        boostText: `Completes your profile by ${PROFILE_WEIGHTS.bio}%`
      },
      {
        id: 'culturalBackground',
        title: 'Cultural Background',
        icon: 'globe',
        weight: PROFILE_WEIGHTS.culturalBackground,
        completedFields: 0,
        totalFields: 6,
        requiredFields: 5,
        percentage: 0,
        isComplete: false,
        boostText: `6 fields to complete (${PROFILE_WEIGHTS.culturalBackground}% boost)`
      },
      {
        id: 'familyValues',
        title: 'Family & Marriage',
        icon: 'heart',
        weight: PROFILE_WEIGHTS.familyValues,
        completedFields: 0,
        totalFields: 5,
        requiredFields: 5,
        percentage: 0,
        isComplete: false,
        boostText: `5 fields to complete (${PROFILE_WEIGHTS.familyValues}% boost)`
      },
      {
        id: 'careerEducation',
        title: 'Career & Education',
        icon: 'briefcase',
        weight: PROFILE_WEIGHTS.careerEducation,
        completedFields: 0,
        totalFields: 5,
        requiredFields: 4,
        percentage: 0,
        isComplete: false,
        boostText: `4 fields to complete (${PROFILE_WEIGHTS.careerEducation}% boost)`
      },
      {
        id: 'physicalLifestyle',
        title: 'Physical & Lifestyle',
        icon: 'fitness',
        weight: PROFILE_WEIGHTS.physicalLifestyle,
        completedFields: 0,
        totalFields: 6,
        requiredFields: 6,
        percentage: 0,
        isComplete: false,
        boostText: `6 fields to complete (${PROFILE_WEIGHTS.physicalLifestyle}% boost)`
      },
      {
        id: 'locationImmigration',
        title: 'Location & Immigration',
        icon: 'location',
        weight: PROFILE_WEIGHTS.locationImmigration,
        completedFields: 0,
        totalFields: 4,
        requiredFields: 4,
        percentage: 0,
        isComplete: false,
        boostText: `4 fields to complete (${PROFILE_WEIGHTS.locationImmigration}% boost)`
      }
    ];
  }

  /**
   * Get a specific section's completion data
   */
  getSectionCompletion(user: User | null, sectionId: string): ProfileSection | null {
    const completion = this.calculateCompletion(user);
    return completion.sections.find(s => s.id === sectionId) || null;
  }

  /**
   * Check if minimum profile requirements are met for app usage
   */
  hasMinimumProfile(user: User | null): boolean {
    if (!user || !user.profile) return false;
    
    // Minimum requirements: photo, bio, and basic info
    const hasPhoto = !!(user.photos && user.photos.length > 0);
    const hasBio = !!(user.profile.bio && user.profile.bio.trim().length >= 20);
    const hasBasicInfo = !!(
      user.profile.first_name && 
      user.profile.last_name && 
      user.profile.gender &&
      user.profile.date_of_birth
    );

    return hasPhoto && hasBio && hasBasicInfo;
  }
}

export const profileCompletionService = new ProfileCompletionService(); 