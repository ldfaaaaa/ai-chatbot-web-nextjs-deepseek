import { NextRequest, NextResponse } from 'next/server';
import { Message } from '@/types';

// 使用 Node.js Runtime（流式响应更稳定）
export const runtime = 'nodejs';

// DeepSeek API 地址
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

export async function POST(request: NextRequest) {
  try {
    // 1. 验证 API Key 配置
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey || apiKey === 'your_deepseek_api_key_here') {
      return NextResponse.json(
        { error: '未配置 DEEPSEEK_API_KEY，请在 .env.local 中设置您的 DeepSeek API Key' },
        { status: 500 }
      );
    }

    // 2. 解析请求体
    const body = await request.json();
    const { messages }: { messages: Message[] } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: '请求体格式错误：messages 字段不能为空' },
        { status: 400 }
      );
    }

    // 3. 构造发送给 DeepSeek 的消息列表（过滤掉 id / createdAt 字段）
    const formattedMessages = [
      {
        role: 'system',
        content:
          '你是一个专业的企业AI助手，用中文回答用户问题，回答清晰有条理。当涉及代码时，请使用代码块格式输出，并标注编程语言。',
      },
      ...messages
        .filter((msg) => msg.role !== 'system')
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
    ];

    // 4. 调用 DeepSeek API（开启流式）
    const deepseekResponse = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: formattedMessages,
        stream: true,
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    // 5. 检查 DeepSeek 返回状态
    if (!deepseekResponse.ok) {
      const errorText = await deepseekResponse.text();
      let errorMessage = `DeepSeek API 错误 (${deepseekResponse.status})`;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.error?.message || errorMessage;
      } catch {
        // 忽略 JSON 解析错误
      }
      return NextResponse.json({ error: errorMessage }, { status: deepseekResponse.status });
    }

    if (!deepseekResponse.body) {
      return NextResponse.json({ error: 'DeepSeek API 返回空响应流' }, { status: 500 });
    }

    // 6. 将 DeepSeek 的 SSE 流直接转发给客户端
    const stream = new ReadableStream({
      async start(controller) {
        const reader = deepseekResponse.body!.getReader();
        const decoder = new TextDecoder('utf-8');

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
              break;
            }

            // 解码二进制数据块
            const chunk = decoder.decode(value, { stream: true });
            // 按行分割 SSE 数据
            const lines = chunk.split('\n');

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith('data:')) continue;

              const data = trimmed.slice(5).trim(); // 移除 "data:" 前缀
              if (data === '[DONE]') {
                // 流结束标记
                controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
                continue;
              }

              try {
                // 解析 JSON 获取 delta content
                const parsed = JSON.parse(data);
                const deltaContent = parsed.choices?.[0]?.delta?.content;
                if (deltaContent !== undefined && deltaContent !== null) {
                  // 将内容片段以 SSE 格式发送给客户端
                  const sseData = `data: ${JSON.stringify({ content: deltaContent })}\n\n`;
                  controller.enqueue(new TextEncoder().encode(sseData));
                }
              } catch {
                // 忽略单行 JSON 解析错误，继续处理下一行
              }
            }
          }
        } catch (error) {
          // 读取流时发生错误
          const errMsg = error instanceof Error ? error.message : '流读取错误';
          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify({ error: errMsg })}\n\n`)
          );
          controller.close();
        } finally {
          reader.releaseLock();
        }
      },
    });

    // 7. 返回流式响应
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('[API /chat] 错误:', error);
    const message = error instanceof Error ? error.message : '服务器内部错误';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
