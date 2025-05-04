import React from 'react';
import { MessageSquare, Send } from 'lucide-react';
import Button from './ui/Button';

interface Communication {
  id: string;
  type: 'sms' | 'email' | 'snapchat';
  content: string;
  timestamp: string;
  sender: 'customer' | 'team';
}

interface CustomerCommunicationProps {
  communications: Communication[];
}

const CustomerCommunication: React.FC<CustomerCommunicationProps> = ({ communications }) => {
  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Get icon for communication type
  const getCommunicationIcon = (type: string) => {
    switch (type) {
      case 'sms':
        return <MessageSquare className="h-3.5 w-3.5 text-green-400" />;
      case 'email':
        return <MessageSquare className="h-3.5 w-3.5 text-blue-400" />;
      case 'snapchat':
        return <MessageSquare className="h-3.5 w-3.5 text-yellow-400" />;
      default:
        return <MessageSquare className="h-3.5 w-3.5 text-text-secondary" />;
    }
  };

  return (
    <div className="bg-background rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <MessageSquare className="h-5 w-5 mr-2 text-accent" />
        Communication
      </h3>

      {communications.length === 0 ? (
        <div className="text-center py-8 text-text-secondary">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No communication history found</p>
          <Button className="mt-4" variant="outline" size="sm">
            <Send className="h-4 w-4 mr-2" />
            Send Message
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2 mb-4">
            {communications.map((comm) => (
              <div
                key={comm.id}
                className={`p-3 rounded-lg flex flex-col ${
                  comm.sender === 'team'
                    ? 'bg-accent/10 ml-8'
                    : 'bg-background-light mr-8'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center">
                    {getCommunicationIcon(comm.type)}
                    <span className="text-xs font-medium ml-1">
                      {comm.sender === 'team' ? 'You' : 'Customer'}
                    </span>
                  </div>
                  <span className="text-xs text-text-secondary">
                    {formatTime(comm.timestamp)}
                  </span>
                </div>
                <p className="text-sm">{comm.content}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              className="w-full bg-background-light border-2 border-background-light rounded-md p-2 text-text-primary resize-none focus:outline-none focus:border-accent"
              placeholder="Type a message..."
            />
            <Button className="self-end">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default CustomerCommunication;