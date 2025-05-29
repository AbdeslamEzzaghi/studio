"use client";

import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface EditorPanelProps {
  code: string;
  onCodeChange: (newCode: string) => void;
}

export function EditorPanel({ code, onCodeChange }: EditorPanelProps) {
  return (
    <Card className="flex-1 flex flex-col shadow-lg">
      <CardHeader className="p-3 border-b">
        <CardTitle className="text-lg">Editor</CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1">
        <Textarea
          value={code}
          onChange={(e) => onCodeChange(e.target.value)}
          placeholder="Write your Python code here..."
          className="w-full h-full p-4 font-mono text-sm border-0 rounded-none resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
          spellCheck="false"
        />
      </CardContent>
    </Card>
  );
}
