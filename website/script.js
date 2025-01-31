import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

// Firebase configuration
const firebaseConfig = {
    apiKey: "API_KEY",
    authDomain: "fir-auth-a88ab.firebaseapp.com",
    projectId: "fir-auth-a88ab",
    storageBucket: "fir-auth-a88ab.appspot.com",
    messagingSenderId: "877345739547",
    appId: "1:877345739547:web:3df24f5ec45383b49879be"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

document.getElementById('google-login-button').addEventListener('click', loginWithGoogle);
document.getElementById('send-button').addEventListener('click', sendMessage);
document.getElementById('user-input').addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
});
document.getElementById('switch-to-voice').addEventListener('click', switchToVoiceChat);
document.getElementById('switch-to-text').addEventListener('click', switchToTextChat);
document.getElementById('sign-out-button').addEventListener('click', signOutUser);

let chatHistory = [];
let userName = '';
let recognition;
let isRecording = false;

onAuthStateChanged(auth, user => {
    if (user) {
        userName = user.displayName.split(' ')[0];
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('chat-container').style.display = 'block';
        loadChatHistory(user.uid);
    } else {
        document.getElementById('login-container').style.display = 'block';
        document.getElementById('chat-container').style.display = 'none';
    }
});

async function loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error('Error logging in with Google:', error);
    }
}

async function signOutUser() {
    try {
        await signOut(auth);
        document.getElementById('login-container').style.display = 'block';
        document.getElementById('chat-container').style.display = 'none';
    } catch (error) {
        console.error('Error signing out:', error);
    }
}

async function sendMessage() {
    const userInput = document.getElementById('user-input').value;
    if (!userInput) return;

    appendMessage(userName, userInput, 'user');
    chatHistory.push({ role: "user", content: userInput });
    document.getElementById('user-input').value = '';

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer API_KEY'
            },
            body: JSON.stringify({
                messages: chatHistory,
                model: "llama3-8b-8192"
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
        }

        const data = await response.json();
        const assistantMessage = data.choices[0].message.content || 'No reply received';
        appendMessage('Ayaan Grobot', assistantMessage, 'assistant');
        chatHistory.push({ role: "assistant", content: assistantMessage });
        saveChatHistory(auth.currentUser.uid);
        speakMessage(assistantMessage);
    } catch (error) {
        console.error('Error:', error);
        appendMessage('Assistant', 'Sorry, there was an error processing your request.', 'assistant');
    }
}

function appendMessage(sender, message, role) {
    const chatBox = document.getElementById('chat-box');
    const messageContainer = document.createElement('div');
    messageContainer.classList.add('message-container', role);
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', role);
    messageElement.textContent = `${sender}: ${message}`;
    messageContainer.appendChild(messageElement);
    chatBox.appendChild(messageContainer);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function switchToVoiceChat() {
    document.getElementById('chat-container').style.display = 'none';
    document.getElementById('voice-container').style.display = 'block';
    document.getElementById('switch-to-voice').style.display = 'none';
    document.getElementById('switch-to-text').style.display = 'block';
}

function switchToTextChat() {
    document.getElementById('voice-container').style.display = 'none';
    document.getElementById('chat-container').style.display = 'block';
    document.getElementById('switch-to-voice').style.display = 'block';
    document.getElementById('switch-to-text').style.display = 'none';
}

function toggleVoiceRecognition() {
    if (isRecording) {
        stopVoiceRecognition();
    } else {
        startVoiceRecognition();
    }
}

function startVoiceRecognition() {
    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'en-US';
    recognition.start();
    isRecording = true;
    document.getElementById('voice-blob').classList.add('recording');
    document.getElementById('live-transcript').textContent = '';

    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        document.getElementById('live-transcript').textContent = transcript;
        document.getElementById('user-input').value = transcript;
    };

    recognition.onspeechend = function() {
        stopVoiceRecognition();
    };

    recognition.onerror = function(event) {
        console.error('Voice recognition error:', event.error);
    };
}

function stopVoiceRecognition() {
    if (recognition) {
        recognition.stop();
        isRecording = false;
        document.getElementById('voice-blob').classList.remove('recording');
        sendMessage();
    }
}

function speakMessage(message) {
    const utterance = new SpeechSynthesisUtterance(message);
    window.speechSynthesis.speak(utterance);
}

async function saveChatHistory(userId) {
    try {
        await setDoc(doc(db, 'chats', userId), { chatHistory });
    } catch (error) {
        console.error('Error saving chat history:', error);
    }
}

async function loadChatHistory(userId) {
    try {
        const docSnap = await getDoc(doc(db, 'chats', userId));
        if (docSnap.exists()) {
            chatHistory = docSnap.data().chatHistory;
            chatHistory.forEach(message => appendMessage(message.role === 'user' ? userName : 'Assistant', message.content, message.role));
            // Scroll to the bottom after loading chat history
            document.getElementById('chat-box').scrollTop = document.getElementById('chat-box').scrollHeight;
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
        if (error.code === 'unavailable') {
            console.log('Firestore is offline. Retrying...');
            setTimeout(() => loadChatHistory(userId), 5000); // Retry after 5 seconds
        }
    }
}

// Attach functions to the window object to make them globally accessible
window.toggleVoiceRecognition = toggleVoiceRecognition;
window.switchToVoiceChat = switchToVoiceChat;
window.switchToTextChat = switchToTextChat;
