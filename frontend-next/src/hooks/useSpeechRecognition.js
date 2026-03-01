import { useState, useEffect, useCallback, useRef } from 'react';
import * as speechsdk from 'microsoft-cognitiveservices-speech-sdk';

export const useSpeechRecognition = (language = 'en-US', autoStop = false) => {
    const [isListening, setIsListening] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const recognizerRef = useRef(null);
    const isStartingRef = useRef(false);

    useEffect(() => {
        return () => {
            if (recognizerRef.current) {
                recognizerRef.current.close();
                recognizerRef.current = null;
            }
        };
    }, []);

    const stopListening = useCallback(() => {
        if (recognizerRef.current) {
            recognizerRef.current.stopContinuousRecognitionAsync(
                () => {
                    if (recognizerRef.current) {
                        recognizerRef.current.close();
                        recognizerRef.current = null;
                    }
                    setIsListening(false);
                    setIsInitializing(false);
                    isStartingRef.current = false;
                },
                (err) => {
                    console.error(err);
                    setIsListening(false);
                    setIsInitializing(false);
                    isStartingRef.current = false;
                }
            );
        } else {
            setIsListening(false);
            setIsInitializing(false);
            isStartingRef.current = false;
        }
    }, []);

    const startListening = useCallback(() => {
        if (isListening || isStartingRef.current) return;

        isStartingRef.current = true;
        setIsInitializing(true);
        setIsListening(true);

        const key = process.env.NEXT_PUBLIC_AZURE_SPEECH_KEY;
        const region = process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION;
        if (!key || !region) {
            console.warn('Azure Speech keys not configured — speech recognition unavailable.');
            setIsListening(false);
            setIsInitializing(false);
            isStartingRef.current = false;
            return;
        }

        try {
            const speechConfig = speechsdk.SpeechConfig.fromSubscription(key, region);
            speechConfig.speechRecognitionLanguage = language;

            const audioConfig = speechsdk.AudioConfig.fromDefaultMicrophoneInput();
            const recognizer = new speechsdk.SpeechRecognizer(speechConfig, audioConfig);

            recognizer.recognizing = (s, e) => {
                setInterimTranscript(e.result.text);
            };

            recognizer.recognized = (s, e) => {
                if (e.result.reason === speechsdk.ResultReason.RecognizedSpeech) {
                    const newText = e.result.text.trim();
                    if (newText) {
                        setTranscript((prev) => {
                            if (prev.endsWith(newText)) return prev;
                            return prev ? `${prev} ${newText}` : newText;
                        });
                    }
                    setInterimTranscript('');

                    if (autoStop) {
                        recognizer.stopContinuousRecognitionAsync(() => {
                            recognizer.close();
                            if (recognizerRef.current === recognizer) {
                                recognizerRef.current = null;
                            }
                            setIsListening(false);
                            setIsInitializing(false);
                            isStartingRef.current = false;
                        });
                    }
                }
            };

            recognizer.canceled = (s, e) => {
                console.error(`CANCELED: Reason=${e.reason}`);
                stopListening();
            };

            recognizer.sessionStopped = (s, e) => {
                console.log('Session stopped.');
                stopListening();
            };

            recognizer.startContinuousRecognitionAsync(
                () => {
                    recognizerRef.current = recognizer;
                    setIsInitializing(false);
                    isStartingRef.current = false;
                },
                (err) => {
                    console.error('Start Error: ' + err);
                    setIsListening(false);
                    setIsInitializing(false);
                    isStartingRef.current = false;
                    if (recognizer) recognizer.close();
                }
            );
        } catch (error) {
            console.error('Error starting recognition:', error);
            setIsListening(false);
            setIsInitializing(false);
            isStartingRef.current = false;
        }
    }, [isListening, language, autoStop, stopListening]);

    const resetTranscript = useCallback(() => {
        setTranscript('');
        setInterimTranscript('');
    }, []);

    return {
        isListening,
        isInitializing,
        transcript,
        interimTranscript,
        startListening,
        stopListening,
        resetTranscript,
        hasRecognitionSupport: true,
    };
};
