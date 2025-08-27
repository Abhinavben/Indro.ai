/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const userInput = document.getElementById('userInput') as HTMLInputElement;
const sendButton = document.getElementById('sendButton') as HTMLButtonElement;
const micButton = document.getElementById('micButton') as HTMLButtonElement;
const responseBox = document.getElementById('responseBox');

const scrollToBottom = () => {
  if (responseBox) {
    responseBox.scrollTop = responseBox.scrollHeight;
  }
};

const createMessageElement = (type: 'ai' | 'user' | 'error', content: string | HTMLElement) => {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    
    const iconDiv = document.createElement('div');
    iconDiv.className = 'message-icon';
    const iconId = type === 'ai' ? 'icon-ai' : type === 'user' ? 'icon-user' : 'icon-error';
    iconDiv.innerHTML = `<svg><use xlink:href="#${iconId}" /></svg>`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    if (typeof content === 'string') {
        const p = document.createElement('p');
        p.textContent = content;
        contentDiv.appendChild(p);
    } else {
        contentDiv.appendChild(content);
    }
    
    messageDiv.appendChild(iconDiv);
    messageDiv.appendChild(contentDiv);
    
    return messageDiv;
};


const showWelcomeMessage = () => {
    if (responseBox) {
        const welcomeText = "Welcome! I'm Indro.ai. How can I help you learn more about Indro today?";
        const welcomeMessage = createMessageElement('ai', welcomeText);
        responseBox.appendChild(welcomeMessage);
        scrollToBottom();
    }
};

if (sendButton && userInput && responseBox && micButton) {
  // Show welcome message on page load
  window.addEventListener('load', showWelcomeMessage);
    
  const getResponse = async () => {
    const prompt = userInput.value.trim();
    if (!prompt) {
      return;
    }

    sendButton.disabled = true;
    micButton.disabled = true;
    userInput.disabled = true;
    userInput.value = '';

    // Create and append user message bubble
    const userMessage = createMessageElement('user', prompt);
    responseBox.appendChild(userMessage);
    scrollToBottom();

    // Create and append AI message bubble with thinking indicator
    const thinkingIndicator = document.createElement('div');
    thinkingIndicator.className = 'thinking-indicator';
    thinkingIndicator.innerHTML = '<div></div><div></div><div></div>';
    
    const aiMessage = createMessageElement('ai', thinkingIndicator);
    aiMessage.classList.add('loading');
    responseBox.appendChild(aiMessage);
    scrollToBottom();

    try {
      const systemInstruction = `You are Indro.ai, a helpful and friendly customer service assistant for Indro. Use the following information about Indro to answer user questions. Be conversational and professional.

About Indro:

Indro is a leading developer company based in India, known for creating exciting games and innovative apps. Their focus is on delivering great digital experiences for users like you, making entertainment and everyday tasks easier and more fun.

Indro brings together talented developers who build and share their apps through a smart platform, allowing users to discover new games and useful applications all in one place. Whether you want to play the latest game or find handy tools, Indro’s creations are designed to keep you engaged and satisfied.

With Indro, expect high-quality, user-friendly apps that are constantly updated and improved, keeping your digital life fresh and enjoyable.`;
        
      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          systemInstruction: systemInstruction
        }
      });
      
      const aiMessageContentDiv = aiMessage.querySelector('.message-content');
      if (aiMessageContentDiv) {
        aiMessageContentDiv.innerHTML = ''; // Clear thinking indicator
        aiMessage.classList.remove('loading');

        const aiMessageP = document.createElement('p');
        const blinkingCursor = document.createElement('span');
        blinkingCursor.className = 'blinking-cursor';
        aiMessageContentDiv.appendChild(aiMessageP);
        aiMessageContentDiv.appendChild(blinkingCursor);

        let accumulatedText = '';
        for await (const chunk of responseStream) {
          accumulatedText += chunk.text;
          aiMessageP.textContent = accumulatedText;
          scrollToBottom();
        }
        blinkingCursor.remove(); // Remove cursor when streaming is complete
      }

    } catch (error) {
      console.error(error);
      const errorContent = document.createElement('div');
      errorContent.innerHTML = `
        <strong>Error: Could not get a response.</strong>
        <p>Please check the browser console (F12) for more details.</p>
      `;
      const errorMessage = createMessageElement('error', errorContent);
      responseBox.removeChild(aiMessage); // Remove the thinking message
      responseBox.appendChild(errorMessage);
      scrollToBottom();
    } finally {
      sendButton.disabled = false;
      micButton.disabled = false;
      userInput.disabled = false;
      userInput.focus();
    }
  };

  sendButton.addEventListener('click', getResponse);

  userInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      getResponse();
    }
  });

  // Voice to Text with Web Speech API
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    let isListening = false;

    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    
    micButton.addEventListener('click', () => {
      if (isListening) {
        recognition.stop();
        return;
      }
      try {
        recognition.start();
      } catch (error) {
        console.error("Could not start recognition:", error)
      }
    });

    recognition.onstart = () => {
      isListening = true;
      micButton.classList.add('listening');
      micButton.setAttribute('aria-label', 'Stop listening');
      userInput.placeholder = 'Listening...';
      sendButton.disabled = true;
    };
  
    recognition.onend = () => {
      isListening = false;
      micButton.classList.remove('listening');
      micButton.setAttribute('aria-label', 'Use Microphone');
      userInput.placeholder = 'Ask Indro.ai anything...';
      sendButton.disabled = false;
      userInput.focus();
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      userInput.value = finalTranscript + interimTranscript;
    };

  } else {
    console.warn('Speech Recognition not supported in this browser.');
    micButton.style.display = 'none';
  }
}