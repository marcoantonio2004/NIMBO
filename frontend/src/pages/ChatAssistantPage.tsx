import React from 'react';
import { ChatDrawer } from '../components/ChatDrawer';

export const ChatAssistantPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <ChatDrawer />
    </div>
  );
};
