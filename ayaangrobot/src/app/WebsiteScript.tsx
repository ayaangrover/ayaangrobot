import { useEffect } from "react";

export default function WebsiteScript() {
  useEffect(() => {
    function switchToVoiceChat() {
      const chatContainer = document.getElementById('chat-container');
      const voiceContainer = document.getElementById('voice-container');
      const switchToVoiceButton = document.getElementById('switch-to-voice');
      const switchToTextButton = document.getElementById('switch-to-text');

      if (chatContainer && voiceContainer && switchToVoiceButton && switchToTextButton) {
        chatContainer.style.display = 'none';
        voiceContainer.style.display = 'block';
        switchToVoiceButton.style.display = 'none';
        switchToTextButton.style.display = 'block';
      }
    }

    const switchToVoiceButton = document.getElementById('switch-to-voice');
    if (switchToVoiceButton) {
      switchToVoiceButton.addEventListener('click', switchToVoiceChat);
    }

    return () => {
      if (switchToVoiceButton) {
        switchToVoiceButton.removeEventListener('click', switchToVoiceChat);
      }
    };
  }, []);

  return null;
}