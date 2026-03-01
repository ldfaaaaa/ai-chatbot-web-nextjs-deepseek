'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '@/types';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
}

export default function MessageBubble({ message, isStreaming = false }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    // 用户消息：右侧蓝色气泡
    return (
      <div className="flex justify-end mb-4 px-2">
        <div className="max-w-[75%] flex flex-col items-end gap-1">
          <div
            className="px-4 py-3 rounded-2xl rounded-tr-sm bg-blue-600 text-white text-sm leading-relaxed shadow-md"
            style={{ wordBreak: 'break-word' }}
          >
            {message.content}
          </div>
          <span className="text-xs text-gray-500 pr-1">
            {formatTime(message.createdAt)}
          </span>
        </div>
      </div>
    );
  }

  // AI 消息：左侧深灰气泡
  return (
    <div className="flex justify-start mb-4 px-2 gap-2">
      {/* AI 头像图标 */}
      <div className="flex-shrink-0 mt-1">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-base shadow-md"
          style={{ backgroundColor: '#1e3a5f', border: '1px solid #2d5a8e' }}
        >
          🤖
        </div>
      </div>

      <div className="max-w-[75%] flex flex-col items-start gap-1">
        <div
          className="px-4 py-3 rounded-2xl rounded-tl-sm text-gray-100 text-sm shadow-md"
          style={{
            backgroundColor: '#1f2937',
            border: '1px solid #374151',
            wordBreak: 'break-word',
          }}
        >
          {isStreaming && message.content === '' ? (
            // 三点闪烁加载动画
            <div className="dot-flashing flex gap-1 items-center py-1">
              <span></span>
              <span></span>
              <span></span>
            </div>
          ) : (
            <div className="markdown-body">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
              {/* 流式输出时显示光标闪烁 */}
              {isStreaming && (
                <span
                  className="inline-block w-0.5 h-4 bg-blue-400 ml-0.5 align-middle"
                  style={{ animation: 'blink 1s step-end infinite' }}
                />
              )}
            </div>
          )}
        </div>
        <span className="text-xs text-gray-500 pl-1">
          {formatTime(message.createdAt)}
        </span>
      </div>
    </div>
  );
}

// 格式化时间
function formatTime(date: Date): string {
  const d = date instanceof Date ? date : new Date(date);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}
