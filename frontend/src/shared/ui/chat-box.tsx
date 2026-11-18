import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { ChatMessage } from '@/shared/models/realtime';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';

interface ChatBoxProps {
  title: string;
  messages: ChatMessage[];
  meId: string;
  onSend: (text: string) => void;
}

export function ChatBox({ title, messages, meId, onSend }: ChatBoxProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [messages.length]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText('');
  };

  return (
    <Card className="sticky top-4 flex h-[460px] flex-col">
      <h3 className="mb-2 text-base font-semibold">{title}</h3>
      <div ref={box} className="mb-2.5 flex flex-1 flex-col gap-1.5 overflow-y-auto">
        {messages.length === 0 && <p className="text-sm text-muted">{t('chat.empty')}</p>}
        {messages.map((m) => (
          <div key={m.id} className="text-sm break-words">
            <b className={m.userId === meId ? 'text-good' : 'text-primary'}>{m.username}</b> {m.text}
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="flex items-center gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={t('chat.placeholder')} maxLength={300} />
        <Button type="submit" variant="primary">
          {t('common.send')}
        </Button>
      </form>
    </Card>
  );
}
