To set up WhatsApp on your iPhone to chat with NanoClaw, follow these steps:

📱 iPhone WhatsApp Setup for NanoClaw
Step 1: Start NanoClaw Services

cd ~/nanoclaw# Start NanoClaw with Ollamadocker-compose -f docker-compose.ollama.yml up -d
Step 2: Authenticate WhatsApp

# Run the authentication commanddocker-compose -f docker-compose.ollama.yml run --rm nanoclaw-ollama npm run auth
This will display a QR code in your terminal.

Step 3: Link Your iPhone WhatsApp
Open WhatsApp on your iPhone
Tap Settings (bottom right corner)
Tap "Linked Devices"
Tap "Link a Device"
Point your iPhone camera at the QR code in your terminal
Wait for it to connect (takes a few seconds)
✅ You should see "Successfully connected!" in the terminal.

Step 4: Find Your Chat Interface
NanoClaw uses your WhatsApp self-chat as the main control channel:

Open WhatsApp on your iPhone
Tap the compose button (top right)
Type your own phone number or name
Select yourself from the list
This opens your self-chat (notes to yourself).

Step 5: Send Your First Message
In your self-chat, type:


@Andy hello
Wait a few seconds. NanoClaw should respond! 🎉

💬 How to Use NanoClaw
Basic Commands

@Andy what's the weather?@Andy list files in my project@Andy create a Python script for fibonacci numbers@Andy help me with this code: [paste code]
Advanced Features

@Andy schedule a daily 9am reminder to review tasks@Andy search the web for latest AI news@Andy remember that I prefer Python for scripting
Your Self-Chat is Special
Your self-chat (messaging yourself) is the main channel where you:

✅ Have full admin control
✅ Can manage all groups
✅ Can create scheduled tasks
✅ Get highest permissions
Adding NanoClaw to Group Chats
You can also add NanoClaw to WhatsApp group chats:

Create or open a WhatsApp group
Add your linked device number to the group
Send messages mentioning @Andy in the group
NanoClaw will respond when mentioned
🔧 Troubleshooting
Can't Scan QR Code?
If the QR code doesn't appear or times out:


# Stop servicesdocker-compose -f docker-compose.ollama.yml down# Clear auth datarm -rf auth-store/*# Try againdocker-compose -f docker-compose.ollama.yml run --rm nanoclaw-ollama npm run auth
No Response from NanoClaw?
Check the logs:


docker-compose -f docker-compose.ollama.yml logs -f nanoclaw-ollama
Make sure:

✅ Ollama is running: curl http://localhost:11434/api/tags
✅ Containers are running: docker ps | grep nanoclaw
✅ You used @Andy prefix in your message
QR Code Too Small?
Make your terminal larger or use:


# On Mac, you can zoom terminalCmd + "+" to increase font size
Authentication Expires?
WhatsApp linked devices can disconnect. To re-link:


docker-compose -f docker-compose.ollama.yml run --rm nanoclaw-ollama npm run auth
Then scan the QR code again from your iPhone.

📱 iPhone-Specific Tips
Notifications
WhatsApp will notify you of NanoClaw responses
You can customize notification sounds in WhatsApp settings
Mute the self-chat if you don't want constant notifications
Voice Messages
NanoClaw currently only works with text messages, not:

❌ Voice messages
❌ Images (unless you describe them)
❌ Videos
Using Siri Shortcuts (Advanced)
You can create a Siri Shortcut to quickly message NanoClaw:

Open Shortcuts app
Create new shortcut
Add "Send Message" action
Select your self-chat
Add text: @Andy [ask Siri for input]
Save as "Ask Andy"
Now you can say: "Hey Siri, Ask Andy" and speak your question!

✅ Complete Setup Checklist
 Docker services running
 WhatsApp authenticated (QR code scanned)
 Self-chat opened on iPhone
 Test message sent (@Andy hello)
 Received first response
 Ollama model responding (check logs if slow)
🎉 You're All Set!
Now you can chat with your local AI assistant from your iPhone anywhere you have your phone! The agent runs on your Mac, but you control it from your iPhone via WhatsApp.

Remember: Always start messages with @Andy to trigger the agent! 📱✨

C