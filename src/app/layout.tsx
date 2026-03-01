import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '企业专属AI助手',
  description: '基于 DeepSeek 的企业专属 AI 智能助手，流式对话，极速响应',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🤖</text></svg>',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="antialiased" style={{ backgroundColor: '#1a1a2e', margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
