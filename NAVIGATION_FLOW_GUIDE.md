# Registration Flow Navigation Guide

## Overview
This document outlines the optimized 7-step registration flow navigation and key implementation details.

## Navigation Flow

### Entry Point
- **Route**: `/registration` → **Auto-redirects to** → `/registration/basic-info`
- **File**: `app/registration/index.tsx`
- **Purpose**: Shows loading screen and redirects to optimized flow

### Step 1: Basic Information
- **Route**: `/registration/basic-info`
- **File**: `app/registration/basic-info.tsx`
- **Progress**: 1/7 (14%)
- **Data Collected**:
  - Gender (male/female)
  - First Name
  - Last Name  
  - Date of Birth
  - Age (calculated)
- **Next**: `/registration/contact-info`
- **Validation**: All fields required, must be 18+

### Step 2: Contact Information
- **Route**: `/registration/contact-info`
- **File**: `app/registration/contact-info.tsx`
- **Progress**: 2/7 (29%)
- **Data Collected**:
  - Email (optional but recommended)
- **Next**: `/registration/about-you`
- **Validation**: Email format check, availability check if provided
- **Features**: Skip option available

### Step 3: About You
- **Route**: `/registration/about-you`
- **File**: `app/registration/about-you.tsx`
- **Progress**: 3/7 (43%)
- **Data Collected**:
  - Relationship Status (single, married, divorced, etc.)
  - Occupation Type (employee, student, business, unemployed)
  - Specific Profession (text input)
- **Next**: `/registration/preferences`
- **Validation**: All fields required

### Step 4: Your Preferences
- **Route**: `/registration/preferences`
- **File**: `app/registration/preferences.tsx`
- **Progress**: 4/7 (57%)
- **Data Collected**:
  - Looking For (casual, serious, friendship, all)
  - Bio (optional, min 20 chars if provided)
- **Next**: `/registration/interests`
- **Validation**: Looking For required, bio optional with length validation

### Step 5: Interests
- **Route**: `/registration/interests`
- **File**: `app/registration/interests.tsx`
- **Progress**: 5/7 (71%)
- **Data Collected**:
  - Interests selection (1-8 interests from 16 options)
- **Next**: `/registration/photos`
- **Validation**: At least 1 interest, maximum 8 interests

### Step 6: Photos
- **Route**: `/registration/photos`
- **File**: `app/registration/photos.tsx`
- **Progress**: 6/7 (86%)
- **Data Collected**:
  - Main photo (required)
  - Additional photos (up to 5)
  - Private photo settings
- **Next**: `/registration/location`
- **Validation**: Main photo required

### Step 7: Location
- **Route**: `/registration/location`
- **File**: `app/registration/location.tsx`
- **Progress**: 7/7 (100%)
- **Data Collected**:
  - Country (required)
  - State/Province (optional)
  - Region (optional)
  - City (required)
- **Next**: `/registration/preview`
- **Validation**: Country and city required

### Preview & Completion
- **Route**: `/registration/preview`
- **File**: `app/registration/preview.tsx`
- **Purpose**: Show complete profile preview and submit registration
- **Features**: Edit option to go back and modify information
- **Final Action**: Complete registration and navigate to main app

## Progress Bar Details

The progress bar is automatically managed by the `RegistrationLayout` component:

```typescript
// In RegistrationLayout component
const progress = (currentStep / totalSteps) * 100;

// Progress bar shows:
// - Visual progress bar (0-100%)
// - "Step X of 7" text
// - "X% Complete" text
```

### Progress Breakdown:
- Step 1: 14% (1/7)
- Step 2: 29% (2/7) 
- Step 3: 43% (3/7)
- Step 4: 57% (4/7)
- Step 5: 71% (5/7)
- Step 6: 86% (6/7)
- Step 7: 100% (7/7)

## Parameter Flow

### Data Structure
Each step collects specific data and passes it through URL parameters to the next step:

```typescript
// Basic Info → Contact Info
{
  gender: 'male' | 'female',
  firstName: string,
  lastName: string,
  dateOfBirth: string (ISO),
  age: string
}

// Contact Info → About You
{
  ...previousData,
  email: string
}

// About You → Preferences  
{
  ...previousData,
  status: string,
  occupation: string,
  profession: string
}

// Preferences → Interests
{
  ...previousData,
  lookingFor: string,
  bio: string
}

// Interests → Photos
{
  ...previousData,
  interests: string (comma-separated)
}

// Photos → Location
{
  ...previousData,
  photoCount: string,
  photosData: string (JSON),
  privateProfile: string
}

// Location → Preview
{
  ...previousData,
  country: string,
  countryCode: string,
  state: string,
  region: string,
  city: string
}
```

## Error Handling

### Consistent Error Patterns
All screens use consistent error handling:

```typescript
// Error state
const [error, setError] = useState('');

// Error display component
{error && (
  <Box bg="$error50" borderColor="$error200" borderWidth="$1" borderRadius="$md" px="$4" py="$3">
    <HStack space="sm" alignItems="center">
      <AlertCircleIcon size="sm" color="$error600" />
      <Text size="sm" color="$error700" fontWeight="$medium" flex={1}>
        {error}
      </Text>
    </HStack>
  </Box>
)}

// Clear error on input change
const clearError = () => {
  if (error) setError('');
};
```

## Navigation Methods

### Forward Navigation
```typescript
// Standard forward navigation
router.push({
  pathname: '/registration/next-step',
  params: {
    ...currentParams,
    newData: 'value'
  }
});
```

### Back Navigation
```typescript
// Handled by RegistrationLayout
// Users can go back using header back button
// Data is preserved in URL parameters
```

### Skip Options
```typescript
// Available in Contact Info step
const handleSkip = () => {
  router.push({
    pathname: '/registration/about-you',
    params: {
      ...params,
      email: ''
    }
  });
};
```

## File Organization

### New Optimized Files
```
app/registration/
├── index.tsx             # Entry point (redirects)
├── basic-info.tsx        # Step 1: Gender + Name + DOB
├── contact-info.tsx      # Step 2: Email  
├── about-you.tsx         # Step 3: Status + Occupation + Profession
├── preferences.tsx       # Step 4: Looking For + Bio
├── interests.tsx         # Step 5: Interests
├── photos.tsx           # Step 6: Photos
├── location.tsx         # Step 7: Location
├── preview.tsx          # Preview & Submit
└── old-flow-backup/     # Backup of old files
    ├── email.tsx
    ├── bio.tsx
    ├── status.tsx
    ├── looking-for.tsx
    ├── name.tsx
    └── dob.tsx
```

## Testing Checklist

### Manual Testing Steps
1. **Entry Point**: Navigate to `/registration` → Should redirect to `/registration/basic-info`
2. **Step 1**: Fill basic info → Should navigate to contact-info
3. **Step 2**: Add email or skip → Should navigate to about-you
4. **Step 3**: Complete about you info → Should navigate to preferences
5. **Step 4**: Set preferences → Should navigate to interests
6. **Step 5**: Select interests → Should navigate to photos
7. **Step 6**: Upload photos → Should navigate to location
8. **Step 7**: Set location → Should navigate to preview
9. **Preview**: Review and submit → Should complete registration

### Progress Bar Testing
- [ ] Progress bar starts at 14% (Step 1/7)
- [ ] Progress increases correctly at each step
- [ ] Progress reaches 100% at Step 7
- [ ] Step counter shows "Step X of 7" correctly
- [ ] Percentage display matches visual progress

### Error Handling Testing
- [ ] All required field validations work
- [ ] Error messages are clear and helpful
- [ ] Errors clear when user corrects input
- [ ] Age validation (18+) works correctly
- [ ] Email format validation works
- [ ] Interest selection limits work (1-8)

### Navigation Testing
- [ ] Forward navigation preserves all data
- [ ] Back navigation works correctly
- [ ] Data persists when going back and forward
- [ ] Skip options work where available
- [ ] Final submission works correctly

## Performance Considerations

### Bundle Size Impact
- **Reduced**: 30% fewer screens to load
- **Consolidated**: Better code reuse across components
- **Optimized**: Fewer navigation transitions

### User Experience Impact
- **Faster**: 30% fewer steps reduces completion time
- **Clearer**: Better logical grouping improves understanding
- **Smoother**: Consistent patterns reduce cognitive load

## Future Enhancements

### Potential Improvements
1. **Auto-save**: Save progress automatically as user types
2. **Resume**: Allow users to resume where they left off
3. **Validation**: Real-time validation feedback
4. **Analytics**: Track drop-off rates at each step
5. **A/B Testing**: Compare old vs new flow performance
6. **Accessibility**: Enhanced screen reader support
7. **Internationalization**: Multi-language support 