import { useState, type FormEvent } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';

interface AnswerFormProps {
  placeholder: string;
  submitLabel: string;
  maxLength: number;
  onSubmit: (text: string) => void;
}

/** Campo de texto + botón: sirve para dar una pista y para adivinar la palabra. */
export function AnswerForm({ placeholder, submitLabel, maxLength, onSubmit }: AnswerFormProps) {
  const [text, setText] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSubmit(text);
    setText('');
  };
  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <Input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} maxLength={maxLength} />
      <Button type="submit" variant="primary">
        {submitLabel}
      </Button>
    </form>
  );
}
