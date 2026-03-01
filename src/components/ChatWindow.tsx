'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Message } from '@/types';
import MessageBubble from './MessageBubble';

// localStorage Key
const STORAGE_KEY = 'enterprise-ai-chat-history';

// 生成唯一 ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ── 从 localStorage 恢复历史记录 ──────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: Message[] = JSON.parse(saved);
        // 将 createdAt 字符串重新转为 Date 对象
        const restored = parsed.map((msg) => ({
          ...msg,
          createdAt: new Date(msg.createdAt),
        }));
        setMessages(restored);
      }
    } catch {
      // 如果解析失败，忽略历史记录
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // ── 保存历史记录到 localStorage ──────────────────────────────
  useEffect(() => {
    if (messages.length === 0) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // 忽略存储错误（如隐私模式）
    }
  }, [messages]);

  // ── 自动滚动到底部 ───────────────────────────────────────────
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // ── 自动调整 textarea 高度 ───────────────────────────────────
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const maxHeight = 160;
    textarea.style.height = Math.min(textarea.scrollHeight, maxHeight) + 'px';
  }, [inputValue]);

  // ── 清空历史记录 ─────────────────────────────────────────────
  const handleClearHistory = useCallback(() => {
    // 如果正在流式输出，先终止
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setMessages([]);
    setIsLoading(false);
    setStreamingMessageId(null);
    localStorage.removeItem(STORAGE_KEY);
    textareaRef.current?.focus();
  }, []);

  // ── 发送消息 ─────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isLoading) return;

    // 1. 创建用户消息
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: trimmed,
      createdAt: new Date(),
    };

    // 2. 创建 AI 消息占位符（流式填充内容）
    const assistantMessageId = generateId();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      createdAt: new Date(),
    };

    // 3. 更新状态
    const newMessages = [...messages, userMessage];
    setMessages([...newMessages, assistantMessage]);
    setInputValue('');
    setIsLoading(true);
    setStreamingMessageId(assistantMessageId);

    // 4. 创建 AbortController（支持中断）
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP 错误 ${response.status}`);
      }

      if (!response.body) {
        throw new Error('服务器未返回响应流');
      }

      // 5. 读取 SSE 流
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith('data:')) continue;

          const data = trimmedLine.slice(5).trim();
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);

            // 处理错误
            if (parsed.error) {
              throw new Error(parsed.error);
            }

            // 追加内容片段
            if (parsed.content !== undefined) {
              accumulatedContent += parsed.content;
              // 实时更新 AI 消息内容
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: accumulatedContent }
                    : msg
                )
              );
            }
          } catch (parseError) {
            if (parseError instanceof Error && parseError.message !== '{}') {
              console.warn('[ChatWindow] SSE 数据解析错误:', parseError.message);
            }
          }
        }
      }

      // 6. 如果 AI 没有返回任何内容
      if (!accumulatedContent) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? { ...msg, content: '（AI 未返回内容，请重试）' }
              : msg
          )
        );
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // 用户主动中断，不显示错误
        return;
      }

      const errorMsg =
        error instanceof Error ? error.message : '发生未知错误，请重试';

      // 将错误信息显示在 AI 消息气泡中
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: `❌ 请求失败：${errorMsg}\n\n请检查：\n1. DEEPSEEK_API_KEY 是否已在 .env.local 中正确配置\n2. 网络连接是否正常\n3. API 余额是否充足`,
              }
            : msg
        )
      );
    } finally {
      setIsLoading(false);
      setStreamingMessageId(null);
      abortControllerRef.current = null;
    }
  }, [inputValue, isLoading, messages]);

  // ── 键盘事件：Enter 发送，Shift+Enter 换行 ──────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // ── 是否有内容（用于控制按钮状态）──────────────────────────
  const canSend = inputValue.trim().length > 0 && !isLoading;

  return (
    <div
      className="flex flex-col h-screen"
      style={{ backgroundColor: '#1a1a2e' }}
    >
      {/* ── 顶部 Header ─────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-4 py-3 flex-shrink-0 shadow-lg"
        style={{
          backgroundColor: '#0f172a',
          borderBottom: '1px solid #1e293b',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-2xl">🤖</span>
          <div>
            <h1 className="text-white font-bold text-base leading-tight">
              企业专属AI助手
            </h1>
            <p className="text-xs text-gray-400 leading-tight">
              由 DeepSeek 提供支持 · 流式对话
            </p>
          </div>
        </div>

        <button
          onClick={handleClearHistory}
          disabled={messages.length === 0}
          className="text-sm px-3 py-1.5 rounded-lg transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            color: '#f87171',
            border: '1px solid #7f1d1d',
            backgroundColor: 'transparent',
          }}
          onMouseEnter={(e) => {
            if (messages.length > 0) {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                '#7f1d1d';
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor =
              'transparent';
          }}
          title="清空所有对话记录"
        >
          🗑 清空历史
        </button>
      </header>

      {/* ── 消息列表区域 ─────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto py-4 messages-container"
        style={{ backgroundColor: '#1a1a2e' }}
      >
        {messages.length === 0 ? (
          // 空状态提示
          <div className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center">
            <div className="text-6xl">🤖</div>
            <h2 className="text-white text-xl font-semibold">
              您好！我是企业专属AI助手
            </h2>
            <p className="text-gray-400 text-sm max-w-md leading-relaxed">
              我可以帮您解答问题、分析数据、撰写文档、编写代码等。
              <br />
              请在下方输入您的问题，按 Enter 发送。
            </p>
            <div className="grid grid-cols-2 gap-2 mt-2 max-w-sm w-full">
              {[
                '📊 帮我分析Q4销售数据趋势',
                '📝 起草一份项目评审报告',
                '💻 用Python写一个数据清洗脚本',
                '🔍 解释什么是RAG技术',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInputValue(suggestion.slice(2))}
                  className="text-xs text-left px-3 py-2 rounded-lg transition-colors duration-150"
                  style={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    color: '#94a3b8',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                      '#334155';
                    (e.currentTarget as HTMLButtonElement).style.color = '#e2e8f0';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                      '#1e293b';
                    (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8';
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          // 消息列表
          <div className="max-w-3xl mx-auto w-full">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isStreaming={msg.id === streamingMessageId}
              />
            ))}

            {/* 加载状态（等待 API 响应时）*/}
            {isLoading && streamingMessageId === null && (
              <div className="flex justify-start mb-4 px-2 gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0 mt-1"
                  style={{ backgroundColor: '#1e3a5f', border: '1px solid #2d5a8e' }}
                >
                  🤖
                </div>
                <div
                  className="px-4 py-3 rounded-2xl rounded-tl-sm"
                  style={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                >
                  <div className="dot-flashing flex gap-1 items-center">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}

            {/* 滚动锚点 */}
            <div ref={messagesEndRef} className="h-2" />
          </div>
        )}
      </div>

      {/* ── 底部输入区 ───────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 px-4 py-3"
        style={{
          backgroundColor: '#0f172a',
          borderTop: '1px solid #1e293b',
        }}
      >
        <div className="max-w-3xl mx-auto">
          <div
            className="flex items-end gap-2 rounded-xl px-3 py-2"
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              transition: 'border-color 0.2s',
            }}
            onFocusCapture={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = '#3b82f6';
            }}
            onBlurCapture={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = '#334155';
            }}
          >
            <textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
              placeholder="输入您的问题... (Enter 发送 / Shift+Enter 换行)"
              rows={1}
              className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm resize-none outline-none leading-relaxed py-1 disabled:opacity-50"
              style={{
                maxHeight: '160px',
                minHeight: '24px',
                overflowY: 'auto',
              }}
            />

            {/* 发送按钮 */}
            <button
              onClick={handleSend}
              disabled={!canSend}
              className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 disabled:cursor-not-allowed mb-0.5"
              style={{
                backgroundColor: canSend ? '#3b82f6' : '#1f2937',
                color: canSend ? '#ffffff' : '#4b5563',
              }}
              onMouseEnter={(e) => {
                if (canSend) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                    '#2563eb';
                }
              }}
              onMouseLeave={(e) => {
                if (canSend) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                    '#3b82f6';
                }
              }}
              title="发送消息 (Enter)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-4 h-4"
                style={{ transform: 'rotate(90deg)' }}
              >
                <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
              </svg>
            </button>
          </div>

          {/* 提示文字 */}
          <p className="text-xs text-gray-600 text-center mt-1.5">
            AI 可能会出错，重要信息请自行核实 · 对话记录已自动保存到本地
          </p>
        </div>
      </div>

      {/* 光标闪烁 keyframe（内联样式注入） */}
      <style jsx global>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
