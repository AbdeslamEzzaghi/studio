"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

interface OutputPanelProps {
  output: string;
}

export function OutputPanel({ output }: OutputPanelProps) {
  return (
    <Card className="flex-1 flex flex-col shadow-lg">
      <CardHeader className="p-3 border-b">
        <CardTitle className="text-lg">Output</CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1">
        <ScrollArea className="h-full w-full">
          <pre className="p-4 font-mono text-sm whitespace-pre-wrap break-all">
            {output || "Code output will appear here..."}
          </pre>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
