import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Camera, CameraView } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { uploadProfileImage } from '../../api/user.js';

interface ProfileOption {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  iconType: 'Ionicons' | 'MaterialIcons';
  onPress: () => void;
}

export default function Profile() {
  const { user, logout, refreshUser } = useAuth();
  const [cameraModalVisible, setCameraModalVisible] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);
  const [cameraType, setCameraType] = useState<'front' | 'back'>('front');
  const [flashMode, setFlashMode] = useState<'off' | 'on' | 'auto'>('off');
  const [zoom, setZoom] = useState(0);
  const [isUpdatingImage, setIsUpdatingImage] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  // Debug: Log user object and profile image URL
  console.log('🔍 User object:', user);
  console.log('🖼️ Profile image URL:', user?.profileImageUrl);
  console.log('🖼️ User ID:', user?.id);

  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setCameraPermission(status === 'granted');
    return status === 'granted';
  };

  const openCamera = async () => {
    const hasPermission = await requestCameraPermission();
    if (hasPermission) {
      setZoom(0); // Reset zoom when opening camera
      setCameraModalVisible(true);
    } else {
      Alert.alert('Permission needed', 'Camera permissions are required to take photos.');
    }
  };

  const updateProfileImage = async (imageUri: string) => {
    if (!user?.id) {
      Alert.alert('Error', 'User not found. Please try logging in again.');
      return;
    }

    setIsUpdatingImage(true);
    
    try {
      console.log('📤 Uploading new profile image...');
      const result = await uploadProfileImage(user.id, imageUri) as any;
      
      if (result.success) {
        // Refresh user data to get the new profile image URL
        await refreshUser();
        Alert.alert('Success', 'Profile image updated successfully!');
      } else {
        Alert.alert('Error', result.message || 'Failed to upload image. Please try again.');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    } finally {
      setIsUpdatingImage(false);
    }
  };

  const takePhoto = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
        });
        setCameraModalVisible(false);
        await updateProfileImage(photo.uri);
      } catch (error) {
        Alert.alert('Error', 'Failed to take photo. Please try again.');
      }
    }
  };

  const toggleCameraType = () => {
    setCameraType(current => current === 'back' ? 'front' : 'back');
  };

  const toggleFlash = () => {
    setFlashMode(current => {
      if (current === 'off') return 'on';
      if (current === 'on') return 'auto';
      return 'off';
    });
  };

  const getFlashIcon = () => {
    switch (flashMode) {
      case 'on': return 'flash';
      case 'auto': return 'flash-outline';
      default: return 'flash-off';
    }
  };

  const zoomIn = () => {
    setZoom(current => Math.min(current + 0.1, 1));
  };

  const zoomOut = () => {
    setZoom(current => Math.max(current - 0.1, 0));
  };

  const pickImage = async () => {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera roll permissions are required to select a photo.');
      return;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      await updateProfileImage(result.assets[0].uri);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Change Profile Picture',
      'Choose an option',
      [
        {
          text: '📸 Take Photo',
          onPress: () => {
            // Simple camera launch without modal
            ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              quality: 0.8,
            }).then(result => {
              if (!result.canceled) {
                updateProfileImage(result.assets[0].uri);
              }
            }).catch(error => {
              Alert.alert('Error', 'Failed to open camera');
            });
          }
        },
        {
          text: '🖼️ Choose from Gallery',
          onPress: pickImage
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const profileOptions: ProfileOption[] = [
    {
      id: 'personal',
      title: 'Edit Personal Information',
      subtitle: 'Update your name, email, and contact details',
      icon: 'person-outline',
      iconType: 'Ionicons',
      onPress: () => router.push('/profileSettings/personal'),
    },
    {
      id: 'notifications',
      title: 'Notifications',
      subtitle: 'Manage notification preferences',
      icon: 'notifications-outline',
      iconType: 'Ionicons',
      onPress: () => router.push('/profileSettings/notifications'),
    },
    {
      id: 'privacy',
      title: 'Privacy & Security',
      subtitle: 'Control your privacy settings',
      icon: 'shield-outline',
      iconType: 'Ionicons',
      onPress: () => router.push('/profileSettings/privacy'),
    },
    {
      id: 'help',
      title: 'Help & Support',
      subtitle: 'Get help and contact support',
      icon: 'help-circle-outline',
      iconType: 'Ionicons',
      onPress: () => router.push('/profileSettings/help'),
    },
    {
      id: 'about',
      title: 'About',
      subtitle: 'App version and information',
      icon: 'information-circle-outline',
      iconType: 'Ionicons',
      onPress: () => router.push('/profileSettings/about'),
    },
    {
      id: 'advanced',
      title: 'Advanced',
      subtitle: 'Advanced settings and account management',
      icon: 'settings-outline',
      iconType: 'Ionicons',
      onPress: () => router.push('/profileSettings/advanced'),
    },
  ];

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await logout();
              router.replace('/auth/phone' as any);
            } catch (error) {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you absolutely sure you want to delete your account? This action cannot be undone and all your data will be permanently lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Account Deletion', 'Account deletion request has been submitted. You will receive a confirmation email.');
          }
        },
      ]
    );
  };

  const handleAdvancedPress = () => {
    Alert.alert(
      'Advanced Settings',
      'Select an option:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Data Management',
          onPress: () => Alert.alert('Coming Soon', 'Data management features will be available soon!')
        },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: handleDeleteAccount
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              {user?.profileImageUrl ? (
                <Image 
                  source={{ uri: user.profileImageUrl }} 
                  style={styles.avatarImage}
                  onError={(error) => console.log('❌ Image load error:', error)}
                  onLoad={() => console.log('✅ Image loaded successfully')}
                />
              ) : (
                <Ionicons name="person" size={40} color="#666666" />
              )}
              {isUpdatingImage && (
                <View style={styles.imageLoadingOverlay}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
              )}
            </View>
            <TouchableOpacity 
              style={styles.editAvatarButton} 
              onPress={showImageOptions}
              disabled={isUpdatingImage}
            >
              <Ionicons name="camera" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.fullName || user?.phoneNumber || 'User'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'No email provided'}</Text>
            <Text style={styles.userLocation}>{user?.phoneNumber || 'Phone not available'}</Text>
          </View>
        </View>

        {/* Statistics Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{user?.totalReports || 0}</Text>
            <Text style={styles.statLabel}>Complaints</Text>
            <Text style={styles.statSubLabel}>Submitted</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{user?.resolvedReports || 0}</Text>
            <Text style={styles.statLabel}>Resolved</Text>
            <Text style={styles.statSubLabel}>Total</Text>
          </View>
          {/* <View style={styles.statCard}>
            <Text style={styles.statNumber}>{(user?.totalReports || 0) - (user?.resolvedReports || 0)}</Text>
            <Text style={styles.statLabel}>Pending</Text>
            <Text style={styles.statSubLabel}>Active</Text>
          </View> */}
        </View>

        {/* Settings Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          {profileOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.optionCard}
              onPress={option.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.optionLeft}>
                {option.iconType === 'Ionicons' ? (
                  <Ionicons name={option.icon as any} size={24} color="#666666" />
                ) : (
                  <MaterialIcons name={option.icon as any} size={24} color="#666666" />
                )}
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CCCCCC" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Account Actions */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={20} color="#F44336" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Civic Reporter v1.0.0</Text>
          <Text style={styles.copyrightText}>© 2024 Civic Solutions</Text>
        </View>
      </ScrollView>

      {/* Camera Modal */}
      <Modal
        visible={cameraModalVisible}
        animationType="slide"
        onRequestClose={() => setCameraModalVisible(false)}
      >
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={cameraType}
            flash={flashMode}
            zoom={zoom}
          >
            <View style={styles.cameraOverlay}>
              <View style={styles.cameraHeader}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setCameraModalVisible(false)}
                >
                  <Ionicons name="close" size={30} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.cameraControls}>
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={toggleFlash}
                >
                  <Ionicons name={getFlashIcon()} size={24} color="#FFFFFF" />
                  <Text style={styles.controlText}>Flash</Text>
                </TouchableOpacity>

                <View style={styles.zoomContainer}>
                  <TouchableOpacity
                    style={styles.zoomButton}
                    onPress={zoomOut}
                    disabled={zoom <= 0}
                  >
                    <Ionicons name="remove" size={20} color={zoom <= 0 ? "#666666" : "#FFFFFF"} />
                  </TouchableOpacity>

                  <View style={styles.zoomIndicator}>
                    <Text style={styles.zoomText}>{Math.round(zoom * 100)}%</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.zoomButton}
                    onPress={zoomIn}
                    disabled={zoom >= 1}
                  >
                    <Ionicons name="add" size={20} color={zoom >= 1 ? "#666666" : "#FFFFFF"} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={toggleCameraType}
                >
                  <Ionicons name="camera-reverse" size={24} color="#FFFFFF" />
                  <Text style={styles.controlText}>Flip</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.cameraFooter}>
                <View style={styles.captureContainer}>
                  <TouchableOpacity
                    style={styles.captureButton}
                    onPress={takePhoto}
                  >
                    <View style={styles.captureButtonInner} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </CameraView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 30,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 123,
    height: 123,
    borderRadius: 60,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FF6B35',
    marginTop: 20,
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 2,
  },
  userLocation: {
    fontSize: 12,
    color: '#999999',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 20,
    justifyContent: 'space-around',
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minWidth: 80,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 2,
  },
  statSubLabel: {
    fontSize: 10,
    color: '#999999',
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  quickActionButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minWidth: 80,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  quickActionText: {
    fontSize: 12,
    color: '#FF6B35',
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  optionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionText: {
    marginLeft: 12,
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333333',
    marginBottom: 2,
  },
  optionSubtitle: {
    fontSize: 12,
    color: '#999999',
  },
  logoutButton: {
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFE5E5',
  },
  logoutText: {
    fontSize: 16,
    color: '#F44336',
    fontWeight: '500',
    marginLeft: 8,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  versionText: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 4,
  },
  copyrightText: {
    fontSize: 10,
    color: '#CCCCCC',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 20,
    paddingTop: 50,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 50,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginBottom: 20,
  },
  controlButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    padding: 12,
    minWidth: 70,
  },
  controlText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  captureContainer: {
    alignItems: 'center',
  },
  zoomContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  zoomButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  zoomIndicator: {
    minWidth: 50,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  zoomText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
