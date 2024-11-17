export default function WebsiteScript() {
    function switchToVoiceChat() {
        document.getElementById('chat-container').style.display = 'none';
        document.getElementById('voice-container').style.display = 'block';
        document.getElementById('switch-to-voice').style.display = 'none';
        document.getElementById('switch-to-text').style.display = 'block';
    }

    document.getElementById('switch-to-voice').addEventListener('click', switchToVoiceChat);
}