
"use client";

import { Editor } from '@monaco-editor/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface EditorPanelProps {
  code: string;
  onCodeChange: (newCode: string | undefined) => void;
}

export function EditorPanel({ code, onCodeChange }: EditorPanelProps) {
  return (
    <Card className="flex-1 flex flex-col shadow-lg overflow-hidden"> {/* Added overflow-hidden */}
      <CardHeader className="p-3 border-b">
        <CardTitle className="text-lg">Editor</CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 relative"> {/* Added relative for Monaco's absolute positioning */}
        <Editor
          height="100%" // Ensure editor takes full height of its container
          language="python"
          theme="vs-dark" // You can choose other themes like "light" or custom ones
          value={code}
          onChange={onCodeChange}
          options={{
            automaticLayout: true, // crucial for resizable panels
            wordWrap: 'on',
            selectOnLineNumbers: true,
            minimap: { enabled: false }, // Can be true if you prefer
            fontSize: 14,
            scrollBeyondLastLine: false,
          }}
          loading={<Skeleton className="absolute inset-0" />} // Show skeleton while loading
        />
      </CardContent>
    </Card>
  );
}
