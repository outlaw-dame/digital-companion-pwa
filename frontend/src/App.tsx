import React, { useState, useEffect } from 'react';
import {
  Page,
  Navbar,
  Block,
  BlockTitle,
  Button,
  Messagebar,
  Messages,
  Message,
} from 'konsta/react';

const App: React.FC = () => {
  const [messages, setMessages] = useState<{ text: string; type: 'sent' | 'received'; name: string }[]>([
    { text: 'Hello! I am your Digital Companion. How can I help you today?', type: 'received', name: 'Companion' },
  ]);
  const [inputText, setInputText] = useState('');
  const [platform, setPlatform] = useState('Unknown');

  useEffect(() => {
    const userAgent = navigator.userAgent;
    if (/android/i.test(userAgent)) {
      setPlatform('Android');
    } else if (/iPad|iPhone|iPod/.test(userAgent)) {
      setPlatform('iOS');
    } else {
      setPlatform('Desktop');
    }
  }, []);

  const handleSendMessage = () => {
    if (inputText.trim() === '') return;
    setMessages([...messages, { text: inputText, type: 'sent', name: 'Me' }]);
    setInputText('');
    
    // Simulate companion response
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        text: "I'm processing your request. As your loyal companion, I'm here to support your creative and technical goals.", 
        type: 'received', 
        name: 'Companion' 
      }]);
    }, 1000);
  };

  return (
    <Page>
      <Navbar
        title="Digital Companion"
        subtitle={`Platform: ${platform}`}
        className="top-0 sticky"
      />

      <BlockTitle>Your Digital Partner</BlockTitle>
      <Block strong inset>
        <p>
          This companion evolves based on your habits. It combines the grace of a White Tiger with the architecture of a Small Dragon.
        </p>
      </Block>

      <Messages>
        {messages.map((msg, index) => (
          <Message
            key={index}
            type={msg.type}
            name={msg.name}
            text={msg.text}
          />
        ))}
      </Messages>

      <Messagebar
        placeholder="Message your companion..."
        value={inputText}
        onInput={(e) => setInputText((e.target as HTMLTextAreaElement).value)}
        className="bottom-0 sticky"
      >
        <Button clear onClick={handleSendMessage}>Send</Button>
      </Messagebar>
    </Page>
  );
};

export default App;
