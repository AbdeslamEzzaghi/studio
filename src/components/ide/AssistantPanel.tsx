
"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Bot, Loader2 } from 'lucide-react'; // Added Loader2

interface AssistantPanelProps {
  assistantOutput: string;
  isLoading: boolean;
}

export function AssistantPanel({ assistantOutput, isLoading }: AssistantPanelProps) {
  return (
    <Card className="flex-1 flex flex-col shadow-lg">
      <CardHeader className="p-3 border-b flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          Code Assistant
        </CardTitle>
        {isLoading && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
      </CardHeader>
      <CardContent className="p-0 flex-1">
        <ScrollArea className="h-full w-full">
          {isLoading && !assistantOutput ? ( // Show skeletons only if loading AND no previous output
            <div className="p-4 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          ) : (
            <pre className="p-4 font-mono text-sm whitespace-pre-wrap break-all">
              {assistantOutput || "AI assistance will appear here. Try 'Explain Code' or 'Debug Code'."}
            </pre>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
