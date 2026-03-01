'use client';
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import api from "@/utils/api";
import toast from "react-hot-toast";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "@/hooks/useSpeechSynthesis";
import {
  TriangleAlert,
  ArrowLeft,
  Mic,
  MicOff,
  Settings,
  Globe,
  StopCircle,
  Send,
  Siren,
  CheckCircle2,
  Bot,
  User,
  Volume2,
  X,
  Shield,
  Clock,
  MapPin,
  AlertCircle,
  Navigation,
  ChevronRight,
  Search,
  ImageIcon,
  Loader2,
  AlertTriangle,
  ShieldAlert,
  Camera,
  FolderOpen,
  Pencil,
  Check,
  FileText,
} from "lucide-react";

export default function ComplaintPage() {
  const _auth = useAuth();
  const user = _auth?.user;
  const logoutCitizen = _auth?.logoutCitizen;
  const router = useRouter();

  const [messages, setMessages] = useState([
    {
      id: "1",
      text: `Hello! I'm REVA, your AI Police Assistant. How can I help you today?`,
      role: "ai",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [input, setInput] = useState("");
  const [autoStop, setAutoStop] = useState(false);
  const [autoResumeMic, setAutoResumeMic] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [language, setLanguage] = useState(
    user?.language === "hi" ? "hi" : "en",
  );

  const [location, setLocation] = useState(null);
  const [activeStation, setActiveStation] = useState(null);
  const [isWithinGeofence, setIsWithinGeofence] = useState(false);
  const [isCheckingGeofence, setIsCheckingGeofence] = useState(false);
  const [showStationPicker, setShowStationPicker] = useState(false);
  const [availableStations, setAvailableStations] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMediaUploading, setIsMediaUploading] = useState(false);
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraMode, setCameraMode] = useState("photo"); // "photo" | "video"
  const [isRecording, setIsRecording] = useState(false);
  const [isTextChatEnabled, setIsTextChatEnabled] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [pendingEvidenceIds, setPendingEvidenceIds] = useState([]);
  const [showNameModal, setShowNameModal] = useState(false);
  const [tempName, setTempName] = useState("");
  const lastAiDataRef = useRef(null);

  // ── Age-adaptive state ─────────────────────────────────────────────────
  const [isGreetingResponded, setIsGreetingResponded] = useState(false);
  const [isAgeCollected, setIsAgeCollected] = useState(false);
  const [userAge, setUserAge] = useState(null);
  const [userCategory, setUserCategory] = useState(null); // "child" | "adult" | "senior"

  // ── Personal info intake state ─────────────────────────────────────────
  const [isFathersNameCollected, setIsFathersNameCollected] = useState(false);
  const [isOccupationCollected, setIsOccupationCollected] = useState(false);
  const [isAddressCollected, setIsAddressCollected] = useState(false);
  const [userFathersName, setUserFathersName] = useState(null);
  const [userOccupation, setUserOccupation] = useState(null);
  const [userAddress, setUserAddress] = useState(null);

  // ── Edit message state ────────────────────────────────────────────────
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editedText, setEditedText] = useState("");

  // ── Age message tracking ─────────────────────────────────────────────
  const ageMessageIdRef = useRef(null);

  const messagesEndRef = useRef(null);
  const shouldProcessRef = useRef(false);
  const imageFileRef = useRef(null);
  const cameraPhotoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const cameraVideoElRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  const getLocale = (lang) => {
    const locales = {
      en: "en-IN",
      hi: "hi-IN",
      te: "te-IN",
      ta: "ta-IN",
      kn: "kn-IN",
      mr: "mr-IN",
      bn: "bn-IN",
      gu: "gu-IN",
      ml: "ml-IN",
      pa: "pa-IN",
    };
    return locales[lang] || "en-IN";
  };

  // Initialize Voice Hooks
  const {
    isListening,
    isInitializing,
    transcript: sttTranscript,
    interimTranscript,
    startListening: startSTT,
    stopListening: stopSTT,
    resetTranscript,
  } = useSpeechRecognition(getLocale(language), autoStop);

  const {
    speak,
    cancel: cancelSpeech,
    speaking: isSpeaking,
    voices,
  } = useSpeechSynthesis();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [messages, interimTranscript, isLoading]);

  // ── Refresh / tab-close guard ───────────────────────────────────────────
  // Always warn when leaving the complaint page — browser dialog on F5/Ctrl-R/close
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "Your complaint session will be lost. Are you sure you want to leave?";
      return e.returnValue;
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // ── Custom back-navigation confirmation modal state ─────────────────────
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const handleBackClick = () => setShowLeaveModal(true);
  const confirmLeave = () => { setShowLeaveModal(false); router.back(); };
  const cancelLeave = () => setShowLeaveModal(false);

  // Auto-enable mic after AI finishes speaking (Hands-free mode)
  const prevSpeakingRef = useRef(false);
  useEffect(() => {
    if (
      autoResumeMic &&
      prevSpeakingRef.current === true &&
      isSpeaking === false
    ) {
      const timer = setTimeout(() => {
        if (!isListening && !isSpeaking && !isLoading && !isSubmitting) {
          resetTranscript();
          startSTT();
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
    prevSpeakingRef.current = isSpeaking;
  }, [
    isSpeaking,
    isListening,
    isLoading,
    isSubmitting,
    startSTT,
    resetTranscript,
  ]);

  const [isSecureHandshakeComplete, setIsSecureHandshakeComplete] =
    useState(false);
  const [handshakeStep, setHandshakeStep] = useState(0);

  useEffect(() => {
    if (user && !user.name && !user.isAnonymous) {
      setShowNameModal(true);
    }
  }, [user]);

  const handleSaveName = async () => {
    if (!tempName.trim()) return toast.error("Please enter your name");
    // Always close the modal so the user isn't stuck
    setShowNameModal(false);
    try {
      if (user && !user.isAnonymous) {
        await api.patch("/api/users/profile", { name: tempName });
        user.name = tempName;
        toast.success("Name updated!");
      }
      // Update the first message to include the name
      setMessages((prev) =>
        prev.map((msg, i) =>
          i === 0
            ? {
              ...msg,
              text: `Hello ${tempName}! I'm REVA, your AI Police Assistant. How can I help you today?`,
            }
            : msg,
        ),
      );
    } catch (err) {
      // Name is still saved locally even if API failed
      console.error("Failed to persist name to server:", err);
    }
  };


  useEffect(() => {
    const steps = [
      "ESTABLISHING E2EE CHANNEL...",
      "SCANNING FOR VPN LEAKS...",
      "VERIFYING DEVICE INTEGRITY...",
      "CYBER-SEC PROTOCOL ACTIVE",
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length - 1) {
        currentStep++;
        setHandshakeStep(currentStep);
      } else {
        clearInterval(interval);
        setTimeout(() => setIsSecureHandshakeComplete(true), 800);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleToggleListening = () => {
    if (isListening) {
      shouldProcessRef.current = true;
      stopSTT();
    } else {
      cancelSpeech();
      resetTranscript();
      startSTT();
      shouldProcessRef.current = false;
    }
  };

  useEffect(() => {
    const fetchLocationAndGeofence = async () => {
      setIsCheckingGeofence(true);
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            setLocation({ latitude, longitude });
            try {
              const res = await api.get(
                `/api/stations/nearest?lat=${latitude}&lng=${longitude}`,
              );
              if (res.data.withinGeofence) {
                setActiveStation(res.data.station);
                setIsWithinGeofence(true);
              } else {
                setActiveStation(null);
                setIsWithinGeofence(false);
              }
            } catch (err) {
              console.error("Geofence check failed", err);
            } finally {
              setIsCheckingGeofence(false);
            }
          },
          (err) => {
            console.warn("Location access denied — user will be prompted to select station manually.", err);
            setIsCheckingGeofence(false);
          },
          { enableHighAccuracy: true },
        );
      } else {
        setIsCheckingGeofence(false);
      }
    };

    fetchLocationAndGeofence();
  }, []);

  const fetchAllStations = async () => {
    try {
      const res = await api.get("/api/stations");
      setAvailableStations(res.data.stations);
    } catch (err) {
      toast.error("Failed to load police stations");
    }
  };

  const handleManualStationSelect = (station) => {
    setActiveStation(station);
    setShowStationPicker(false);
    toast.success(`Selected Station: ${station.stationName}`);
  };

  const finalizeComplaint = async (aiData = null) => {
    if (!activeStation) {
      await fetchAllStations();
      setShowStationPicker(true);
      toast("Please select a police station to file your complaint");
      return;
    }

    setIsSubmitting(true);
    try {
      const transcript = messages
        .filter((m) => m.text && typeof m.text === "string")
        .map((m) => `${m.role === "ai" ? "REVA" : "USER"}: ${m.text}`)
        .join("\n");

      const response = await api.post("/api/complaints/submit", {
        transcript,
        latitude: location?.latitude,
        longitude: location?.longitude,
        locationAddress: activeStation
          ? `Near ${activeStation.stationName}, ${activeStation.district}`
          : "Unknown",
        legalConfirmed: true,
        structuredJson: {
          stationId: activeStation.id,
          incidentType: aiData?.incidentType || lastAiDataRef.current?.incidentType || "AI Assistant Report",
          incidentLocation: aiData?.location || lastAiDataRef.current?.location || "Detected",
          incidentDescription: aiData?.description || lastAiDataRef.current?.description || "See transcript",
          incidentDateTime: aiData?.dateTime || lastAiDataRef.current?.dateTime || new Date().toISOString(),
          // Personal intake fields for FIR
          userFathersName: userFathersName || null,
          userOccupation: userOccupation || null,
          userAddress: userAddress || null,
          userAge: userAge || null,
        },
        evidenceIds: pendingEvidenceIds,
      });

      const { trackingId, station, priority, isEmergency } = response.data;

      // Build a summary by parsing user messages from the conversation
      const userTexts = messages
        .filter((m) => m.role === "user" && !m.type)
        .map((m) => m.text)
        .join(" | ");

      // Add the complaint receipt as a special AI message bubble
      const receiptMsg = {
        id: (Date.now() + 2).toString(),
        role: "ai",
        type: "receipt",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        receipt: {
          trackingId,
          station: station || activeStation?.stationName,
          district: activeStation?.district,
          priority,
          isEmergency,
          incidentType: aiData?.incidentType || "AI Assistant Report",
          location: aiData?.location || activeStation ? `${activeStation.stationName}, ${activeStation.district}` : "Detected",
          description: aiData?.description || userTexts.slice(0, 200),
          dateTime: aiData?.dateTime || new Date().toISOString(),
          filedAt: new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }),
        },
      };

      setMessages((prev) => [...prev, receiptMsg]);
      toast.success("Complaint filed! Your tracking ID is " + trackingId);
    } catch (err) {
      toast.error(err.response?.data?.message || "Submission failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (
      !isListening &&
      (shouldProcessRef.current || (autoStop && sttTranscript.trim()))
    ) {
      if (sttTranscript.trim()) {
        sendMessage(sttTranscript);
      }
      shouldProcessRef.current = false;
      resetTranscript();
    }
  }, [isListening, sttTranscript, autoStop]);

  const sendMessage = async (text) => {
    if (!text?.trim() || isLoading) return;

    const userMsg = {
      id: Date.now().toString(),
      text: text,
      role: "user",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMsg]);

    // helper: speak a text message
    const speakReply = (replyText) => {
      const voicePrefix = getLocale(language);
      const voice =
        voices.find((v) => v.lang.startsWith(voicePrefix)) ||
        voices.find((v) => v.lang.startsWith("en-IN"));
      stopSTT();
      speak(replyText, voice);
    };

    // helper: add AI message bubble
    const addAIMsg = (replyText) => {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: replyText,
          role: "ai",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    };

    // ── STEP 1: First user reply → ask for age ─────────────────────────────
    if (!isGreetingResponded) {
      setIsGreetingResponded(true);
      const ageQuestions = {
        en: "Before we continue, may I know your age?",
        hi: "आगे बढ़ने से पहले, क्या मैं आपकी उम्र जान सकता हूँ?",
        te: "కొనసాగడానికి ముందు, మీ వయస్సు చెప్పగలరా?",
      };
      const q = ageQuestions[language] || ageQuestions.en;
      addAIMsg(q);
      speakReply(q);
      return;
    }

    // ── STEP 2: Collect and validate age ───────────────────────────────
    if (!isAgeCollected) {
      const ageMatch = text.match(/\d+/);
      const age = ageMatch ? parseInt(ageMatch[0], 10) : null;

      if (!age || age < 1 || age > 120) {
        const retryMessages = {
          en: "I didn't catch a valid age. Could you please tell me your age? (1–120)",
          hi: "मुझे सही उम्र समझ नहीं आई। कृपया अपनी उम्र बताएं? (1–120)",
          te: "సరైన వయస్సు అర్థం కాలేదు. దయచేసి మీ వయస్సు చెప్పగలరా? (1–120)",
        };
        const retry = retryMessages[language] || retryMessages.en;
        addAIMsg(retry);
        speakReply(retry);
        return;
      }

      const category = age < 18 ? "child" : age <= 60 ? "adult" : "senior";
      setUserAge(age);
      setUserCategory(category);
      setIsAgeCollected(true);
      ageMessageIdRef.current = userMsg.id; // remember which message contained the age

      // After age, ask father's / husband's name
      const fatherNameQuestions = {
        en: "Thank you. May I know your father's or husband's name?",
        hi: "धन्यवाद। क्या मैं आपके पिता या पति का नाम जान सकता हूँ?",
        te: "ధన్యవాదాలు. మీ తండ్రి లేదా భర్త పేరు చెప్పగలరా?",
        ta: "நன்றி. உங்கள் தந்தை அல்லது கணவரின் பெயர் சொல்லுங்கள்?",
        kn: "ಧನ್ಯವಾದ. ನಿಮ್ಮ ತಂದೆ ಅಥವಾ ಪತಿಯ ಹೆಸರು ಏನು?",
        mr: "धन्यवाद. तुमच्या वडिलांचे किंवा पतीचे नाव सांगाल का?",
        bn: "ধন্যবাদ। আপনার বাবার বা স্বামীর নাম জানতে পারি কি?",
        gu: "આભાર. શું હું તમારા પિતા અથવા પતિનું નામ જાણી શકું?",
        ml: "നന്ദി. നിങ്ങളുടെ അച്ഛൻറെ അല്ലെങ്കിൽ ഭർത്താവിൻറെ പേര് പറയാമോ?",
        pa: "ਧੰਨਵਾਦ। ਕੀ ਮੈਂ ਤੁਹਾਡੇ ਪਿਤਾ ਜਾਂ ਪਤੀ ਦਾ ਨਾਮ ਜਾਣ ਸਕਦਾ ਹਾਂ?",
      };
      const fnQ = fatherNameQuestions[language] || fatherNameQuestions.en;
      addAIMsg(fnQ);
      speakReply(fnQ);
      return;
    }

    // ── STEP 2.5: Collect father's / husband's name ────────────────────
    if (!isFathersNameCollected) {
      const name = text.trim();
      if (name.length < 2) {
        const retryFN = {
          en: "I didn't catch that. Please tell me your father's or husband's name.",
          hi: "कृपया अपने पिता या पति का नाम दोबारा बताएं।",
          te: "దయచేసి మీ తండ్రి లేదా భర్త పేరు మళ్ళీ చెప్పండి.",
          ta: "தயவுசெய்து உங்கள் தந்தை அல்லது கணவரின் பெயரை மீண்டும் சொல்லுங்கள்.",
          kn: "ದಯವಿಟ್ಟು ನಿಮ್ಮ ತಂದೆ ಅಥವಾ ಪತಿಯ ಹೆಸರನ್ನು ಮತ್ತೆ ಹೇಳಿ.",
          mr: "कृपया तुमच्या वडिलांचे किंवा पतीचे नाव पुन्हा सांगा.",
          bn: "দয়া করে আপনার বাবার বা স্বামীর নাম আবার বলুন।",
          gu: "કૃપા કરી તમારા પિતા અથવા પતિનું નામ ફરી કહો.",
          ml: "ദയവായി നിങ്ങളുടെ അച്ഛൻ അല്ലെങ്കിൽ ഭർത്താവിൻറെ പേര് വീണ്ടും പറയൂ.",
          pa: "ਕਿਰਪਾ ਕਰਕੇ ਆਪਣੇ ਪਿਤਾ ਜਾਂ ਪਤੀ ਦਾ ਨਾਮ ਦੁਬਾਰਾ ਦੱਸੋ।",
        };
        const r = retryFN[language] || retryFN.en;
        addAIMsg(r);
        speakReply(r);
        return;
      }
      setUserFathersName(name);
      setIsFathersNameCollected(true);

      const occQuestions = {
        en: "Thank you. What is your occupation?",
        hi: "धन्यवाद। आपका व्यवसाय क्या है?",
        te: "ధన్యవాదాలు. మీ వృత్తి లేదా పని ఏమిటి?",
        ta: "நன்றி. உங்கள் தொழில் என்ன?",
        kn: "ಧನ್ಯವಾದ. ನಿಮ್ಮ ವೃತ್ತಿ ಏನು?",
        mr: "धन्यवाद. तुमचा व्यवसाय काय आहे?",
        bn: "ধন্যবাদ। আপনার পেশা কী?",
        gu: "આભાર. તમારો વ્યવસાય શું છે?",
        ml: "നന്ദി. നിങ്ങളുടെ തൊഴിൽ എന്താണ്?",
        pa: "ਧੰਨਵਾਦ। ਤੁਹਾਡਾ ਕਿੱਤਾ ਕੀ ਹੈ?",
      };
      const oQ = occQuestions[language] || occQuestions.en;
      addAIMsg(oQ);
      speakReply(oQ);
      return;
    }

    // ── STEP 2.6: Collect occupation ───────────────────────────────────
    if (!isOccupationCollected) {
      const occ = text.trim();
      if (occ.length < 2) {
        const retryOcc = {
          en: "Please tell me your occupation (e.g., Student, Farmer, Engineer, etc.).",
          hi: "कृपया अपना व्यवसाय बताएं (जैसे: छात्र, किसान, इंजीनियर, आदि)।",
          te: "దయచేసి మీ వృత్తి చెప్పండి (ఉదా: విద్యార్థి, రైతు, ఇంజినీర్).",
          ta: "தயவுசெய்து உங்கள் தொழிலை சொல்லுங்கள் (எ.கா: மாணவர், விவசாயி, பொறியியலாளர்).",
          kn: "ದಯವಿಟ್ಟು ನಿಮ್ಮ ವೃತ್ತಿಯನ್ನು ಹೇಳಿ (ಉದಾ: ವಿದ್ಯಾರ್ಥಿ, ರೈತ, ಇಂಜಿನಿಯರ್).",
          mr: "कृपया तुमचा व्यवसाय सांगा (उदा: विद्यार्थी, शेतकरी, अभियंता).",
          bn: "দয়া করে আপনার পেশা বলুন (যেমন: ছাত্র, কৃষক, ইঞ্জিনিয়ার)।",
          gu: "કૃપા કરી તમારો વ્યવસાય જણાવો (દા.ત.: વિદ્યાર્થી, ખેડૂત, ઇજનેર).",
          ml: "ദയവായി നിങ്ങളുടെ തൊഴിൽ പറയൂ (ഉദാ: വിദ്യാർഥി, കർഷകൻ, എഞ്ചിനീയർ).",
          pa: "ਕਿਰਪਾ ਕਰਕੇ ਆਪਣਾ ਕਿੱਤਾ ਦੱਸੋ (ਜਿਵੇਂ: ਵਿਦਿਆਰਥੀ, ਕਿਸਾਨ, ਇੰਜੀਨੀਅਰ)।",
        };
        const r = retryOcc[language] || retryOcc.en;
        addAIMsg(r);
        speakReply(r);
        return;
      }
      setUserOccupation(occ);
      setIsOccupationCollected(true);

      const addrQuestions = {
        en: "Thank you. Please tell me your complete residential address.",
        hi: "धन्यवाद। कृपया अपना पूरा निवास पता बताएं।",
        te: "ధన్యవాదాలు. దయచేసి మీ పూర్తి నివాస చిరునామా చెప్పండి.",
        ta: "நன்றி. தயவுசெய்து உங்கள் முழு வீட்டு முகவரியைச் சொல்லுங்கள்.",
        kn: "ಧನ್ಯವಾದ. ದಯವಿಟ್ಟು ನಿಮ್ಮ ಸಂಪೂರ್ಣ ವಾಸಸ್ಥಳದ ವಿಳಾಸ ಹೇಳಿ.",
        mr: "धन्यवाद. कृपया तुमचा पूर्ण निवासी पत्ता सांगा.",
        bn: "ধন্যবাদ। দয়া করে আপনার সম্পূর্ণ বাড়ির ঠিকানা বলুন।",
        gu: "આભાર. કૃપા કરીને તમારું સંપૂર્ણ રહેઠાણ સરનામું જણાવો.",
        ml: "നന്ദി. ദയവായി നിങ്ങളുടെ പൂർണ്ണ വാസസ്ഥല വിലാസം പറയൂ.",
        pa: "ਧੰਨਵਾਦ। ਕਿਰਪਾ ਕਰਕੇ ਆਪਣਾ ਪੂਰਾ ਰਿਹਾਇਸ਼ੀ ਪਤਾ ਦੱਸੋ।",
      };
      const aQ = addrQuestions[language] || addrQuestions.en;
      addAIMsg(aQ);
      speakReply(aQ);
      return;
    }

    // ── STEP 2.7: Collect residential address ─────────────────────────
    if (!isAddressCollected) {
      const addr = text.trim();
      if (addr.length < 5) {
        const retryAddr = {
          en: "Please provide your complete residential address including house number, street, and city.",
          hi: "कृपया अपना पूरा पता दें — मकान नंबर, गली और शहर सहित।",
          te: "దయచేసి మీ పూర్తి చిరునామా చెప్పండి — ఇంటి నంబర్, వీధి మరియు నగరం సహా.",
          ta: "தயவுசெய்து வீட்டு எண், தெரு மற்றும் நகரம் உள்பட உங்கள் முழு முகவரியை வழங்குங்கள்.",
          kn: "ದಯವಿಟ್ಟು ಮನೆ ಸಂಖ್ಯೆ, ಬೀದಿ ಮತ್ತು ನಗರ ಸೇರಿದಂತೆ ನಿಮ್ಮ ಸಂಪೂರ್ಣ ವಿಳಾಸ ನೀಡಿ.",
          mr: "कृपया घर क्रमांक, रस्ता आणि शहरासह तुमचा पूर्ण पत्ता द्या.",
          bn: "দয়া করে বাড়ির নম্বর, রাস্তা এবং শহরসহ আপনার সম্পূর্ণ ঠিকানা দিন।",
          gu: "કૃપા કરી ઘર નંબર, ગલી અને શહેર સહિત તમારું સંપૂર્ণ સરનામું આપો.",
          ml: "ദയവായി വീട് നമ്പർ, തെരുവ്, നഗരം ഉൾക്കൊള്ളുന്ന നിങ്ങളുടെ പൂർണ്ണ വിലാസം നൽകൂ.",
          pa: "ਕਿਰਪਾ ਕਰਕੇ ਮਕਾਨ ਨੰਬਰ, ਗਲੀ ਅਤੇ ਸ਼ਹਿਰ ਸਮੇਤ ਆਪਣਾ ਪੂਰਾ ਪਤਾ ਦਿਓ।",
        };
        const r = retryAddr[language] || retryAddr.en;
        addAIMsg(r);
        speakReply(r);
        return;
      }
      setUserAddress(addr);
      setIsAddressCollected(true);

      const proceedMessages = {
        en: {
          child: "Thank you, dear. I have noted all your details. Now, please tell me what happened. I am here to help you.",
          adult: "Thank you. I have noted all your details. Now, how can I help you today? Please describe what happened.",
          senior: "Thank you. I have noted all your details. Please take your time and tell me what happened.",
        },
        hi: {
          child: "धन्यवाद, प्रिय। मैंने आपकी सभी जानकारी नोट कर ली है। अब बताइए क्या हुआ। मैं आपकी मदद के लिए यहाँ हूँ।",
          adult: "धन्यवाद। मैंने आपकी सभी जानकारी नोट कर ली है। अब बताइए, मैं आज आपकी कैसे मदद करूं?",
          senior: "धन्यवाद। मैंने आपकी सभी जानकारी नोट कर ली है। कृपया अपने समय से बताइए क्या हुआ।",
        },
        te: {
          child: "ధన్యవాదాలు, నేస్తమా. మీ వివరాలన్నీ నమోదు చేసాను. ఇప్పుడు ఏం జరిగిందో చెప్పండి. నేను మీకు సహాయపడేందుకు ఇక్కడ ఉన్నాను.",
          adult: "ధన్యవాదాలు. మీ వివరాలన్నీ నమోదు చేసాను. ఇప్పుడు ఏం జరిగిందో చెప్పండి.",
          senior: "ధన్యవాదాలు. మీ వివరాలన్నీ నమోదు చేసాను. దయచేసి మీకు సౌకర్యంగా ఉన్నప్పుడు చెప్పండి ఏం జరిగిందో.",
        },
        ta: {
          child: "நன்றி. உங்கள் விவரங்கள் குறிப்பிட்டுள்ளேன். இப்போது என்ன நடந்தது என்று சொல்லுங்கள்.",
          adult: "நன்றி. உங்கள் விவரங்கள் குறிப்பிட்டுள்ளேன். இப்போது நான் எப்படி உதவலாம்?",
          senior: "நன்றி. உங்கள் விவரங்கள் குறிப்பிட்டுள்ளேன். தயவுசெய்து என்ன நடந்தது என்று சொல்லுங்கள்.",
        },
        kn: {
          child: "ಧನ್ಯವಾದ. ನಿಮ್ಮ ವಿವರಗಳನ್ನು ದಾಖಲಿಸಿದ್ದೇನೆ. ಈಗ ಏನಾಯಿತು ಎಂದು ಹೇಳಿ.",
          adult: "ಧನ್ಯವಾದ. ನಿಮ್ಮ ವಿವರಗಳನ್ನು ದಾಖಲಿಸಿದ್ದೇನೆ. ಇಂದು ನಾನು ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?",
          senior: "ಧನ್ಯವಾದ. ನಿಮ್ಮ ವಿವರಗಳನ್ನು ದಾಖಲಿಸಿದ್ದೇನೆ. ದಯವಿಟ್ಟು ಏನಾಯಿತು ಎಂದು ಹೇಳಿ.",
        },
        mr: {
          child: "धन्यवाद. तुमचे तपशील नोंदवले आहेत. आता काय झाले ते सांगा.",
          adult: "धन्यवाद. तुमचे तपशील नोंदवले आहेत. मी आज तुमची कशी मदत करू?",
          senior: "धन्यवाद. तुमचे तपशील नोंदवले आहेत. काय झाले ते सांगा.",
        },
        bn: {
          child: "ধন্যবাদ। আপনার তথ্য নোট করেছি। এখন কী হয়েছে বলুন।",
          adult: "ধন্যবাদ। আপনার তথ্য নোট করেছি। আজ আমি কীভাবে সাহায্য করতে পারি?",
          senior: "ধন্যবাদ। আপনার তথ্য নোট করেছি। কী হয়েছে বলুন।",
        },
        gu: {
          child: "આભાર. તમારી વિગતો નોંધ લઈ છે. હવે શું થયું તે જણાવો.",
          adult: "આભાર. તમારી વિગતો નોંધ લઈ છે. આવ, હું આજ તમારી કેવી રીતે મદદ કરી શકું?",
          senior: "આભાર. તમારી વિગતો નોંધ લઈ છે. શું થયું તે જણાવો.",
        },
        ml: {
          child: "നന്ദി. നിങ്ങളുടെ വിവരങ്ങൾ കുറിച്ചു. ഇനി എന്ത് സംഭവിച്ചു എന്ന് പറയൂ.",
          adult: "നന്ദി. നിങ്ങളുടെ വിവരങ്ങൾ കുറിച്ചു. ഇന്ന് ഞാൻ എങ്ങനെ സഹായിക്കണം?",
          senior: "നന്ദി. നിങ്ങളുടെ വിവരങ്ങൾ കുറിച്ചു. എന്ത് സംഭവിച്ചു എന്ന് പറയൂ.",
        },
        pa: {
          child: "ਧੰਨਵਾਦ। ਤੁਹਾਡੇ ਵੇਰਵੇ ਨੋਟ ਕਰ ਲਏ। ਹੁਣ ਦੱਸੋ ਕੀ ਹੋਇਆ।",
          adult: "ਧੰਨਵਾਦ। ਤੁਹਾਡੇ ਵੇਰਵੇ ਨੋਟ ਕਰ ਲਏ। ਅੱਜ ਮੈਂ ਤੁਹਾਡੀ ਕਿਵੇਂ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ?",
          senior: "ਧੰਨਵਾਦ। ਤੁਹਾਡੇ ਵੇਰਵੇ ਨੋਟ ਕਰ ਲਏ। ਕੀ ਹੋਇਆ ਦੱਸੋ।",
        },
      };
      const langProc = proceedMessages[language] || proceedMessages.en;
      const proceed = (langProc[userCategory] || langProc.adult);
      addAIMsg(proceed);
      speakReply(proceed);
      return;
    }

    // ── STEP 3: Normal AI conversation ────────────────────────────────
    setIsLoading(true);

    try {
      // Only include plain text messages in history — skip image/video/result bubbles
      const history = messages
        .filter((m) => !m.type && m.text)
        .map((m) => ({
          role: m.role === "ai" ? "assistant" : "user",
          content: m.text,
        }));

      const context = {
        userName: user?.name,
        mobile: user?.mobileNumber,
        location: user?.policeStation?.stationName
          ? `${user.policeStation.stationName}, ${user.policeStation.district}`
          : "Unknown",
        history: history.slice(-5), // Send last 5 messages for context
        userAge: userAge,
        userCategory: userCategory, // "child" | "adult" | "senior"
        userFathersName: userFathersName,
        userOccupation: userOccupation,
        userAddress: userAddress,
      };

      // Call backend chat API instead of direct OpenAI call
      const response = await api.post("/api/chat", {
        message: text,
        languageCode: language,
        context: context,
      });

      const aiResponseRaw = response.data.reply;

      // Parse [[SUBMIT: {json}]] signal — supports multiline JSON
      let aiText = aiResponseRaw;
      let aiData = null;
      const submitMatch = aiResponseRaw.match(/\[\[SUBMIT:\s*([\s\S]*?)\]\]/);

      if (submitMatch) {
        try {
          aiData = JSON.parse(submitMatch[1].trim());
          lastAiDataRef.current = aiData; // persist for manual button fallback
          aiText = aiResponseRaw.replace(submitMatch[0], "").trim();
        } catch (e) {
          console.error("Failed to parse AI submission data", e);
        }
      }

      const aiMsg = {
        id: (Date.now() + 1).toString(),
        text: aiText,
        role: "ai",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsLoading(false);

      const voicePrefix = getLocale(language);
      const voice =
        voices.find((v) => v.lang.startsWith(voicePrefix)) ||
        voices.find((v) => v.lang.startsWith("en-IN"));

      // Ensure mic is off while AI starts to speak
      stopSTT();
      speak(aiText, voice);

      // Trigger automatic submission if signal detected
      if (aiData) {
        // --- CYBER SECURITY: REAL-TIME THREAT MONITORING ---
        const cyberKeywords = [
          "phishing",
          "fraud",
          "hacker",
          "scam",
          "otp",
          "link",
          "bullying",
          "harassment",
          "financial",
          "bank",
        ];
        const isCyberRelated = cyberKeywords.some(
          (k) =>
            aiData.incidentType?.toLowerCase().includes(k) ||
            aiData.description?.toLowerCase().includes(k),
        );

        if (isCyberRelated) {
          toast(
            (t) => (
              <span
                style={{ display: "flex", alignItems: "center", gap: "10px" }}
              >
                <Shield size={20} color="#60a5fa" />
                <div>
                  <b>Cyber-Security Protocol Activated</b>
                  <div style={{ fontSize: "12px" }}>
                    Incident classified in Cyber-Domain. Advising 1930
                    reporting.
                  </div>
                </div>
              </span>
            ),
            { duration: 6000, position: "top-center" },
          );
        }
        // ----------------------------------------------------

        setTimeout(() => {
          finalizeComplaint(aiData);
        }, 2000); // Small delay to let user hear the "filing" message
      }
    } catch (err) {
      toast.error("AI Error");
      setIsLoading(false);
    }
  };

  // ── Save edited message ───────────────────────────────────────────────
  const handleSaveEdit = async (msgId) => {
    const trimmed = editedText.trim();
    if (!trimmed) return;

    // If the user edited their age message, re-detect the age from the new text
    let effectiveAge = userAge;
    let effectiveCategory = userCategory;
    if (msgId === ageMessageIdRef.current) {
      const ageMatch = trimmed.match(/\d+/);
      const parsedAge = ageMatch ? parseInt(ageMatch[0], 10) : null;
      if (parsedAge && parsedAge >= 1 && parsedAge <= 120) {
        const newCategory = parsedAge < 18 ? "child" : parsedAge <= 60 ? "adult" : "senior";
        effectiveAge = parsedAge;
        effectiveCategory = newCategory;
        setUserAge(parsedAge);
        setUserCategory(newCategory);
      }
    }

    // 1. Update the user message in-place
    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, text: trimmed } : m))
    );

    // 2. Remove the AI reply that immediately follows this message
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === msgId);
      if (idx !== -1 && idx + 1 < prev.length && prev[idx + 1].role === "ai") {
        return [...prev.slice(0, idx + 1), ...prev.slice(idx + 2)];
      }
      return prev;
    });

    setEditingMessageId(null);
    setIsLoading(true);

    try {
      const history = messages
        .filter((m) => !m.type && m.text)
        .map((m) => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text }));

      const context = {
        userName: user?.name,
        mobile: user?.mobileNumber,
        location: user?.policeStation?.stationName
          ? `${user.policeStation.stationName}, ${user.policeStation.district}`
          : "Unknown",
        history: history.slice(-5),
        userAge: effectiveAge,
        userCategory: effectiveCategory,
      };

      const response = await api.post("/api/chat", {
        message: trimmed,
        languageCode: language,
        context,
      });

      const aiText = response.data.reply || "";
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: aiText,
          role: "ai",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);

      const voicePrefix = getLocale(language);
      const voice =
        voices.find((v) => v.lang.startsWith(voicePrefix)) ||
        voices.find((v) => v.lang.startsWith("en-IN"));
      stopSTT();
      speak(aiText, voice);
    } catch (err) {
      toast.error("Failed to get AI response.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Camera Modal ────────────────────────────────────────────────────────────
  const openCameraModal = async () => {
    setShowMediaMenu(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true,
      });
      cameraStreamRef.current = stream;
      setShowCameraModal(true);
      // Wait for modal to render then attach stream
      setTimeout(() => {
        if (cameraVideoElRef.current) {
          cameraVideoElRef.current.srcObject = stream;
          cameraVideoElRef.current.play();
        }
      }, 80);
    } catch (err) {
      toast.error("Camera access denied or unavailable.");
    }
  };

  const closeCameraModal = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    setIsRecording(false);
    setShowCameraModal(false);
    setCameraMode("photo");
  };

  const capturePhoto = () => {
    const video = cameraVideoElRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        const file = new File([blob], `photo_${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        closeCameraModal();
        handleCapturedFile(file);
      },
      "image/jpeg",
      0.92,
    );
  };

  const startRecording = () => {
    if (!cameraStreamRef.current) return;
    recordedChunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : "video/webm";
    const recorder = new MediaRecorder(cameraStreamRef.current, { mimeType });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
      const file = new File([blob], `video_${Date.now()}.webm`, {
        type: "video/webm",
      });
      closeCameraModal();
      handleCapturedFile(file);
    };
    mediaRecorderRef.current = recorder;
    recorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleCapturedFile = async (file) => {
    const previewUrl = URL.createObjectURL(file);
    const mediaId = Date.now().toString();
    const isVideo = file.type.startsWith("video/");
    setMessages((prev) => [
      ...prev,
      {
        id: mediaId,
        role: "user",
        type: isVideo ? "video" : "image",
        imageUrl: previewUrl,
        fileName: file.name,
        loading: true,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
    setIsMediaUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      if (user?.id) formData.append("uploaderId", user.id);
      const response = await fetch(
        `/api/image-analysis/analyze`,
        { method: "POST", body: formData },
      );
      const result = await response.json();
      console.log("[Media Analysis Result]", JSON.stringify(result, null, 2));

      if (result.rejected || result.module1?.isAiGenerated) {
        // Remove the bubble — AI-generated images are not accepted as evidence
        setMessages((prev) => prev.filter((m) => m.id !== mediaId));
        toast.error("🤖 AI-generated image detected. This evidence has been rejected.", { duration: 5000 });
      } else {
        setMessages((prev) => prev.map((m) => m.id === mediaId ? { ...m, loading: false } : m));
        if (result.evidenceId) setPendingEvidenceIds((prev) => [...prev, result.evidenceId]);
        if (result.module1?.status === "completed") {
          toast.success("Evidence uploaded and analysed.");
        } else {
          toast.error(result.module1?.error || "Analysis failed.");
        }
      }
    } catch (err) {
      console.error("[Media Analysis Error]", err);
      setMessages((prev) =>
        prev.map((m) => (m.id === mediaId ? { ...m, loading: false } : m)),
      );
      toast.error("Failed to connect to analysis service.");
    } finally {
      setIsMediaUploading(false);
    }
  };

  // ── Media Upload & Analysis (file-picker path) ──────────────────────────────
  const handleMediaUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset all file inputs so the same file can be re-selected
    [imageFileRef, cameraPhotoRef].forEach((r) => {
      if (r.current) r.current.value = "";
    });

    const previewUrl = URL.createObjectURL(file);
    const mediaId = Date.now().toString();
    const isVideo = file.type.startsWith("video/");

    // Show media bubble immediately with loading=true
    setMessages((prev) => [
      ...prev,
      {
        id: mediaId,
        role: "user",
        type: isVideo ? "video" : "image",
        imageUrl: previewUrl,
        fileName: file.name,
        loading: true,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);

    setIsMediaUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      if (user?.id) formData.append("uploaderId", user.id);

      const response = await fetch(
        `/api/image-analysis/analyze`,
        { method: "POST", body: formData },
      );
      const result = await response.json();

      console.log("[Media Analysis Result]", JSON.stringify(result, null, 2));

      if (result.rejected || result.module1?.isAiGenerated) {
        // AI-generated — remove the bubble and reject
        setMessages((prev) => prev.filter((m) => m.id !== mediaId));
        toast.error("🤖 AI-generated image detected. This evidence has been rejected.", { duration: 5000 });
      } else {
        setMessages((prev) =>
          prev.map((m) => (m.id === mediaId ? { ...m, loading: false } : m)),
        );
        if (result.evidenceId) setPendingEvidenceIds((prev) => [...prev, result.evidenceId]);
        if (result.module1?.status === "completed") {
          toast.success("Evidence uploaded and analysed.");
        } else {
          toast.error(result.module1?.error || "Analysis failed.");
        }
      }
    } catch (err) {
      console.error("[Media Analysis Error]", err);
      setMessages((prev) =>
        prev.map((m) => (m.id === mediaId ? { ...m, loading: false } : m)),
      );
      toast.error("Failed to connect to analysis service.");
    } finally {
      setIsMediaUploading(false);
    }
  };

  // ── Framer Motion variants ─────────────────────────────────────────────
  const msgVariants = {
    hidden: { opacity: 0, y: 16, scale: 0.96 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 400, damping: 30 } },
  };

  const micColor = isMediaUploading || isInitializing
    ? "#94a3b8"
    : isSpeaking
      ? "#64748b"
      : isListening
        ? "#ef4444"
        : "#2563eb";

  const micShadow = isListening
    ? "0 0 0 16px rgba(239,68,68,0.12), 0 0 0 32px rgba(239,68,68,0.06)"
    : "0 4px 24px rgba(37,99,235,0.35)";

  return (
    <>
      {/* ── Root shell ───────────────────────────────────────────────── */}
      <div
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#f8fafc",
          color: "#0f172a",
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* ── Handshake overlay ──────────────────────────────────────── */}
        <AnimatePresence>
          {!isSecureHandshakeComplete && (
            <motion.div
              key="handshake"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.6 } }}
              style={{
                position: "fixed", inset: 0, zIndex: 9999,
                backgroundColor: "#f8fafc",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 28,
              }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                style={{
                  width: 88, height: 88, borderRadius: "50%",
                  border: "2.5px solid #e2e8f0",
                  borderTop: "2.5px solid #2563eb",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <Shield size={40} color="#2563eb" />
              </motion.div>
              <div style={{ textAlign: "center" }}>
                <motion.div
                  key={handshakeStep}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{
                    fontFamily: "monospace",
                    color: "#2563eb", fontSize: 11,
                    letterSpacing: 2, marginBottom: 14, fontWeight: 700,
                  }}
                >
                  {["ESTABLISHING E2EE CHANNEL…", "SCANNING FOR LEAKS…", "VERIFYING INTEGRITY…", "CYBER-SEC ACTIVE"][handshakeStep]}
                </motion.div>
                <div style={{ width: 200, height: 2, backgroundColor: "#e2e8f0", borderRadius: 10, overflow: "hidden" }}>
                  <motion.div
                    animate={{ width: `${(handshakeStep + 1) * 25}%` }}
                    transition={{ ease: "easeOut", duration: 0.4 }}
                    style={{ height: "100%", backgroundColor: "#2563eb", borderRadius: 10 }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Ambient gradient blobs ─────────────────────────────────── */}
        <div style={{ position: "absolute", top: "-15%", left: "-10%", width: "55%", height: "55%", background: "radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-10%", right: "-10%", width: "45%", height: "45%", background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

        {/* ── Back button ────────────────────────────────────────────── */}
        <motion.button
          onClick={handleBackClick}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ x: -3 }}
          whileTap={{ scale: 0.95 }}
          style={{
            position: "fixed", top: 22, left: 28, zIndex: 40,
            display: "flex", alignItems: "center", gap: 6,
            background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)",
            border: "1px solid #e2e8f0", borderRadius: 10,
            padding: "7px 14px", fontSize: 13, fontWeight: 600,
            color: "#475569", cursor: "pointer",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}
        >
          <ArrowLeft size={15} />Back
        </motion.button>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 28 }}
          style={{
            position: "relative", zIndex: 10,
            padding: "14px 28px 14px 90px",
            borderBottom: "1px solid #f1f5f9",
            background: "rgba(248,250,252,0.92)",
            backdropFilter: "blur(16px)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}
        >
          {/* Logo */}
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "inherit" }}>
            <motion.div
              whileHover={{ rotate: [0, -6, 6, 0], scale: 1.05 }}
              transition={{ duration: 0.4 }}
              style={{
                width: 38, height: 38, borderRadius: 10,
                background: "linear-gradient(135deg, #2563eb, #7c3aed)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 16px rgba(37,99,235,0.3)",
              }}
            >
              <Shield size={20} color="white" />
            </motion.div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "1rem", letterSpacing: "-0.3px" }}>REVA AI</div>
              <div style={{ fontSize: "0.62rem", color: "#2563eb", letterSpacing: "1.5px", textTransform: "uppercase", fontWeight: 700 }}>Police Assistant</div>
            </div>
          </Link>

          {/* Status chips */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={isListening ? "listening" : isInitializing ? "init" : isLoading ? "thinking" : "ready"}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                style={{
                  fontSize: 10, fontWeight: 700, padding: "4px 12px",
                  borderRadius: 20, letterSpacing: 0.5,
                  border: "1px solid " + (isListening ? "#fca5a5" : "#bfdbfe"),
                  color: isListening ? "#ef4444" : "#2563eb",
                  backgroundColor: isListening ? "rgba(239,68,68,0.08)" : "rgba(37,99,235,0.08)",
                }}
              >
                {isInitializing ? "CONNECTING…" : isListening ? "● LISTENING" : isLoading ? "THINKING…" : "READY"}
              </motion.div>
            </AnimatePresence>

            <motion.div
              whileHover={{ scale: 1.05 }}
              onClick={() => setShowStationPicker(true)}
              style={{
                fontSize: 10, fontWeight: 700, padding: "4px 12px",
                borderRadius: 20, display: "flex", alignItems: "center", gap: 4,
                border: `1px solid ${activeStation ? "#6ee7b7" : "#fde68a"}`,
                color: activeStation ? "#059669" : "#d97706",
                backgroundColor: activeStation ? "rgba(16,185,129,0.08)" : "rgba(245,158,11,0.08)",
                cursor: "pointer",
              }}
            >
              {activeStation ? <><Shield size={10} /> {activeStation.stationName}</> : isCheckingGeofence ? "Locating…" : <><AlertCircle size={10} /> Select Station</>}
            </motion.div>

            <motion.button
              onClick={logoutCitizen}
              whileHover={{ color: "#ef4444" }}
              style={{ background: "none", border: "none", fontSize: 12, color: "#94a3b8", cursor: "pointer", fontWeight: 600 }}
            >
              Logout
            </motion.button>
          </div>
        </motion.header>

        {/* ── Message list ───────────────────────────────────────────── */}
        <main style={{ flex: 1, overflowY: "auto", padding: "28px 24px 200px", position: "relative", zIndex: 1 }}>
          <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

            {messages.map((msg, idx) => (
              <motion.div
                key={msg.id}
                variants={msgVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: idx < 3 ? idx * 0.08 : 0 }}
                style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", width: "100%" }}
              >
                <div style={{ display: "flex", flexDirection: msg.role === "user" ? "row-reverse" : "row", alignItems: "flex-end", gap: 10, maxWidth: "82%" }}>
                  {/* Avatar */}
                  <div style={{
                    width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                    background: msg.role === "user" ? "linear-gradient(135deg,#4f46e5,#7c3aed)" : "#f1f5f9",
                    border: msg.role === "user" ? "none" : "1px solid #e2e8f0",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {msg.role === "user" ? <User size={14} color="white" /> : <Bot size={14} color="#2563eb" />}
                  </div>

                  {/* Image message */}
                  {msg.type === "image" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ position: "relative", display: "inline-block" }}>
                        <img src={msg.imageUrl} alt={msg.fileName} style={{
                          maxWidth: 240, maxHeight: 240, borderRadius: "16px 16px 4px 16px",
                          border: "2px solid rgba(79,70,229,0.3)", objectFit: "cover", display: "block",
                          filter: msg.loading ? "brightness(0.5)" : "none", transition: "filter 0.3s",
                        }} />
                        {msg.loading && (
                          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                              <Loader2 size={26} color="#a78bfa" />
                            </motion.div>
                            <span style={{ fontSize: 10, color: "#c4b5fd", fontWeight: 700, letterSpacing: 1 }}>ANALYZING…</span>
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: 10, color: "#94a3b8", textAlign: "right" }}>{msg.fileName} · {msg.timestamp}</div>
                    </div>
                  )}

                  {/* Image analysis result */}
                  {msg.type === "imageResult" && msg.analysisData && (
                    <div style={{
                      padding: "14px 18px", borderRadius: "16px 16px 16px 4px",
                      background: "#ffffff", border: "1px solid #e2e8f0",
                      boxShadow: "0 2px 12px rgba(0,0,0,0.05)", fontSize: "0.85rem", maxWidth: 340,
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <div style={{
                          padding: "3px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, letterSpacing: 1,
                          background: msg.analysisData.forensicAnalysis?.analysis?.riskLevel === "Critical" ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)",
                          color: msg.analysisData.forensicAnalysis?.analysis?.riskLevel === "Critical" ? "#ef4444" : "#10b981",
                          border: "1px solid currentColor",
                        }}>
                          {msg.analysisData.isAiGenerated ? "🤖 AI GENERATED" : `⚠ ${msg.analysisData.forensicAnalysis?.analysis?.riskLevel?.toUpperCase() || "UNKNOWN"} RISK`}
                        </div>
                        <div style={{ fontSize: 10, color: "#94a3b8" }}>Forensic Analysis</div>
                      </div>
                      {msg.analysisData.forensicAnalysis?.overview && <p style={{ color: "#334155", lineHeight: 1.55, margin: "0 0 8px" }}>{msg.analysisData.forensicAnalysis.overview}</p>}
                      {msg.analysisData.isAiGenerated && <p style={{ color: "#f87171", fontSize: "0.8rem", margin: 0 }}>{msg.analysisData.reason}</p>}
                      {!msg.analysisData.isAiGenerated && msg.analysisData.forensicAnalysis?.analysis?.riskReason && (
                        <p style={{ color: "#94a3b8", fontSize: "0.78rem", margin: "4px 0 0", borderTop: "1px solid #f1f5f9", paddingTop: 8 }}>{msg.analysisData.forensicAnalysis.analysis.riskReason}</p>
                      )}
                      <div style={{ fontSize: 10, color: "#cbd5e1", marginTop: 8 }}>{msg.timestamp} · {msg.analysisData.processingTimeMs}ms</div>
                    </div>
                  )}

                  {/* Image error */}
                  {msg.type === "imageError" && (
                    <div style={{
                      padding: "12px 18px", borderRadius: "16px 16px 16px 4px",
                      background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)",
                      display: "flex", alignItems: "center", gap: 10,
                      fontSize: "0.85rem", color: "#dc2626", maxWidth: 300,
                    }}>
                      <AlertTriangle size={16} color="#ef4444" style={{ flexShrink: 0 }} />
                      <span>Analysis failed: {msg.errorMsg || "Unknown error"}</span>
                    </div>
                  )}

                  {/* Complaint receipt */}
                  {msg.type === "receipt" && msg.receipt && (
                    <div style={{
                      padding: 20, borderRadius: "16px 16px 16px 4px",
                      background: "#ffffff", border: "1px solid #d1fae5",
                      boxShadow: "0 2px 16px rgba(16,185,129,0.1)",
                      maxWidth: 340, fontSize: "0.85rem",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                        <CheckCircle2 size={20} color="#10b981" />
                        <span style={{ fontWeight: 700, color: "#059669", fontSize: "0.9rem" }}>Complaint Filed Successfully</span>
                      </div>
                      <div style={{ background: "#f0fdf4", borderRadius: 10, padding: 12, marginBottom: 14, textAlign: "center" }}>
                        <div style={{ fontSize: "0.65rem", color: "#94a3b8", letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Tracking ID</div>
                        <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#7c3aed", letterSpacing: 2 }}>{msg.receipt.trackingId}</div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                        {msg.receipt.station && <div style={{ display: "flex", gap: 8, color: "#475569" }}><MapPin size={14} color="#60a5fa" style={{ flexShrink: 0, marginTop: 2 }} /><span>{msg.receipt.station}{msg.receipt.district ? `, ${msg.receipt.district}` : ""}</span></div>}
                        {msg.receipt.incidentType && <div style={{ display: "flex", gap: 8, color: "#475569" }}><FileText size={14} color="#a78bfa" style={{ flexShrink: 0, marginTop: 2 }} /><span>{msg.receipt.incidentType}</span></div>}
                        {msg.receipt.priority && <div style={{ display: "flex", gap: 8, color: "#475569" }}><AlertCircle size={14} color={msg.receipt.priority === "URGENT" ? "#f87171" : "#fbbf24"} style={{ flexShrink: 0, marginTop: 2 }} /><span>Priority: {msg.receipt.priority}</span></div>}
                        <div style={{ display: "flex", gap: 8, color: "#475569" }}><Clock size={14} color="#34d399" style={{ flexShrink: 0, marginTop: 2 }} /><span>Filed at {msg.receipt.filedAt}</span></div>
                      </div>
                      <motion.button
                        onClick={() => router.push(`/track/${msg.receipt.trackingId}`)}
                        whileHover={{ scale: 1.02, backgroundColor: "#ede9fe" }}
                        whileTap={{ scale: 0.97 }}
                        style={{
                          width: "100%", padding: 10, borderRadius: 10,
                          background: "#f5f3ff", border: "1px solid #ddd6fe",
                          color: "#7c3aed", fontWeight: 700, fontSize: "0.85rem",
                          cursor: "pointer", display: "flex", alignItems: "center",
                          justifyContent: "center", gap: 6,
                        }}
                      >
                        Track Complaint <ChevronRight size={14} />
                      </motion.button>
                    </div>
                  )}

                  {/* Normal text bubble */}
                  {!msg.type && (
                    <div style={{ position: "relative" }}>
                      {editingMessageId === msg.id ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 220, maxWidth: 420 }}>
                          <textarea
                            value={editedText} onChange={(e) => setEditedText(e.target.value)}
                            autoFocus rows={3}
                            style={{
                              padding: "12px 16px", borderRadius: 14,
                              background: "#f8fafc", border: "1.5px solid #818cf8",
                              color: "#0f172a", fontSize: "0.95rem", lineHeight: 1.55,
                              resize: "none", outline: "none", width: "100%",
                            }}
                          />
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                            <button onClick={() => setEditingMessageId(null)} style={{ padding: "6px 14px", borderRadius: 8, background: "#f1f5f9", border: "1px solid #e2e8f0", color: "#64748b", fontSize: "0.8rem", cursor: "pointer" }}>Cancel</button>
                            <button onClick={() => handleSaveEdit(msg.id)} style={{ padding: "6px 14px", borderRadius: 8, background: "#4f46e5", border: "none", color: "white", fontSize: "0.8rem", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}><Check size={13} />Save</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ position: "relative" }}>
                          <div style={{
                            padding: "12px 18px",
                            borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                            background: msg.role === "user" ? "linear-gradient(135deg, #4f46e5, #7c3aed)" : "#ffffff",
                            border: msg.role === "user" ? "none" : "1px solid #e2e8f0",
                            boxShadow: msg.role === "user" ? "0 4px 16px rgba(79,70,229,0.28)" : "0 2px 8px rgba(0,0,0,0.05)",
                            fontSize: "0.94rem", lineHeight: 1.55,
                            color: msg.role === "user" ? "white" : "#1e293b",
                          }}>
                            {msg.text}
                            <div style={{ fontSize: 10, color: msg.role === "user" ? "rgba(255,255,255,0.5)" : "#cbd5e1", textAlign: "right", marginTop: 4 }}>{msg.timestamp}</div>
                          </div>
                          {msg.role === "user" && (
                            <motion.button
                              onClick={() => { setEditingMessageId(msg.id); setEditedText(msg.text); }}
                              title="Edit message"
                              initial={{ opacity: 0 }}
                              whileHover={{ opacity: 1, scale: 1.15 }}
                              style={{
                                position: "absolute", top: -10, left: -10,
                                width: 24, height: 24, borderRadius: "50%",
                                background: "#4f46e5", border: "1px solid #818cf8",
                                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                              }}
                            >
                              <Pencil size={11} color="white" />
                            </motion.button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#f1f5f9", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Bot size={14} color="#2563eb" />
                </div>
                <div style={{ padding: "14px 18px", borderRadius: "18px 18px 18px 4px", background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", display: "flex", gap: 6, alignItems: "center" }}>
                  {[0, 1, 2].map((i) => (
                    <motion.div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#2563eb" }}
                      animate={{ y: [0, -6, 0] }}
                      transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.18, ease: "easeInOut" }}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Live transcript preview */}
            <AnimatePresence>
              {(isListening || sttTranscript) && (sttTranscript || interimTranscript) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                  style={{
                    alignSelf: "flex-end", padding: "10px 16px",
                    background: "rgba(79,70,229,0.07)", borderRadius: "14px 14px 4px 14px",
                    border: "1.5px dashed rgba(79,70,229,0.35)", color: "#4f46e5",
                    fontSize: "0.9rem", maxWidth: "80%", wordBreak: "break-word", lineHeight: 1.55,
                  }}
                >
                  {sttTranscript}{interimTranscript ? (sttTranscript ? " " + interimTranscript : interimTranscript) : ""}…
                </motion.div>
              )}
            </AnimatePresence>

            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* ── Controls hub ───────────────────────────────────────────── */}
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.25, type: "spring", stiffness: 280, damping: 28 }}
          style={{
            position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
            zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            background: "rgba(255,255,255,0.92)", backdropFilter: "blur(24px)",
            padding: "8px 16px", borderRadius: 56,
            border: "1px solid #e2e8f0", width: "max-content",
            boxShadow: "0 8px 40px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)",
          }}
        >
          {/* Hidden file inputs */}
          <input ref={imageFileRef} type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={handleMediaUpload} />
          <input ref={cameraPhotoRef} type="file" accept="image/*,video/*" capture="environment" style={{ display: "none" }} onChange={handleMediaUpload} />

          {/* ─ Section: Utility ─ */}
          <motion.button onClick={() => setIsSettingsOpen(true)} whileHover={{ scale: 1.15, color: "#0f172a" }} whileTap={{ scale: 0.9 }}
            title="Settings"
            style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "6px 8px", borderRadius: 10 }}>
            <Settings size={18} />
          </motion.button>

          {/* Media */}
          <div style={{ position: "relative" }}>
            <motion.button onClick={() => setShowMediaMenu((v) => !v)} disabled={isMediaUploading}
              whileHover={{ scale: 1.1, color: "#0f172a" }} whileTap={{ scale: 0.92 }}
              title="Attach media"
              style={{
                background: "none", border: "none",
                color: isMediaUploading ? "#cbd5e1" : "#94a3b8",
                padding: "6px 8px", borderRadius: 10,
                cursor: isMediaUploading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
              {isMediaUploading
                ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><Loader2 size={18} /></motion.div>
                : <ImageIcon size={18} />}
            </motion.button>

            <AnimatePresence>
              {showMediaMenu && !isMediaUploading && (
                <>
                  <div onClick={() => setShowMediaMenu(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 8 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    style={{
                      position: "absolute", bottom: "calc(100% + 12px)", left: "50%", transform: "translateX(-50%)",
                      background: "#ffffff", border: "1px solid #e2e8f0",
                      borderRadius: 14, padding: 8, minWidth: 160, zIndex: 50,
                      boxShadow: "0 12px 40px rgba(0,0,0,0.1)",
                      display: "flex", flexDirection: "column", gap: 2,
                    }}
                  >
                    {[
                      { icon: <Camera size={15} color="#475569" />, label: "Camera", action: openCameraModal },
                      { icon: <FolderOpen size={15} color="#475569" />, label: "From Device", action: () => { setShowMediaMenu(false); imageFileRef.current?.click(); } },
                    ].map(({ icon, label, action }) => (
                      <motion.button key={label} onClick={action} whileHover={{ background: "#f8fafc" }}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          background: "none", border: "none", color: "#475569",
                          cursor: "pointer", padding: "9px 12px", borderRadius: 10,
                          fontSize: 13, fontWeight: 500, textAlign: "left",
                        }}>
                        {icon}{label}
                      </motion.button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* | divider */}
          <div style={{ width: 1, height: 20, background: "#e2e8f0", flexShrink: 0 }} />

          {/* ─ Section: Chat input (always visible) ─ */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "#f8fafc", borderRadius: 28,
            padding: "4px 6px 4px 14px", border: "1px solid #e2e8f0", width: 260,
          }}>
            <input
              type="text" value={textInput} onChange={(e) => setTextInput(e.target.value)}
              onKeyPress={(e) => { if (e.key === "Enter" && textInput.trim() && !isLoading) { sendMessage(textInput); setTextInput(""); } }}
              placeholder="Type a message…" disabled={isLoading}
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#0f172a", fontSize: 13, padding: "7px 0" }}
            />
            <motion.button
              onClick={() => { if (textInput.trim() && !isLoading) { sendMessage(textInput); setTextInput(""); } }}
              disabled={!textInput.trim() || isLoading}
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              style={{
                background: textInput.trim() && !isLoading ? "#0f172a" : "#e2e8f0",
                border: "none", color: "white",
                cursor: textInput.trim() && !isLoading ? "pointer" : "not-allowed",
                width: 30, height: 30, borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, transition: "background 0.2s",
              }}>
              <Send size={14} />
            </motion.button>
          </div>

          {/* | divider */}
          <div style={{ width: 1, height: 20, background: "#e2e8f0", flexShrink: 0 }} />

          {/* ─ Section: Voice controls ─ */}
          {/* Stop */}
          <motion.button onClick={() => { cancelSpeech(); stopSTT(); }} whileHover={{ scale: 1.15, color: "#0f172a" }} whileTap={{ scale: 0.9 }}
            title="Stop audio / Cancel"
            style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "6px 8px", borderRadius: 10 }}>
            <StopCircle size={20} />
          </motion.button>

          {/* Mic orb */}
          <motion.button
            onClick={handleToggleListening}
            disabled={isInitializing || isSpeaking || isMediaUploading}
            whileHover={{ scale: isInitializing || isSpeaking || isMediaUploading ? 1 : 1.06 }}
            whileTap={{ scale: isInitializing || isSpeaking || isMediaUploading ? 1 : 0.93 }}
            animate={{ backgroundColor: micColor, boxShadow: micShadow }}
            transition={{ backgroundColor: { duration: 0.3 }, boxShadow: { duration: 0.3 } }}
            style={{
              width: 56, height: 56, borderRadius: "50%",
              border: "none", cursor: isInitializing || isSpeaking || isMediaUploading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "white", flexShrink: 0,
            }}>
            {isInitializing
              ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><Loader2 size={24} color="white" /></motion.div>
              : isSpeaking ? <Volume2 size={24} />
                : isListening ? <MicOff size={24} />
                  : <Mic size={24} />}
          </motion.button>

          {/* | divider */}
          <div style={{ width: 1, height: 20, background: "#e2e8f0", flexShrink: 0 }} />

          {/* ─ Section: File complaint + Language ─ */}
          {/* File complaint — icon only */}
          <motion.button onClick={finalizeComplaint} disabled={isSubmitting}
            whileHover={{ scale: 1.1, backgroundColor: "#0f172a" }} whileTap={{ scale: 0.93 }}
            title={isSubmitting ? "Filing…" : "File Complaint"}
            animate={{ backgroundColor: isSubmitting ? "#94a3b8" : "#1e293b" }}
            style={{
              width: 38, height: 38, borderRadius: "50%",
              border: "none", color: "white", cursor: isSubmitting ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 12px rgba(0,0,0,0.12)", flexShrink: 0,
            }}>
            {isSubmitting
              ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><Loader2 size={16} /></motion.div>
              : <MapPin size={17} />}
          </motion.button>

          {/* Language selector */}
          <div style={{ display: "flex", alignItems: "center", background: "#f8fafc", borderRadius: 20, padding: "0 10px", border: "1px solid #e2e8f0" }}>
            <Globe size={12} color="#94a3b8" />
            <select value={language} onChange={(e) => setLanguage(e.target.value)}
              style={{ background: "none", border: "none", color: "#475569", padding: "7px 4px", cursor: "pointer", fontSize: 12, fontWeight: 700, outline: "none" }}>
              {[["en", "EN"], ["hi", "HI"], ["te", "TE"], ["ta", "TA"], ["kn", "KN"], ["mr", "MR"], ["bn", "BN"], ["gu", "GU"], ["ml", "ML"], ["pa", "PA"]].map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* ── Settings Modal ─────────────────────────────────────────── */}
        <AnimatePresence>
          {isSettingsOpen && (
            <motion.div key="settings-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(15,23,42,0.4)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
              <motion.div initial={{ opacity: 0, scale: 0.92, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 16 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                style={{ background: "#ffffff", borderRadius: 24, width: "100%", maxWidth: 380, padding: 28, border: "1px solid #f1f5f9", boxShadow: "0 24px 60px rgba(0,0,0,0.13)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24, alignItems: "center" }}>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>Voice Settings</h3>
                  <motion.button onClick={() => setIsSettingsOpen(false)} whileHover={{ scale: 1.12, color: "#ef4444" }}
                    style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
                    <X size={20} />
                  </motion.button>
                </div>

                {[
                  { label: "Auto-Stop Listening", desc: "Detects when you finish speaking", value: autoStop, toggle: () => setAutoStop(!autoStop) },
                  { label: "Auto-Handsfree Mode", desc: "Mic turns on after REVA finishes", value: autoResumeMic, toggle: () => setAutoResumeMic(!autoResumeMic) },
                ].map(({ label, desc, value, toggle }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 16, background: "#f8fafc", borderRadius: 14, marginBottom: 10, border: "1px solid #f1f5f9" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "#1e293b" }}>{label}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{desc}</div>
                    </div>
                    <motion.button onClick={toggle} whileTap={{ scale: 0.94 }}
                      animate={{ backgroundColor: value ? "#0f172a" : "#e2e8f0" }}
                      transition={{ duration: 0.25 }}
                      style={{ width: 46, height: 24, borderRadius: 20, border: "none", position: "relative", cursor: "pointer" }}>
                      <motion.div animate={{ x: value ? 23 : 3 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        style={{ width: 18, height: 18, background: "white", borderRadius: "50%", position: "absolute", top: 3, boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }} />
                    </motion.button>
                  </div>
                ))}

                <motion.button onClick={() => setIsSettingsOpen(false)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  style={{ width: "100%", marginTop: 8, padding: 14, background: "linear-gradient(135deg,#2563eb,#7c3aed)", border: "none", borderRadius: 12, color: "white", fontWeight: 800, cursor: "pointer", fontSize: "0.95rem" }}>
                  Save & Close
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Station Picker Modal ────────────────────────────────────── */}
        <AnimatePresence>
          {showStationPicker && (
            <motion.div key="station-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
              <motion.div initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 20 }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                style={{ background: "#ffffff", borderRadius: 24, width: "100%", maxWidth: 500, maxHeight: "80vh", display: "flex", flexDirection: "column", border: "1px solid #f1f5f9", boxShadow: "0 28px 60px rgba(0,0,0,0.14)", overflow: "hidden" }}>
                <div style={{ padding: "22px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#0f172a" }}>Select Police Station</h3>
                    <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "#94a3b8" }}>We couldn't detect your local station. Please choose one manually.</p>
                  </div>
                  <motion.button onClick={() => setShowStationPicker(false)} whileHover={{ scale: 1.1, color: "#ef4444" }}
                    style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
                    <X size={22} />
                  </motion.button>
                </div>
                <div style={{ padding: "14px 16px", borderBottom: "1px solid #f8fafc" }}>
                  <div style={{ position: "relative" }}>
                    <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} size={16} />
                    <input type="text" placeholder="Search station or district…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ width: "100%", padding: "11px 12px 11px 38px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, color: "#0f172a", outline: "none", fontSize: 14, boxSizing: "border-box" }} />
                  </div>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
                  {availableStations.filter(s => s.stationName.toLowerCase().includes(searchQuery.toLowerCase()) || s.district.toLowerCase().includes(searchQuery.toLowerCase())).map((station) => (
                    <motion.button key={station.id} onClick={() => handleManualStationSelect(station)}
                      whileHover={{ background: activeStation?.id === station.id ? "rgba(37,99,235,0.11)" : "#f8fafc" }}
                      whileTap={{ scale: 0.98 }}
                      style={{
                        width: "100%", padding: 16, marginBottom: 10,
                        background: activeStation?.id === station.id ? "rgba(37,99,235,0.07)" : "#ffffff",
                        border: `1px solid ${activeStation?.id === station.id ? "#93c5fd" : "#f1f5f9"}`,
                        borderRadius: 14, textAlign: "left", cursor: "pointer", color: "#0f172a",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                      }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.97rem", color: "#1e293b" }}>{station.stationName}</div>
                        <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 2 }}>{station.district}, {station.state}</div>
                      </div>
                      <ChevronRight size={18} color="#cbd5e1" />
                    </motion.button>
                  ))}
                  {availableStations.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>Loading stations…</div>}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Leave Confirmation Modal ────────────────────────────────── */}
      <AnimatePresence>
        {showLeaveModal && (
          <motion.div key="leave-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(15,23,42,0.5)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <motion.div initial={{ opacity: 0, scale: 0.88, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.88, y: 20 }}
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
              style={{ background: "#ffffff", border: "1px solid #fee2e2", borderRadius: 20, padding: "32px 28px", maxWidth: 380, width: "100%", textAlign: "center", boxShadow: "0 24px 60px rgba(0,0,0,0.13)" }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 12 }}><TriangleAlert /></div>
              <h3 style={{ margin: "0 0 8px", fontSize: "1.12rem", fontWeight: 800, color: "#0f172a" }}>Leave complaint session?</h3>
              <p style={{ margin: "0 0 24px", fontSize: "0.85rem", color: "#94a3b8", lineHeight: 1.55 }}>Your conversation will be lost and cannot be recovered.</p>
              <div style={{ display: "flex", gap: 12 }}>
                <motion.button onClick={cancelLeave} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  style={{ flex: 1, padding: 12, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, color: "#475569", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem" }}>
                  Stay
                </motion.button>
                <motion.button onClick={confirmLeave} whileHover={{ scale: 1.03, background: "#dc2626" }} whileTap={{ scale: 0.97 }}
                  style={{ flex: 1, padding: 12, background: "#ef4444", border: "none", borderRadius: 12, color: "white", fontWeight: 700, cursor: "pointer", fontSize: "0.9rem" }}>
                  Yes, Leave
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Camera Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showCameraModal && (
          <motion.div key="camera" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#000", display: "flex", flexDirection: "column" }}>
            <video ref={cameraVideoElRef} autoPlay muted playsInline style={{ flex: 1, width: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 20px", background: "linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)" }}>
              <div style={{ display: "flex", gap: 8 }}>
                {["photo", "video"].map((mode) => (
                  <motion.button key={mode} onClick={() => !isRecording && setCameraMode(mode)} whileTap={{ scale: 0.93 }}
                    style={{ background: cameraMode === mode ? "rgba(139,92,246,0.9)" : "rgba(255,255,255,0.18)", border: "none", color: "white", cursor: isRecording ? "not-allowed" : "pointer", padding: "6px 16px", borderRadius: 20, fontSize: 12, fontWeight: 700, textTransform: "capitalize" }}>
                    {mode}
                  </motion.button>
                ))}
              </div>
              <motion.button onClick={closeCameraModal} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                style={{ background: "rgba(255,255,255,0.18)", border: "none", color: "white", cursor: "pointer", width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={18} />
              </motion.button>
            </div>
            <AnimatePresence>
              {isRecording && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ position: "absolute", top: 70, left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 8, background: "rgba(239,68,68,0.85)", borderRadius: 20, padding: "5px 14px" }}>
                  <motion.div animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1 }} style={{ width: 8, height: 8, borderRadius: "50%", background: "white" }} />
                  <span style={{ color: "white", fontSize: 12, fontWeight: 700 }}>REC</span>
                </motion.div>
              )}
            </AnimatePresence>
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", padding: "32px 20px 52px", background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)" }}>
              {cameraMode === "photo" ? (
                <motion.button onClick={capturePhoto} whileTap={{ scale: 0.88 }}
                  style={{ width: 72, height: 72, borderRadius: "50%", background: "white", border: "5px solid rgba(255,255,255,0.35)", cursor: "pointer", boxShadow: "0 0 28px rgba(255,255,255,0.4)" }} />
              ) : (
                <motion.button onClick={isRecording ? stopRecording : startRecording}
                  animate={{ backgroundColor: isRecording ? "#ef4444" : "white", boxShadow: isRecording ? "0 0 32px rgba(239,68,68,0.7)" : "0 0 24px rgba(255,255,255,0.35)" }}
                  whileTap={{ scale: 0.9 }}
                  style={{ width: 72, height: 72, borderRadius: "50%", border: `5px solid ${isRecording ? "rgba(239,68,68,0.45)" : "rgba(255,255,255,0.35)"}`, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {isRecording ? <div style={{ width: 22, height: 22, borderRadius: 4, background: "white" }} /> : <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#ef4444" }} />}
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Name Modal ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {showNameModal && (
          <motion.div key="name-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 10001, background: "rgba(15,23,42,0.45)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
            <motion.div initial={{ opacity: 0, scale: 0.9, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              style={{ background: "#ffffff", borderRadius: 20, padding: 28, maxWidth: 360, width: "100%", boxShadow: "0 20px 56px rgba(0,0,0,0.13)", border: "1px solid #f1f5f9" }}>
              <h3 style={{ margin: "0 0 6px", fontWeight: 800, color: "#0f172a" }}>Welcome!</h3>
              <p style={{ margin: "0 0 18px", color: "#94a3b8", fontSize: "0.87rem" }}>Please enter your name to personalize your session.</p>
              <input value={tempName} onChange={(e) => setTempName(e.target.value)} onKeyPress={(e) => e.key === "Enter" && handleSaveName()} autoFocus placeholder="Your name…"
                style={{ width: "100%", padding: "12px 16px", background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 12, color: "#0f172a", fontSize: 15, outline: "none", boxSizing: "border-box", marginBottom: 14 }} />
              <motion.button onClick={handleSaveName} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                style={{ width: "100%", padding: 13, background: "linear-gradient(135deg,#2563eb,#7c3aed)", border: "none", borderRadius: 12, color: "white", fontWeight: 800, cursor: "pointer", fontSize: "0.95rem" }}>
                Continue
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
