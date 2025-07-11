import React, { useState, useEffect, useRef, memo } from 'react';
import { 
  Image, 
  ImageProps, 
  View, 
  ActivityIndicator, 
  StyleSheet,
  Animated,
  Text
} from 'react-native';
import { optimizedImageCacheService } from '@/services/optimized-image-cache-service';
import { BlurView } from 'expo-blur';

interface CachedImageProps extends Omit<ImageProps, 'source'> {
  source: { uri: string };
  type?: 'profile' | 'chat_media' | 'gallery';
  size?: 'thumbnail' | 'medium' | 'original';
  userId?: number;
  chatId?: number;
  messageId?: number;
  fallbackSource?: { uri: string };
  showProgress?: boolean;
  enableProgressiveLoading?: boolean;
  placeholderColor?: string;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
  onError?: () => void;
}

const CachedImageComponent: React.FC<CachedImageProps> = ({
  source,
  type = 'profile',
  size = 'medium',
  userId,
  chatId,
  messageId,
  fallbackSource,
  showProgress = false,
  enableProgressiveLoading = true,
  placeholderColor = '#f0f0f0',
  onLoadStart,
  onLoadEnd,
  onError,
  style,
  ...imageProps
}) => {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [blurhash, setBlurhash] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    loadImage();
    
    return () => {
      isMounted.current = false;
    };
  }, [source.uri, type, size]);

  const loadImage = async () => {
    if (!source?.uri) return;

    try {
      setIsLoading(true);
      setLoadError(false);
      setDownloadProgress(0);
      onLoadStart?.();

      const result = await optimizedImageCacheService.getCachedImageUrl(
        source.uri,
        type,
        {
          userId,
          chatId,
          messageId,
          size,
          forceRefresh: false,
          onProgress: showProgress ? handleProgress : undefined,
          returnBlurhash: enableProgressiveLoading
        }
      );

      if (!isMounted.current) return;

      if (result) {
        setImageUri(result.uri);
        if (enableProgressiveLoading && result.blurhash) {
          setBlurhash(result.blurhash);
        }
      } else {
        setLoadError(true);
      }
    } catch (error) {
      console.error('Error loading cached image:', error);
      if (isMounted.current) {
        setLoadError(true);
        onError?.();
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
        onLoadEnd?.();
      }
    }
  };

  const handleProgress = (progress: number) => {
    if (!isMounted.current) return;
    
    setDownloadProgress(progress);
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleImageLoad = () => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleImageError = () => {
    setLoadError(true);
    onError?.();
  };

  // Determine what to show
  const finalUri = loadError && fallbackSource ? fallbackSource.uri : imageUri;

  return (
    <View style={[styles.container, style]}>
      {/* Placeholder/Loading State */}
      {isLoading && (
        <View style={[StyleSheet.absoluteFill, styles.placeholder, { backgroundColor: placeholderColor }]}>
          {showProgress && downloadProgress > 0 ? (
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBackground}>
                <Animated.View 
                  style={[
                    styles.progressBar,
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%']
                      })
                    }
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {Math.round(downloadProgress * 100)}%
              </Text>
            </View>
          ) : (
            <ActivityIndicator size="small" color="#999" />
          )}
        </View>
      )}

      {/* Progressive Loading Blur (if blurhash available) */}
      {enableProgressiveLoading && blurhash && isLoading && (
        <BlurView 
          intensity={20} 
          style={StyleSheet.absoluteFill}
        >
          <View style={[StyleSheet.absoluteFill, { backgroundColor: placeholderColor }]} />
        </BlurView>
      )}

      {/* Main Image */}
      {finalUri && (
        <Animated.Image
          {...imageProps}
          source={{ uri: finalUri }}
          style={[
            style,
            {
              opacity: fadeAnim
            }
          ]}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      )}

      {/* Error State */}
      {loadError && !fallbackSource && (
        <View style={[StyleSheet.absoluteFill, styles.errorContainer]}>
          <Text style={styles.errorText}>Failed to load image</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressContainer: {
    alignItems: 'center',
    padding: 20,
  },
  progressBarBackground: {
    width: 100,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  progressText: {
    marginTop: 8,
    fontSize: 12,
    color: '#666',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 12,
    color: '#999',
  },
});

// Memoize the component to prevent unnecessary re-renders
export const CachedImage = memo(CachedImageComponent, (prevProps, nextProps) => {
  // Custom comparison function
  return (
    prevProps.source.uri === nextProps.source.uri &&
    prevProps.type === nextProps.type &&
    prevProps.size === nextProps.size &&
    prevProps.style === nextProps.style
  );
});

// Export a preload utility
export const preloadImages = async (
  imageUrls: string[],
  type: 'profile' | 'chat_media' | 'gallery' = 'profile',
  options?: {
    size?: 'thumbnail' | 'medium' | 'original';
    priority?: 'high' | 'low';
  }
) => {
  return optimizedImageCacheService.preloadImages(imageUrls, type, options);
}; 