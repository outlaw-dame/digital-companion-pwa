import React from 'react';
import { Block, BlockTitle, List, ListItem, Button, Progressbar, Badge } from 'konsta/react';
import { useClientProvider } from '../hooks/useClientProvider';

export const ClientProviderPanel: React.FC = () => {
  const { provider, status, capabilities, selectProvider, initialize } = useClientProvider();

  return (
    <Block strong inset className="space-y-4">
      <BlockTitle>Client-Side AI (Local Inference)</BlockTitle>
      
      <div className="flex gap-2 mb-4">
        <Badge colors={{ bg: capabilities.webGPU ? 'bg-green-500' : 'bg-red-500' }}>
          WebGPU: {capabilities.webGPU ? 'Supported' : 'Not Supported'}
        </Badge>
        <Badge colors={{ bg: capabilities.wasm ? 'bg-green-500' : 'bg-red-500' }}>
          WASM: Supported
        </Badge>
      </div>

      <List strong inset>
        <ListItem
          label
          title="WebLLM (Llama 3.2)"
          after={
            <input
              type="radio"
              name="provider"
              checked={provider?.id === 'webllm'}
              onChange={() => selectProvider('webllm')}
            />
          }
        />
        <ListItem
          label
          title="LiteRT (Gemma 2B)"
          after={
            <input
              type="radio"
              name="provider"
              checked={provider?.id === 'litert'}
              onChange={() => selectProvider('litert')}
            />
          }
        />
      </List>

      {provider && (
        <div className="mt-4">
          <Button 
            onClick={initialize} 
            disabled={status.status === 'downloading' || status.status === 'ready'}
          >
            {status.status === 'ready' ? 'Model Ready' : 'Download & Initialize Model'}
          </Button>
          
          {status.status === 'downloading' && (
            <div className="mt-2">
              <div className="text-xs mb-1">{status.message}</div>
              <Progressbar progress={status.progress / 100} />
            </div>
          )}
        </div>
      )}
    </Block>
  );
};
