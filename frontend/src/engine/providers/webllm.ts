import { ClientAIProvider, DownloadProgress } from './clientInterface';

export class WebLLMProvider implements ClientAIProvider {
  id = 'webllm';
  name = 'WebLLM (WebGPU)';
  private engine: any = null;
  private selectedModel = "Llama-3.2-1B-Instruct-q4f16_1-MLC";

  async isSupported() {
    return !!navigator.gpu;
  }

  async initialize(onProgress?: (progress: DownloadProgress) => void) {
    const { CreateMLCEngine } = await import('@mlc-ai/web-llm');
    
    onProgress?.({ status: 'downloading', progress: 0, message: 'Initializing WebLLM...' });

    this.engine = await CreateMLCEngine(this.selectedModel, {
      initProgressCallback: (report) => {
        onProgress?.({ 
          status: 'downloading', 
          progress: Math.round(report.progress * 100), 
          message: report.text 
        });
      }
    });

    onProgress?.({ status: 'ready', progress: 100, message: 'WebLLM Ready' });
  }

  async generateResponse(input: string, onToken?: (token: string) => void) {
    if (!this.engine) throw new Error("WebLLM not initialized");

    const messages = [{ role: "user", content: input }];
    const chunks = await this.engine.chat.completions.create({
      messages,
      stream: true,
    });

    let fullResponse = "";
    for await (const chunk of chunks) {
      const content = chunk.choices[0]?.delta?.content || "";
      fullResponse += content;
      onToken?.(content);
    }
    return fullResponse;
  }

  async dispose() {
    if (this.engine) {
      await this.engine.unload();
      this.engine = null;
    }
  }
}
