export type JarvisAIModel = "mistral" | "gemini";

export interface JarvisModelInfo {
  id: JarvisAIModel;
  name: string;
  description: string;
}

export const JARVIS_MODELS: JarvisModelInfo[] = [
  { id: "mistral", name: "Mistral", description: "Fast, multilingual" },
  { id: "gemini", name: "Gemini", description: "Multimodal, advanced" },
];

export interface JarvisMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
  imageBase64?: string;
  imageMimeType?: string;
  /** Runtime blob URL for hydrated attachments — never persisted as base64 in IDB. */
  imageUrl?: string;
}

export interface JarvisChatSession {
  id: string;
  title: string;
  messages: JarvisMessage[];
  model: JarvisAIModel;
  createdAt: Date;
  updatedAt: Date;
}
