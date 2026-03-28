import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Share,
  Modal,
  Animated,
  Easing,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from 'expo-file-system/legacy';

const { width } = Dimensions.get("window");

// --- CONFIGURATION ---
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || 'YOUR_REPLICATE_TOKEN';

const LOADING_MESSAGES = [
  "✨ Magic is happening...",
  "🎨 AI is painting your soul...",
  "🌟 Sprinkling creative dust...",
  "🖌️ Brushing on the details...",
  "💫 Your beauty is inspiring the AI...",
  "🔮 Summoning artistic powers...",
  "🎭 Transforming reality into art...",
  "⚡ Almost there, worth the wait...",
];

const STYLES = [
  { id: "cartoon", label: "Cartoon", prompt: "highly detailed cartoon portrait of a young indian male with black hair, Disney Pixar 3D animation style, warm skin tone, expressive eyes, vibrant colors, professional illustration, white background" },
  { id: "anime", label: "Anime", prompt: "detailed anime portrait of a young indian male with black hair, dark eyes, Studio Ghibli style, soft warm lighting, detailed face, high quality manga illustration" },
  { id: "pixel", label: "Pixel Art", prompt: "detailed pixel art portrait of a young indian male, 64x64 sprite, RPG game character, black hair, warm skin tone, retro 16-bit style, colorful" },
  { id: "sketch", label: "Sketch", prompt: "realistic pencil sketch portrait of a young indian male, black hair, detailed facial features, professional artist quality, fine line shading, white background" },
  { id: "flat", label: "Flat", prompt: "flat design vector portrait of a young indian male, black hair, warm brown skin, minimal illustration, bold colors, clean shapes, professional" },
];

export default function App() {
  const [image, setImage] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});
  const [loadingMessage, setLoadingMessage] = useState({});
  const [selectedImage, setSelectedImage] = useState(null);
  const [progress, setProgress] = useState(0);
  const [comparing, setComparing] = useState({}); // Stores which styles are in compare mode
  const [showAbout, setShowAbout] = useState(false);

  // Animations
  const skeletonAnim = useRef(new Animated.Value(0.3)).current;
  const fadeAnims = useRef(STYLES.reduce((acc, style) => ({ ...acc, [style.id]: new Animated.Value(0) }), {})).current;

  useEffect(() => {
    // Pulse animation for skeletons
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonAnim, { toValue: 1, duration: 1000, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(skeletonAnim, { toValue: 0.3, duration: 1000, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const pickImage = async () => {
    Alert.alert(
      "Upload Photo",
      "Choose a method to upload your photo",
      [
        { text: "Camera 📸", onPress: launchCamera },
        { text: "Gallery 🖼️", onPress: launchGallery },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const launchCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission Required", "Camera access is needed to take a photo.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      resetResults();
    }
  };

  const launchGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      resetResults();
    }
  };

  const resetResults = () => {
    setResults({});
    setLoading({});
    setProgress(0);
    setComparing({});
    Object.values(fadeAnims).forEach(anim => anim.setValue(0));
  };

  const generateAllStyles = async () => {
    if (!image) {
      Alert.alert("Error", "Please upload an image first!");
      return;
    }

    setGenerating(true);
    setProgress(0);
    
    for (let i = 0; i < STYLES.length; i++) {
      generateStyle(STYLES[i]);
      // Wait for 12 seconds before starting the next style to avoid rate limiting
      if (i < STYLES.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 12000));
      }
    }
    setGenerating(false);
  };

  const generateStyle = async (style) => {
    setLoading((prev) => ({ ...prev, [style.id]: true }));
    setLoadingMessage((prev) => ({ ...prev, [style.id]: LOADING_MESSAGES[0] }));
    
    let msgIndex = 0;
    const msgInterval = setInterval(() => {
      msgIndex = (msgIndex + 1) % LOADING_MESSAGES.length;
      setLoadingMessage((prev) => ({ ...prev, [style.id]: LOADING_MESSAGES[msgIndex] }));
    }, 2000);

    try {
      const response = await fetch("https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions", {
        method: "POST",
        headers: {
          Authorization: `Token ${REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: {
            prompt: style.prompt,
            num_outputs: 1,
            num_inference_steps: 4,
          },
        }),
      });

      const prediction = await response.json();
      if (!prediction.id) throw new Error(prediction.detail || "Failed to start generation");

      const poll = setInterval(async () => {
        try {
          const res = await fetch("https://api.replicate.com/v1/predictions/" + prediction.id, {
            headers: { Authorization: `Token ${REPLICATE_API_TOKEN}` },
          });
          const data = await res.json();
          if (data.status === "succeeded") {
            clearInterval(poll);
            clearInterval(msgInterval);
            
            const url = data.output[0];
            setResults((prev) => ({ ...prev, [style.id]: url }));
            setLoading((prev) => ({ ...prev, [style.id]: false }));
            setProgress((prev) => prev + 1);

            // Trigger fade-in animation
            Animated.timing(fadeAnims[style.id], {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }).start();

          } else if (data.status === "failed") {
            clearInterval(poll);
            clearInterval(msgInterval);
            setLoading((prev) => ({ ...prev, [style.id]: "failed" })); // Mark as specifically failed
          }
        } catch (pollError) {
          console.error(`Polling Error for ${style.id}:`, pollError);
        }
      }, 2000);
    } catch (error) {
      console.error(`Flux-Schnell Error for ${style.id}:`, error);
      clearInterval(msgInterval);
      setLoading((prev) => ({ ...prev, [style.id]: "failed" }));
    }
  };

  const shareImage = async (url) => {
    try {
      await Share.share({
        url: url,
        message: "Check out my ClipArt AI generated image! #ClipArtAI",
      });
    } catch (error) {
      Alert.alert("Error", "Could not share image.");
    }
  };

  const toggleCompare = (id) => {
    setComparing((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const isGenerating = (id) => loading[id] === true;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.logo}>ClipArt <Text style={styles.logoAccent}>AI</Text></Text>
          <TouchableOpacity onPress={() => setShowAbout(true)} style={styles.gearBtn}>
            <Text style={styles.gearIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>Premium Magic Art Generator</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Progress Bar */}
        {generating && (
          <View style={styles.progressSection}>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${(progress / STYLES.length) * 100}%` }]} />
            </View>
            <Text style={styles.progressLabel}>{progress} / {STYLES.length} styles complete</Text>
          </View>
        )}

        {/* Upload Section */}
        <View style={styles.uploadSection}>
          <TouchableOpacity 
            style={[styles.uploadBox, image && styles.uploadBoxActive]} 
            onPress={pickImage}
          >
            {image ? (
              <Image source={{ uri: image }} style={styles.previewImage} />
            ) : (
              <View style={styles.uploadPlaceholder}>
                <Text style={styles.uploadIcon}>📸</Text>
                <Text style={styles.uploadText}>Tap to Select or Take Photo</Text>
              </View>
            )}
          </TouchableOpacity>
          
          {image && (
            <View style={styles.actionsBox}>
              <TouchableOpacity 
                style={[styles.generateBtn, generating && styles.generateBtnDisabled]} 
                onPress={generateAllStyles}
                disabled={generating}
              >
                <Text style={styles.generateBtnText}>
                  {generating ? `Generating... ${progress}/${STYLES.length}` : "✨ Generate All Styles"}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.resetBtn} onPress={() => { setImage(null); resetResults(); }}>
                <Text style={styles.resetBtnText}>🔄 Reset</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Results Grid */}
        <View style={styles.grid}>
          {STYLES.map((style) => (
            <View key={style.id} style={[styles.resultCard, isGenerating(style.id) && styles.cardGlow]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{style.label}</Text>
                {results[style.id] && (
                  <TouchableOpacity onPress={() => toggleCompare(style.id)}>
                    <Text style={styles.compareLink}>{comparing[style.id] ? "Show Result" : "Compare"}</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.imageContainer}>
                {results[style.id] ? (
                  <Animated.View style={{ flex: 1, opacity: fadeAnims[style.id] }}>
                    {comparing[style.id] ? (
                      <View style={styles.compareView}>
                        <View style={styles.compareHalf}>
                          <Image source={{ uri: image }} style={styles.compareImage} />
                          <Text style={styles.compareLabel}>Original</Text>
                        </View>
                        <View style={styles.compareHalf}>
                          <Image source={{ uri: results[style.id] }} style={styles.compareImage} />
                          <Text style={styles.compareLabel}>AI Art</Text>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity onPress={() => setSelectedImage(results[style.id])} style={styles.fullImageTouch}>
                        <Image source={{ uri: results[style.id] }} style={styles.resultImage} />
                      </TouchableOpacity>
                    )}
                    
                    {!comparing[style.id] && (
                      <TouchableOpacity style={styles.shareIconBtn} onPress={() => shareImage(results[style.id])}>
                        <Text style={styles.shareBtnText}>📤 Share</Text>
                      </TouchableOpacity>
                    )}
                  </Animated.View>
                ) : loading[style.id] === "failed" ? (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorIcon}>⚠️</Text>
                    <Text style={styles.errorText}>Failed to generate</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={() => generateStyle(style)}>
                      <Text style={styles.retryBtnText}>Retry 🔄</Text>
                    </TouchableOpacity>
                  </View>
                ) : loading[style.id] === true ? (
                  <View style={styles.skeletonWrapper}>
                    <Animated.View style={[styles.skeletonBlock, { opacity: skeletonAnim }]} />
                    <View style={styles.loadingOverlay}>
                      <ActivityIndicator color="#a78bfa" size="small" />
                      <Text style={styles.loadingText}>
                        {loadingMessage[style.id] || "✨ Initiating..."}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.emptyPlaceholder}>
                    <View style={styles.emptyIconCircle}>
                      <Text style={styles.emptyIcon}>🎨</Text>
                    </View>
                    <Text style={styles.emptyText}>Waiting to paint...</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Fullscreen Preview Modal */}
      <Modal visible={!!selectedImage} transparent={true} animationType="fade">
        <TouchableOpacity 
          style={styles.modalBackdrop} 
          activeOpacity={1} 
          onPress={() => setSelectedImage(null)}
        >
          <View style={styles.modalContent}>
            <Image source={{ uri: selectedImage }} style={styles.modalImage} resizeMode="contain" />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalShareBtn} onPress={() => shareImage(selectedImage)}>
                <Text style={styles.modalShareText}>Share this Masterpiece 📤</Text>
              </TouchableOpacity>
              <Text style={styles.closeHint}>Tap anywhere to close</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* About Modal */}
      <Modal visible={showAbout} transparent={true} animationType="slide">
        <View style={styles.aboutModalBackdrop}>
          <View style={styles.aboutModalContent}>
            <Text style={styles.aboutEmoji}>🚀</Text>
            <Text style={styles.aboutTitle}>About the Project</Text>
            
            <View style={styles.aboutBody}>
              <Text style={styles.aboutText}>Built in 20 hours (not 72) by a first-time React Native developer 😎</Text>
              <Text style={styles.aboutText}>Powered by AI, desperation, and 3 cups of chai ☕</Text>
              <Text style={styles.aboutFlickd}>Flickd — please hire me, I promise I ship fast!</Text>
            </View>

            <TouchableOpacity 
              style={styles.aboutCloseBtn} 
              onPress={() => setShowAbout(false)}
            >
              <Text style={styles.aboutCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <StatusBar style="light" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f0f1a",
  },
  header: {
    padding: 20,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gearBtn: {
    padding: 5,
  },
  gearIcon: {
    fontSize: 24,
  },
  logo: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#fff",
    letterSpacing: 1,
  },
  logoAccent: {
    color: "#a78bfa",
  },
  subtitle: {
    color: "#94a3b8",
    fontSize: 14,
    marginTop: 4,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  progressSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: "#1e1e2d",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#a78bfa",
  },
  progressLabel: {
    color: "#94a3b8",
    fontSize: 12,
    textAlign: "right",
    marginTop: 6,
  },
  uploadSection: {
    padding: 20,
    alignItems: "center",
  },
  uploadBox: {
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#1e1e2d",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: "#161625",
  },
  uploadBoxActive: {
    borderStyle: "solid",
    borderColor: "#a78bfa",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  uploadPlaceholder: {
    alignItems: "center",
  },
  uploadIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  uploadText: {
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "500",
  },
  actionsBox: {
    marginTop: 20,
    width: "100%",
    alignItems: "center",
  },
  generateBtn: {
    backgroundColor: "#a78bfa",
    width: width * 0.8,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#a78bfa",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  generateBtnDisabled: {
    opacity: 0.7,
    backgroundColor: "#4c4c6a",
  },
  generateBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  resetBtn: {
    marginTop: 15,
    padding: 8,
  },
  resetBtnText: {
    color: "#94a3b8",
    fontSize: 14,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 10,
    justifyContent: "space-between",
  },
  resultCard: {
    width: (width - 40) / 2,
    backgroundColor: "#161625",
    borderRadius: 20,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#1e1e2d",
  },
  cardGlow: {
    borderColor: "#a78bfa",
    shadowColor: "#a78bfa",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  compareLink: {
    color: "#a78bfa",
    fontSize: 12,
  },
  imageContainer: {
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#0f0f1a",
  },
  fullImageTouch: {
    flex: 1,
  },
  resultImage: {
    width: "100%",
    height: "100%",
  },
  shareIconBtn: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(167, 139, 250, 0.9)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  shareBtnText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  skeletonWrapper: {
    flex: 1,
  },
  skeletonBlock: {
    flex: 1,
    backgroundColor: "#1e1e2d",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
  },
  loadingText: {
    color: "#a78bfa",
    fontSize: 10,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 14,
  },
  emptyPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1e1e2d",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  emptyIcon: {
    fontSize: 18,
  },
  emptyText: {
    color: "#475569",
    fontSize: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1e1212",
  },
  errorIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  errorText: {
    color: "#f87171",
    fontSize: 10,
    marginBottom: 10,
  },
  retryBtn: {
    backgroundColor: "#4c1d1d",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retryBtnText: {
    color: "#f87171",
    fontSize: 10,
    fontWeight: "bold",
  },
  compareView: {
    flex: 1,
    flexDirection: "row",
  },
  compareHalf: {
    flex: 1,
    alignItems: "center",
  },
  compareImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  compareLabel: {
    position: "absolute",
    bottom: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    color: "#fff",
    fontSize: 8,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
  },
  modalContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalImage: {
    width: "100%",
    height: "100%",
  },
  modalActions: {
    position: "absolute",
    bottom: 50,
    alignItems: "center",
    width: "100%",
  },
  modalShareBtn: {
    backgroundColor: "#a78bfa",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
    marginBottom: 20,
  },
  modalShareText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  closeHint: {
    color: "#94a3b8",
    fontSize: 14,
  },
  // About Modal Styles
  aboutModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 15, 26, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  aboutModalContent: {
    backgroundColor: "#161625",
    width: "100%",
    borderRadius: 30,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e1e2d",
  },
  aboutEmoji: {
    fontSize: 60,
    marginBottom: 20,
  },
  aboutTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  aboutBody: {
    width: "100%",
    marginBottom: 30,
  },
  aboutText: {
    color: "#94a3b8",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 15,
    lineHeight: 24,
  },
  aboutFlickd: {
    color: "#a78bfa",
    fontSize: 18,
    textAlign: "center",
    fontWeight: "bold",
    marginTop: 10,
  },
  aboutCloseBtn: {
    backgroundColor: "#a78bfa",
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 20,
    width: "100%",
    alignItems: "center",
  },
  aboutCloseBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
