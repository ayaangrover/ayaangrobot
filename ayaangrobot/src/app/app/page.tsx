"use client";

import { useEffect, useState, useCallback } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, User } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA4EH_d8_qmCrYTOjwpOhLKE358pBbr18Q",
  authDomain: "fir-auth-a88ab.firebaseapp.com",
  projectId: "fir-auth-a88ab",
  storageBucket: "fir-auth-a88ab.appspot.com",
  messagingSenderId: "877345739547",
  appId: "1:877345739547:web:3df24f5ec45383b49879be"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const initialPrompt = {
  role: "system",
  content: "You are Ayaan Grobot. You are the AI version of Ayaan Grover. Just like him, you code, play chess, read, and swim. You do not talk in large messages. You do not ask too many questions. You do not use emojis unless asked to. You do not condone illegal activities."
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [chatHistory, setChatHistory] = useState([initialPrompt]);
  const [userName, setUserName] = useState("");

  const loadChatHistory = useCallback(async (userId: string) => {
    try {
      const docSnap = await getDoc(doc(db, "chats", userId));
      if (docSnap.exists()) {
        const history = docSnap.data().chatHistory as { role: string; content: string }[];
        setChatHistory([initialPrompt, ...history]);
        history.forEach((message) => appendMessage(message.role === "user" ? userName : "Assistant", formatMessage(message.content), message.role));
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
    }
  }, [userName]);

  useEffect(() => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        if (user.displayName) {
          setUserName(user.displayName.split(" ")[0]);
        }
        loadChatHistory(user.uid);
      } else {
        setUser(null);
      }
    });
  }, [loadChatHistory]);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error logging in with Google:", error);
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const sendMessage = async () => {
    const userInput = (document.getElementById("user-input") as HTMLInputElement).value;
    if (!userInput) return;
    appendMessage(userName, userInput, "user");
    const updatedChatHistory = [...chatHistory, { role: "user", content: userInput }];
    setChatHistory(updatedChatHistory);
    (document.getElementById("user-input") as HTMLInputElement).value = "";
    const requestBody = {
      messages: updatedChatHistory,
      model: "llama3-8b-8192"
    };
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer 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"
        },
        body: JSON.stringify(requestBody)
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
      }
      const data = await response.json();
      const assistantMessage = data.choices[0].message.content || "No reply received";
      appendMessage("Ayaan Grobot", formatMessage(assistantMessage), "assistant");
      const finalChatHistory = [...updatedChatHistory, { role: "assistant", content: assistantMessage }];
      setChatHistory(finalChatHistory);
      if (auth.currentUser) {
        saveChatHistory(auth.currentUser.uid, finalChatHistory);
      }
    } catch (error) {
      console.error("Error:", error);
      appendMessage("Assistant", "Sorry, there was an error processing your request.", "assistant");
    }
  };

  const appendMessage = (sender: string, message: string, role: string) => {
    const chatBox = document.getElementById("chat-box");
    if (chatBox) {
      const messageContainer = document.createElement("div");
      messageContainer.classList.add("message-container", role);
      const messageBubble = document.createElement("div");
      messageBubble.classList.add("message-bubble");
      messageBubble.innerHTML = message;
      messageContainer.appendChild(messageBubble);
      chatBox.appendChild(messageContainer);
      chatBox.scrollTop = chatBox.scrollHeight;
    }
  };

  const formatMessage = (message: string) => {
    return message
      .replace(/^###### (.*?)$/gm, "<h6>$1</h6>") // Headers level 6
      .replace(/^##### (.*?)$/gm, "<h5>$1</h5>") // Headers level 5
      .replace(/^#### (.*?)$/gm, "<h4>$1</h4>") // Headers level 4
      .replace(/^### (.*?)$/gm, "<h3>$1</h3>") // Headers level 3
      .replace(/^## (.*?)$/gm, "<h2>$1</h2>") // Headers level 2
      .replace(/^# (.*?)$/gm, "<h1>$1</h1>") // Headers level 1
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // Bold
      .replace(/\*(.*?)\*/g, "<em>$1</em>") // Italic
      .replace(/`([^`]+)`/g, "<code>$1</code>"); // Code
  };

  const saveChatHistory = async (userId: string, chatHistory: { role: string; content: string }[]) => {
    try {
      await setDoc(doc(db, "chats", userId), { chatHistory });
    } catch (error) {
      console.error("Error saving chat history:", error);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div id="navbar" className="bg-black text-white p-4 flex justify-between items-center rounded-lg">
        <h2 id="navbar-title" className="text-2xl font-semibold">Ayaan Grobot</h2>
        <div>
          <button id="sign-out-button" onClick={signOutUser} className="bg-white text-black px-4 py-2 rounded-lg">Sign Out</button>
        </div>
      </div>
      {user ? (
        <div className="p-4">
          <div id="chat-box" className="h-96 overflow-y-auto p-4 bg-gray-900 rounded-lg"></div>
          <div id="input-container" className="flex mt-4">
            <input type="text" id="user-input" placeholder="Type your message here..." className="flex-grow mr-2 p-2 border rounded-lg bg-gray-800 text-white" onKeyDown={handleKeyDown} />
            <button id="send-button" onClick={sendMessage} className="bg-white text-black px-4 py-2 rounded-lg">Send</button>
          </div>
        </div>
      ) : (
        <div id="login-container" className="p-4">
          <h2 className="text-xl font-semibold mb-4">Login</h2>
          <button id="google-login-button" onClick={loginWithGoogle} className="bg-white text-black px-4 py-2 rounded-lg">Login with Google</button>
        </div>
      )}
    </div>
  );
}