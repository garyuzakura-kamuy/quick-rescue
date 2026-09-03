'use client';

import { useState } from 'react';

interface Message {
  role: 'user' | 'model';
  text: string;
}

export default function HealthcareChatApp() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    const userMessage = input.trim();
    if (!userMessage || loading) return;

    const newMessages: Message[] = [...messages, { role: 'user', text: userMessage }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: messages,
          message: userMessage,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessages([...newMessages, { role: 'model', text: data.text }]);
      } else {
        setMessages([
          ...newMessages,
          { role: 'model', text: `エラーが発生しました: ${data.error || '不明なエラー'}` },
        ]);
      }
    } catch (error) {
      console.error('通信エラー:', error);
      setMessages([
        ...newMessages,
        { role: 'model', text: '通信エラーが発生しました。ネットワーク状態を確認してください。' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>ヘルスケアAI相談アシスタント</h1>
      
      <div
        style={{
          border: '1px solid #ccc',
          borderRadius: '8px',
          padding: '16px',
          height: '500px',
          overflowY: 'auto',
          marginBottom: '16px',
          backgroundColor: '#f9f9f9',
        }}
      >
        {messages.length === 0 && (
          <p style={{ color: '#888' }}>
            日常の健康相談、透析や糖尿病ケア、栄養に関する疑問を入力してください。
          </p>
        )}
        {messages.map((msg, index) => (
          <div
            key={index}
            style={{
              marginBottom: '12px',
              textAlign: msg.role === 'user' ? 'right' : 'left',
            }}
          >
            <div
              style={{
                display: 'inline-block',
                padding: '10px 14px',
                borderRadius: '12px',
                backgroundColor: msg.role === 'user' ? '#0070f3' : '#ffffff',
                color: msg.role === 'user' ? '#fff' : '#333',
                border: msg.role === 'model' ? '1px solid #ddd' : 'none',
                maxWidth: '80%',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {loading && <p style={{ color: '#888' }}>AIが回答を作成中...</p>}
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="質問を入力してください..."
          style={{ flex: 1, padding: '12px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          style={{
            padding: '12px 24px',
            borderRadius: '4px',
            border: 'none',
            backgroundColor: '#0070f3',
            color: '#fff',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          送信
        </button>
      </div>

      <footer style={{ marginTop: '20px', fontSize: '0.8rem', color: '#666', textAlign: 'center' }}>
        ※当アプリの提示する情報は一般知識および独自のプレプリント研究等に基づく参考情報であり、確定的な医療診断や治療を代替するものではありません。
      </footer>
    </div>
  );
}
