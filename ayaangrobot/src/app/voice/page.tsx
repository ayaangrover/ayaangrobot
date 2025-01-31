"use client"

import { useState, useEffect, useRef } from 'react';
import CustomCursor from "../../../components/CustomCursor";
import { initializeApp } from 'firebase/app';
import { getAuth, Auth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, deleteDoc, updateDoc, serverTimestamp, arrayUnion, increment } from "firebase/firestore";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface UserData {
  lastVisited: Date;
  signup: Date;
  visits: number;
  visitTimestamps: Date[];
  premium: boolean;
}

const updateUserData = async (userId: string) => {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    await updateDoc(userRef, {
      lastVisited: serverTimestamp(),
      visits: increment(1),
      visitTimestamps: arrayUnion(new Date()),
    });
  } else {
    const newUserData: UserData = {
      lastVisited: new Date(),
      premium: false,
      signup: new Date(),
      visits: 1,
      visitTimestamps: [new Date()],
    };
    await setDoc(userRef, newUserData);
  }
};

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

declare global {
  interface Window {
    webkitSpeechRecognition: any;
  }

  interface SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    onresult: (event: SpeechRecognitionEvent) => void;
    onend: () => void;
  }

  interface SpeechRecognitionEvent extends Event {
    resultIndex: number;
    results: SpeechRecognitionResultList;
  }
}

const app = initializeApp(firebaseConfig);
const auth: Auth = getAuth(app);
const db = getFirestore(app);

const MAX_FIRESTORE_DOCUMENT_SIZE = 1048576; // 1,048,576 bytes
const FREE_CHARACTER_LIMIT = 1000;

const calculateChatHistorySize = (chatHistory: ChatMessage[]): number => {
  return new Blob([JSON.stringify(chatHistory)]).size;
};

const saveChatHistory = async (userId: string, chatHistory: ChatMessage[]) => {
  try {
    let currentSize = calculateChatHistorySize(chatHistory);

    while (currentSize > MAX_FIRESTORE_DOCUMENT_SIZE) {
      chatHistory.shift();
      currentSize = calculateChatHistorySize(chatHistory);
    }

    await setDoc(doc(db, "chats", userId), { chatHistory });
  } catch (error) {
    console.error("Error saving chat history:", error);
  }
};

const getChatHistory = async (userId: string): Promise<ChatMessage[]> => {
  try {
    const docRef = doc(db, "chats", userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().chatHistory;
    } else {
      return [];
    }
  } catch (error) {
    console.error("Error getting chat history:", error);
    return [];
  }
};

const VoiceChat = () => {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [assistantMessage, setAssistantMessage] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await updateUserData(user.uid);
      }
    });
  
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new (window as any).webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            setMessage((prev) => prev + event.results[i][0].transcript);
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        console.log(interimTranscript);
      };

      recognition.onend = () => {
        if (isListening) {
          recognition.start();
        }
      };

      recognitionRef.current = recognition;
    } else {
      console.error('Speech recognition not supported in this browser.');
    }
  }, [isListening]);

  const handleSendMessage = async () => {
    try {
      if (!auth.currentUser) {
        throw new Error("User not authenticated");
      }
  
      if (!message.trim()) {
        console.log("Empty message, skipping request");
        return;
      }
  
      const userId = auth.currentUser.uid;
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);
  
      if (!userSnap.exists()) {
        throw new Error("User document does not exist");
      }
  
      const userData = userSnap.data();
      const isPremium = userData.premium;
  
      const chatHistory = await getChatHistory(userId);
      const totalCharacters = chatHistory.reduce((acc, msg) => acc + msg.content.length, 0) + message.length;
  
      if (!isPremium && totalCharacters > FREE_CHARACTER_LIMIT) {
        throw new Error("Character limit exceeded. Email ayaangrobot-aaaaowlmjut7p3xbifcpxxhxny@hackclub.slack.com to get more credits(this is to combat fraud).");
      }
  
      const formattedMessages = chatHistory.map(msg => ({
        role: msg.role,
        content: msg.content.trim()
      }));
  
      formattedMessages.push({
        role: "user",
        content: message.trim()
      });
  
      console.log("Sending request to Groq API:", {
        messages: formattedMessages,
        model: "mixtral-8x7b-32768",
        temperature: 0.7,
        max_tokens: 2048
      });
  
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`
        },
        body: JSON.stringify({
          messages: formattedMessages,
          model: "mixtral-8x7b-32768",
          temperature: 0.7,
          max_tokens: 2048
        })
      });
  
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error("Groq API Error:", errorData);
        throw new Error(`HTTP error! status: ${response.status}, details: ${JSON.stringify(errorData)}`);
      }
  
      const data = await response.json();
      const assistantMessage = data.choices[0].message.content;
      setAssistantMessage(assistantMessage);
  
      chatHistory.push({ role: "user", content: message });
      chatHistory.push({ role: "assistant", content: assistantMessage });
  
      const ttsResponse = await fetch("http://localhost:3002/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: assistantMessage }),
      });
      
      if (!ttsResponse.ok) {
        throw new Error(`HTTP error! status: ${ttsResponse.status}`);
      }

      const streamId = ttsResponse.headers.get('Stream-ID');
      const audioUrl = URL.createObjectURL(await ttsResponse.blob());
      const audio = new Audio(audioUrl);
      const mediaSource = new MediaSource();

      mediaSource.addEventListener('sourceopen', async () => {
        const sourceBuffer = mediaSource.addSourceBuffer('audio/mpeg');
        
        const reader = ttsResponse.body?.getReader();
        
        while (true) {
          const readResult = await reader?.read();
          if (!readResult) break;
          
          const { done, value } = readResult;
          if (value) {
            sourceBuffer.appendBuffer(value);
          }
        }
        
        mediaSource.endOfStream();
      });

      await audio.play();
  
      await saveChatHistory(userId, chatHistory);
    } catch (error) {
      console.error("Error generating audio:", error);
      setAssistantMessage(`Error: ${(error as Error).message}`);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      handleSendMessage();
    } else {
      setMessage('');
      recognitionRef.current?.start();
    }
    setIsListening(!isListening);
  };

  return (
    <div className="p-4">
      <CustomCursor />
      <h1 className="text-2xl font-bold mb-4">Audio Chat</h1>
      <div className="flex justify-center items-center">
        <button
          className={`w-32 h-32 rounded-full ${isListening ? 'bg-red-500' : 'bg-blue-500'} text-white flex items-center justify-center`}
          onClick={toggleListening}
        >
          {isListening ? 'Listening...' : 'Start'}
        </button>
      </div>
      <p className="mt-4 text-center">{isListening ? message : assistantMessage}</p>
    </div>
  );
};

export default VoiceChat;