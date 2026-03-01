// 消息角色类型
export type MessageRole = 'user' | 'assistant' | 'system';

// 消息接口
export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: Date;
}

// 聊天请求体
export interface ChatRequest {
  messages: Message[];
}

// DeepSeek API 响应中的 delta 内容
export interface ChatDelta {
  role?: MessageRole;
  content?: string;
}

// DeepSeek API 流式响应选项
export interface ChatChoice {
  index: number;
  delta: ChatDelta;
  finish_reason: string | null;
}

// DeepSeek API 流式响应片段
export interface ChatChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChatChoice[];
}
