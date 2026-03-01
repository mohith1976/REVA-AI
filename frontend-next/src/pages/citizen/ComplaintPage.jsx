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
      text: `Hello${user?.name ? " " + user.name : ""}! I'm REVA, your AI Police Assistant. How can I help you today?`,
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
      <div className="relative flex flex-col h-screen bg-slate-50 text-slate-900 overflow-hidden font-[Inter,system-ui,sans-serif]">

        {/* ── Handshake overlay ──────────────────────────────────────── */}
        <AnimatePresence>
          {!isSecureHandshakeComplete && (
            <motion.div
              key="handshake"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.6 } }}
              className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-7 bg-slate-50"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                className="w-22 h-22 rounded-full flex items-center justify-center"
                style={{ border: "2.5px solid #e2e8f0", borderTop: "2.5px solid #334155" }}
              >
                <Shield size={40} color="#334155" />
              </motion.div>
              <div className="text-center">
                <motion.div
                  key={handshakeStep}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="font-mono text-slate-700 text-[11px] tracking-[2px] mb-3.5 font-bold"
                >
                  {["ESTABLISHING E2EE CHANNEL…", "SCANNING FOR LEAKS…", "VERIFYING INTEGRITY…", "CYBER-SEC ACTIVE"][handshakeStep]}
                </motion.div>
                <div className="w-[200px] h-0.5 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div
                    animate={{ width: `${(handshakeStep + 1) * 25}%` }}
                    transition={{ ease: "easeOut", duration: 0.4 }}
                    className="h-full bg-slate-800 rounded-full"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Ambient gradient blobs (must stay inline — radial-gradient) */}
        <div className="absolute top-[-15%] left-[-10%] w-[55%] h-[55%] pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(0,0,0,0.03) 0%, transparent 70%)" }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] pointer-events-none"
          style={{ background: "radial-gradient(circle, rgba(0,0,0,0.02) 0%, transparent 70%)" }} />

        {/* ── Back button ────────────────────────────────────────────── */}
        <motion.button
          onClick={handleBackClick}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ x: -3 }}
          whileTap={{ scale: 0.95 }}
          className="fixed top-[22px] left-7 z-40 flex items-center gap-1.5 bg-white/85 backdrop-blur-md border border-slate-200 rounded-[10px] px-3.5 py-[7px] text-[13px] font-semibold text-slate-600 cursor-pointer shadow-sm"
        >
          <ArrowLeft size={15} />Back
        </motion.button>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 28 }}
          className="relative z-10 flex justify-between items-center pl-[90px] pr-7 py-3.5 border-b border-slate-100 bg-slate-50/90 backdrop-blur-xl"
        >
          {/* Status chips */}
          <div className="flex items-center gap-2.5 ml-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={isListening ? "listening" : isInitializing ? "init" : isLoading ? "thinking" : "ready"}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                className={`text-[10px] font-bold px-3 py-1 rounded-full tracking-[0.5px] border ${isListening
                  ? "border-red-300 text-red-500 bg-red-50"
                  : "border-slate-300 text-slate-600 bg-slate-100"
                  }`}
              >
                {isInitializing ? "CONNECTING…" : isListening ? "● LISTENING" : isLoading ? "THINKING…" : "READY"}
              </motion.div>
            </AnimatePresence>

            <motion.div
              whileHover={{ scale: 1.05 }}
              onClick={() => setShowStationPicker(true)}
              className={`text-[10px] font-bold px-3 py-1 rounded-full flex items-center gap-1 cursor-pointer border ${activeStation
                ? "border-emerald-300 text-emerald-700 bg-emerald-50"
                : "border-amber-300 text-amber-600 bg-amber-50"
                }`}
            >
              {activeStation
                ? <><Shield size={10} /> {activeStation.stationName}</>
                : isCheckingGeofence ? "Locating…"
                  : <><AlertCircle size={10} /> Select Station</>}
            </motion.div>

            <motion.button
              onClick={logoutCitizen}
              whileHover={{ color: "#ef4444" }}
              className="bg-transparent border-none text-xs text-slate-400 cursor-pointer font-semibold"
            >
              Logout
            </motion.button>
          </div>
        </motion.header>

        {/* ── Message list ───────────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto px-6 pt-7 pb-[200px] relative z-[1]">
          <div className="max-w-[720px] mx-auto flex flex-col gap-5">

            {messages.map((msg, idx) => (
              <motion.div
                key={msg.id}
                variants={msgVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: idx < 3 ? idx * 0.08 : 0 }}
                className={`flex w-full ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`flex items-end gap-2.5 max-w-[82%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  {/* Avatar */}
                  <div className={`w-[30px] h-[30px] rounded-full shrink-0 flex items-center justify-center ${msg.role === "user" ? "bg-slate-800" : "bg-slate-100 border border-slate-200"
                    }`}>
                    {msg.role === "user" ? <User size={14} color="white" /> : <Bot size={14} color="#475569" />}
                  </div>

                  {/* Image message */}
                  {msg.type === "image" && (
                    <div className="flex flex-col gap-1">
                      <div className="relative inline-block">
                        <img
                          src={msg.imageUrl}
                          alt={msg.fileName}
                          className={`max-w-[240px] max-h-[240px] rounded-[16px_16px_4px_16px] border-2 border-slate-200 object-cover block transition-all duration-300 ${msg.loading ? "brightness-50" : ""}`}
                        />
                        {msg.loading && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                              <Loader2 size={26} color="#94a3b8" />
                            </motion.div>
                            <span className="text-[10px] text-slate-400 font-bold tracking-[1px]">ANALYZING…</span>
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 text-right">{msg.fileName} · {msg.timestamp}</div>
                    </div>
                  )}

                  {/* Image analysis result */}
                  {msg.type === "imageResult" && msg.analysisData && (
                    <div className="p-[14px_18px] rounded-[16px_16px_16px_4px] bg-white border border-slate-200 shadow-sm text-[0.85rem] max-w-[340px]">
                      <div className="flex items-center gap-2 mb-2.5">
                        <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-[0.5px] border ${msg.analysisData.forensicAnalysis?.analysis?.riskLevel === "Critical"
                          ? "bg-red-50 text-red-500 border-red-200"
                          : "bg-emerald-50 text-emerald-600 border-emerald-200"
                          }`}>
                          {msg.analysisData.isAiGenerated ? "🤖 AI GENERATED" : `⚠ ${msg.analysisData.forensicAnalysis?.analysis?.riskLevel?.toUpperCase() || "UNKNOWN"} RISK`}
                        </div>
                        <div className="text-[10px] text-slate-400">Forensic Analysis</div>
                      </div>
                      {msg.analysisData.forensicAnalysis?.overview && (
                        <p className="text-slate-700 leading-[1.55] m-0 mb-2">{msg.analysisData.forensicAnalysis.overview}</p>
                      )}
                      {msg.analysisData.isAiGenerated && (
                        <p className="text-red-400 text-[0.8rem] m-0">{msg.analysisData.reason}</p>
                      )}
                      {!msg.analysisData.isAiGenerated && msg.analysisData.forensicAnalysis?.analysis?.riskReason && (
                        <p className="text-slate-400 text-[0.78rem] m-0 mt-1 border-t border-slate-100 pt-2">{msg.analysisData.forensicAnalysis.analysis.riskReason}</p>
                      )}
                      <div className="text-[10px] text-slate-300 mt-2">{msg.timestamp} · {msg.analysisData.processingTimeMs}ms</div>
                    </div>
                  )}

                  {/* Image error */}
                  {msg.type === "imageError" && (
                    <div className="p-[12px_18px] rounded-[16px_16px_16px_4px] bg-red-50 border border-red-100 flex items-center gap-2.5 text-[0.85rem] text-red-600 max-w-[300px]">
                      <AlertTriangle size={16} color="#ef4444" className="shrink-0" />
                      <span>Analysis failed: {msg.errorMsg || "Unknown error"}</span>
                    </div>
                  )}

                  {/* Complaint receipt */}
                  {msg.type === "receipt" && msg.receipt && (
                    <div className="p-5 rounded-[16px_16px_16px_4px] bg-white border border-emerald-100 shadow-sm max-w-[340px] text-[0.85rem]">
                      <div className="flex items-center gap-2.5 mb-4">
                        <CheckCircle2 size={20} color="#10b981" />
                        <span className="font-bold text-emerald-700 text-[0.9rem]">Complaint Filed Successfully</span>
                      </div>
                      <div className="bg-slate-50 rounded-[10px] p-3 mb-3.5 text-center">
                        <div className="text-[0.65rem] text-slate-400 tracking-[1px] uppercase mb-1">Tracking ID</div>
                        <div className="text-xl font-extrabold text-slate-800 tracking-[2px]">{msg.receipt.trackingId}</div>
                      </div>
                      <div className="flex flex-col gap-2 mb-3.5">
                        {msg.receipt.station && (
                          <div className="flex gap-2 text-slate-600 items-start">
                            <MapPin size={14} color="#94a3b8" className="shrink-0 mt-0.5" />
                            <span>{msg.receipt.station}{msg.receipt.district ? `, ${msg.receipt.district}` : ""}</span>
                          </div>
                        )}
                        {msg.receipt.incidentType && (
                          <div className="flex gap-2 text-slate-600 items-start">
                            <FileText size={14} color="#94a3b8" className="shrink-0 mt-0.5" />
                            <span>{msg.receipt.incidentType}</span>
                          </div>
                        )}
                        {msg.receipt.priority && (
                          <div className="flex gap-2 text-slate-600 items-start">
                            <AlertCircle size={14} color={msg.receipt.priority === "URGENT" ? "#f87171" : "#fbbf24"} className="shrink-0 mt-0.5" />
                            <span>Priority: {msg.receipt.priority}</span>
                          </div>
                        )}
                        <div className="flex gap-2 text-slate-600 items-start">
                          <Clock size={14} color="#94a3b8" className="shrink-0 mt-0.5" />
                          <span>Filed at {msg.receipt.filedAt}</span>
                        </div>
                      </div>
                      <motion.button
                        onClick={() => router.push(`/track/${msg.receipt.trackingId}`)}
                        whileHover={{ scale: 1.02, backgroundColor: "#f1f5f9" }}
                        whileTap={{ scale: 0.97 }}
                        className="w-full py-2.5 rounded-[10px] bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[0.85rem] cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        Track Complaint <ChevronRight size={14} />
                      </motion.button>
                    </div>
                  )}

                  {/* Normal text bubble */}
                  {!msg.type && (
                    <div className="relative">
                      {editingMessageId === msg.id ? (
                        <div className="flex flex-col gap-2 min-w-[220px] max-w-[420px]">
                          <textarea
                            value={editedText}
                            onChange={(e) => setEditedText(e.target.value)}
                            autoFocus
                            rows={3}
                            className="p-3 rounded-[14px] bg-slate-50 border border-slate-300 text-slate-900 text-[0.95rem] leading-[1.55] resize-none outline-none w-full focus:border-slate-500"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEditingMessageId(null)}
                              className="px-3.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 text-[0.8rem] cursor-pointer"
                            >Cancel</button>
                            <button
                              onClick={() => handleSaveEdit(msg.id)}
                              className="px-3.5 py-1.5 rounded-lg bg-slate-900 border-none text-white text-[0.8rem] cursor-pointer flex items-center gap-1"
                            ><Check size={13} />Save</button>
                          </div>
                        </div>
                      ) : (
                        <div className="relative">
                          <div className={`px-[18px] py-3 text-[0.94rem] leading-[1.55] ${msg.role === "user"
                            ? "rounded-[18px_18px_4px_18px] bg-slate-800 text-white shadow-md"
                            : "rounded-[18px_18px_18px_4px] bg-white border border-slate-200 text-slate-800 shadow-sm"
                            }`}>
                            {msg.text}
                            <div className={`text-[10px] text-right mt-1 ${msg.role === "user" ? "text-white/50" : "text-slate-300"}`}>
                              {msg.timestamp}
                            </div>
                          </div>
                          {msg.role === "user" && (
                            <motion.button
                              onClick={() => { setEditingMessageId(msg.id); setEditedText(msg.text); }}
                              title="Edit message"
                              initial={{ opacity: 0 }}
                              whileHover={{ opacity: 1, scale: 1.15 }}
                              className="absolute -top-2.5 -left-2.5 w-6 h-6 rounded-full bg-slate-700 border border-slate-500 cursor-pointer flex items-center justify-center"
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
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3 items-end"
              >
                <div className="w-[30px] h-[30px] rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                  <Bot size={14} color="#475569" />
                </div>
                <div className="px-[18px] py-3.5 rounded-[18px_18px_18px_4px] bg-white border border-slate-200 shadow-sm flex gap-1.5 items-center">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-[7px] h-[7px] rounded-full bg-slate-400"
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
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="self-end px-4 py-2.5 bg-slate-100 rounded-[14px_14px_4px_14px] border border-dashed border-slate-300 text-slate-600 text-[0.9rem] max-w-[80%] break-words leading-[1.55]"
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
          className="fixed bottom-7 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center gap-2.5 bg-white/90 backdrop-blur-2xl border border-slate-200 rounded-[56px] px-4 py-2 max-w-max shadow-xl shadow-black/5"
        >
          {/* Hidden file inputs */}
          <input ref={imageFileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleMediaUpload} />
          <input ref={cameraPhotoRef} type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={handleMediaUpload} />

          {/* Settings */}
          <motion.button
            onClick={() => setIsSettingsOpen(true)}
            whileHover={{ scale: 1.15, color: "#0f172a" }}
            whileTap={{ scale: 0.9 }}
            title="Settings"
            className="bg-transparent border-none text-slate-400 cursor-pointer p-[6px_8px] rounded-[10px]"
          >
            <Settings size={18} />
          </motion.button>

          {/* Media */}
          <div className="relative">
            <motion.button
              onClick={() => setShowMediaMenu((v) => !v)}
              disabled={isMediaUploading}
              whileHover={{ scale: 1.1, color: "#0f172a" }}
              whileTap={{ scale: 0.92 }}
              title="Attach media"
              className={`bg-transparent border-none p-[6px_8px] rounded-[10px] flex items-center justify-center ${isMediaUploading ? "text-slate-300 cursor-not-allowed" : "text-slate-400 cursor-pointer"
                }`}
            >
              {isMediaUploading
                ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><Loader2 size={18} /></motion.div>
                : <ImageIcon size={18} />}
            </motion.button>

            <AnimatePresence>
              {showMediaMenu && !isMediaUploading && (
                <>
                  <div onClick={() => setShowMediaMenu(false)} className="fixed inset-0 z-40" />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 8 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="absolute bottom-[calc(100%+12px)] left-1/2 -translate-x-1/2 bg-white border border-slate-200 rounded-[14px] p-2 min-w-[160px] z-50 shadow-xl shadow-black/10 flex flex-col gap-0.5"
                  >
                    {[
                      { icon: <Camera size={15} color="#475569" />, label: "Camera", action: openCameraModal },
                      { icon: <FolderOpen size={15} color="#475569" />, label: "From Device", action: () => { setShowMediaMenu(false); imageFileRef.current?.click(); } },
                    ].map(({ icon, label, action }) => (
                      <motion.button
                        key={label}
                        onClick={action}
                        whileHover={{ backgroundColor: "#f8fafc" }}
                        className="flex items-center gap-2.5 bg-transparent border-none text-slate-600 cursor-pointer p-[9px_12px] rounded-[10px] text-[13px] font-medium text-left"
                      >
                        {icon}{label}
                      </motion.button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          {/* | divider */}
          <div className="w-px h-5 bg-slate-200 shrink-0" />

          {/* Chat input — always visible */}
          <div className="flex items-center gap-2 bg-slate-50 rounded-[28px] pl-3.5 pr-1.5 py-1 border border-slate-200 w-[260px]">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyPress={(e) => { if (e.key === "Enter" && textInput.trim() && !isLoading) { sendMessage(textInput); setTextInput(""); } }}
              placeholder="Type a message…"
              disabled={isLoading}
              className="flex-1 bg-transparent border-none outline-none text-slate-900 text-[13px] py-[7px] placeholder-slate-400"
            />
            <motion.button
              onClick={() => { if (textInput.trim() && !isLoading) { sendMessage(textInput); setTextInput(""); } }}
              disabled={!textInput.trim() || isLoading}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={`w-[30px] h-[30px] rounded-full border-none text-white flex items-center justify-center shrink-0 transition-colors duration-200 ${textInput.trim() && !isLoading ? "bg-slate-900 cursor-pointer" : "bg-slate-200 cursor-not-allowed"
                }`}
            >
              <Send size={14} />
            </motion.button>
          </div>

          {/* | divider */}
          <div className="w-px h-5 bg-slate-200 shrink-0" />

          {/* Stop */}
          <motion.button
            onClick={() => { cancelSpeech(); stopSTT(); }}
            whileHover={{ scale: 1.15, color: "#0f172a" }}
            whileTap={{ scale: 0.9 }}
            title="Stop audio / Cancel"
            className="bg-transparent border-none text-slate-400 cursor-pointer p-[6px_8px] rounded-[10px]"
          >
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
            className={`w-14 h-14 rounded-full border-none text-white flex items-center justify-center shrink-0 ${isInitializing || isSpeaking || isMediaUploading ? "cursor-not-allowed" : "cursor-pointer"
              }`}
          >
            {isInitializing
              ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><Loader2 size={24} color="white" /></motion.div>
              : isSpeaking ? <Volume2 size={24} />
                : isListening ? <MicOff size={24} />
                  : <Mic size={24} />}
          </motion.button>

          {/* | divider */}
          <div className="w-px h-5 bg-slate-200 shrink-0" />

          {/* File complaint — location icon */}
          <motion.button
            onClick={finalizeComplaint}
            disabled={isSubmitting}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.93 }}
            title={isSubmitting ? "Filing…" : "File Complaint"}
            animate={{ backgroundColor: isSubmitting ? "#94a3b8" : "#1e293b" }}
            transition={{ duration: 0.3 }}
            className={`w-[38px] h-[38px] rounded-full border-none text-white flex items-center justify-center shrink-0 shadow-md ${isSubmitting ? "cursor-not-allowed" : "cursor-pointer"
              }`}
          >
            {isSubmitting
              ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}><Loader2 size={16} /></motion.div>
              : <MapPin size={17} />}
          </motion.button>

          {/* Language selector */}
          <div className="flex items-center bg-slate-50 rounded-[20px] px-2.5 border border-slate-200">
            <Globe size={12} color="#94a3b8" />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-transparent border-none text-slate-600 py-[7px] px-1 cursor-pointer text-xs font-bold outline-none"
            >
              {[["en", "EN"], ["hi", "HI"], ["te", "TE"], ["ta", "TA"], ["kn", "KN"], ["mr", "MR"], ["bn", "BN"], ["gu", "GU"], ["ml", "ML"], ["pa", "PA"]].map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* ── Settings Modal ─────────────────────────────────────────── */}
        <AnimatePresence>
          {isSettingsOpen && (
            <motion.div
              key="settings-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur flex items-center justify-center p-5"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 16 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="bg-white rounded-[24px] w-full max-w-[380px] p-7 border border-slate-100 shadow-2xl shadow-black/10"
              >
                <div className="flex justify-between items-center mb-6">
                  <h3 className="m-0 text-[1.1rem] font-extrabold text-slate-900">Voice Settings</h3>
                  <motion.button
                    onClick={() => setIsSettingsOpen(false)}
                    whileHover={{ scale: 1.12, color: "#ef4444" }}
                    className="bg-transparent border-none text-slate-400 cursor-pointer"
                  >
                    <X size={20} />
                  </motion.button>
                </div>

                {[
                  { label: "Auto-Stop Listening", desc: "Detects when you finish speaking", value: autoStop, toggle: () => setAutoStop(!autoStop) },
                  { label: "Auto-Handsfree Mode", desc: "Mic turns on after REVA finishes", value: autoResumeMic, toggle: () => setAutoResumeMic(!autoResumeMic) },
                ].map(({ label, desc, value, toggle }) => (
                  <div key={label} className="flex justify-between items-center p-4 bg-slate-50 rounded-[14px] mb-2.5 border border-slate-100">
                    <div>
                      <div className="font-bold text-[0.92rem] text-slate-800">{label}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{desc}</div>
                    </div>
                    <motion.button
                      onClick={toggle}
                      whileTap={{ scale: 0.94 }}
                      animate={{ backgroundColor: value ? "#0f172a" : "#e2e8f0" }}
                      transition={{ duration: 0.25 }}
                      className="w-[46px] h-6 rounded-[20px] border-none relative cursor-pointer"
                    >
                      <motion.div
                        animate={{ x: value ? 23 : 3 }}
                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        className="w-[18px] h-[18px] bg-white rounded-full absolute top-[3px] shadow-sm"
                      />
                    </motion.button>
                  </div>
                ))}

                <motion.button
                  onClick={() => setIsSettingsOpen(false)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full mt-2 py-3.5 bg-slate-900 border-none rounded-[12px] text-white font-extrabold cursor-pointer text-[0.95rem]"
                >
                  Save & Close
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Station Picker Modal ────────────────────────────────────── */}
        <AnimatePresence>
          {showStationPicker && (
            <motion.div
              key="station-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-slate-900/45 backdrop-blur-md flex items-center justify-center p-5"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 20 }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                className="bg-white rounded-[24px] w-full max-w-[500px] max-h-[80vh] flex flex-col border border-slate-100 shadow-2xl shadow-black/10 overflow-hidden"
              >
                <div className="p-[22px_24px] border-b border-slate-100 flex justify-between items-center">
                  <div>
                    <h3 className="m-0 text-[1.15rem] font-extrabold text-slate-900">Select Police Station</h3>
                    <p className="m-0 mt-1 text-[0.8rem] text-slate-400">We couldn't detect your local station. Please choose one manually.</p>
                  </div>
                  <motion.button
                    onClick={() => setShowStationPicker(false)}
                    whileHover={{ scale: 1.1, color: "#ef4444" }}
                    className="bg-transparent border-none text-slate-400 cursor-pointer"
                  >
                    <X size={22} />
                  </motion.button>
                </div>
                <div className="p-[14px_16px] border-b border-slate-50">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search station or district…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full py-[11px] pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-[12px] text-slate-900 outline-none text-sm box-border"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {availableStations
                    .filter(s =>
                      s.stationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      s.district.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((station) => (
                      <motion.button
                        key={station.id}
                        onClick={() => handleManualStationSelect(station)}
                        whileHover={{ backgroundColor: activeStation?.id === station.id ? "rgba(15,23,42,0.06)" : "#f8fafc" }}
                        whileTap={{ scale: 0.98 }}
                        className={`w-full p-4 mb-2.5 rounded-[14px] text-left cursor-pointer flex justify-between items-center border text-slate-900 ${activeStation?.id === station.id
                          ? "bg-slate-50 border-slate-300"
                          : "bg-white border-slate-100"
                          }`}
                      >
                        <div>
                          <div className="font-bold text-[0.97rem] text-slate-800">{station.stationName}</div>
                          <div className="text-[0.78rem] text-slate-400 mt-0.5">{station.district}, {station.state}</div>
                        </div>
                        <ChevronRight size={18} color="#cbd5e1" />
                      </motion.button>
                    ))}
                  {availableStations.length === 0 && (
                    <div className="text-center p-10 text-slate-400">Loading stations…</div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Leave Confirmation Modal ────────────────────────────────── */}
      <AnimatePresence>
        {showLeaveModal && (
          <motion.div
            key="leave-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] bg-slate-900/50 backdrop-blur-md flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.88, y: 20 }}
              transition={{ type: "spring", stiffness: 420, damping: 30 }}
              className="bg-white border border-red-100 rounded-[20px] p-8 max-w-[380px] w-full text-center shadow-2xl shadow-black/10"
            >
              <div className="mb-3 flex justify-center items-center"><TriangleAlert size={56} className="text-red-500" /></div>
              <h3 className="m-0 mb-2 text-[1.12rem] font-extrabold text-slate-900">Leave complaint session?</h3>
              <p className="m-0 mb-6 text-[0.85rem] text-slate-400 leading-[1.55]">Your conversation will be lost and cannot be recovered.</p>
              <div className="flex gap-3">
                <motion.button
                  onClick={cancelLeave}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 py-3 bg-slate-50 border border-slate-200 rounded-[12px] text-slate-600 font-bold cursor-pointer text-[0.9rem]"
                >Stay</motion.button>
                <motion.button
                  onClick={confirmLeave}
                  whileHover={{ scale: 1.03, backgroundColor: "#dc2626" }}
                  whileTap={{ scale: 0.97 }}
                  className="flex-1 py-3 bg-red-500 border-none rounded-[12px] text-white font-bold cursor-pointer text-[0.9rem]"
                >Yes, Leave</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Camera Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showCameraModal && (
          <motion.div
            key="camera"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black flex flex-col"
          >
            <video ref={cameraVideoElRef} autoPlay muted playsInline className="flex-1 w-full object-cover" />
            <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-[18px_20px]"
              style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)" }}>
              <div className="flex gap-2">
                {["photo", "video"].map((mode) => (
                  <motion.button
                    key={mode}
                    onClick={() => !isRecording && setCameraMode(mode)}
                    whileTap={{ scale: 0.93 }}
                    className={`border-none text-white py-1.5 px-4 rounded-[20px] text-xs font-bold capitalize cursor-pointer ${cameraMode === mode ? "bg-white/30" : "bg-white/15"
                      } ${isRecording ? "cursor-not-allowed" : ""}`}
                  >
                    {mode}
                  </motion.button>
                ))}
              </div>
              <motion.button
                onClick={closeCameraModal}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="bg-white/15 border-none text-white cursor-pointer w-9 h-9 rounded-full flex items-center justify-center"
              >
                <X size={18} />
              </motion.button>
            </div>

            <AnimatePresence>
              {isRecording && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="absolute top-[70px] left-1/2 -translate-x-1/2 flex items-center gap-2 bg-red-500/85 rounded-[20px] px-3.5 py-[5px]"
                >
                  <motion.div animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1 }}
                    className="w-2 h-2 rounded-full bg-white" />
                  <span className="text-white text-xs font-bold">REC</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="absolute bottom-0 left-0 right-0 flex justify-center items-center pt-8 pb-[52px] px-5"
              style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)" }}>
              {cameraMode === "photo" ? (
                <motion.button
                  onClick={capturePhoto}
                  whileTap={{ scale: 0.88 }}
                  className="w-[72px] h-[72px] rounded-full bg-white border-[5px] border-white/35 cursor-pointer shadow-xl shadow-white/40"
                />
              ) : (
                <motion.button
                  onClick={isRecording ? stopRecording : startRecording}
                  animate={{
                    backgroundColor: isRecording ? "#ef4444" : "white",
                    boxShadow: isRecording ? "0 0 32px rgba(239,68,68,0.7)" : "0 0 24px rgba(255,255,255,0.35)"
                  }}
                  whileTap={{ scale: 0.9 }}
                  className={`w-[72px] h-[72px] rounded-full border-[5px] cursor-pointer flex items-center justify-center ${isRecording ? "border-red-400/45" : "border-white/35"
                    }`}
                >
                  {isRecording
                    ? <div className="w-[22px] h-[22px] rounded bg-white" />
                    : <div className="w-6 h-6 rounded-full bg-red-500" />}
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
