
"use client";

import { Editor } from '@monaco-editor/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface EditorPanelProps {
  code: string;
  onCodeChange: (newCode: string) => void;
}

export function EditorPanel({ code, onCodeChange }: EditorPanelProps) {
  return (
    <Card className="flex-1 flex flex-col shadow-lg overflow-hidden">
      <CardHeader className="p-3 border-b">
        <CardTitle className="text-lg">Éditeur</CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 relative">
        <Editor
          height="100%"
          language="python"
          theme="vs-dark" 
          value={code}
          onChange={(value) => onCodeChange(value || '')}
          options={{
            automaticLayout: true, 
            wordWrap: 'on',
            selectOnLineNumbers: true,
            minimap: { enabled: false }, 
            fontSize: 14,
            scrollBeyondLastLine: false,
          }}
          loading={<Skeleton className="absolute inset-0" />} 
        />
      </CardContent>
    </Card>
  );
}
