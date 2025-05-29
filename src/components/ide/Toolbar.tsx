
"use client";

import React from 'react';
import { Play, MessageSquareText, Bug, Upload, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CodeMuseLogo } from '@/components/icons';

interface ToolbarProps {
  onRunCode: () => void;
  onExplainCode: () => void;
  onDebugCode: () => void;
  onImportFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onExportFile: () => void;
  fileName: string;
  onFileNameChange: (name: string) => void;
  isProcessing: boolean; // Renamed from isAssistantLoading
}

export function Toolbar({
  onRunCode,
  onExplainCode,
  onDebugCode,
  onImportFile,
  onExportFile,
  fileName,
  onFileNameChange,
  isProcessing, // Renamed
}: ToolbarProps) {
  const importInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  return (
    <div className="flex items-center justify-between p-3 border-b bg-card shadow-sm">
      <CodeMuseLogo />
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onRunCode} disabled={isProcessing} title="Run Code & Tests (Ctrl+Enter)">
          {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
           Run Tests
        </Button>
        <Button variant="ghost" size="sm" onClick={onExplainCode} disabled={isProcessing} title="Explain Code">
          {isProcessing && assistantOutput !== '' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquareText className="mr-2 h-4 w-4" />}
          Explain
        </Button>
        <Button variant="ghost" size="sm" onClick={onDebugCode} disabled={isProcessing} title="Debug Code">
         {isProcessing && assistantOutput !== '' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bug className="mr-2 h-4 w-4" />}
          Debug
        </Button>
        
        <div className="flex items-center gap-2 ml-4">
          <Button variant="outline" size="sm" onClick={handleImportClick} title="Import Python File" disabled={isProcessing}>
            <Upload className="mr-2 h-4 w-4" /> Import
          </Button>
          <input
            type="file"
            accept=".py"
            ref={importInputRef}
            onChange={onImportFile}
            className="hidden"
          />
          <Input
            type="text"
            placeholder="filename.py"
            value={fileName}
            onChange={(e) => onFileNameChange(e.target.value)}
            className="w-36 h-9 text-sm"
            disabled={isProcessing}
          />
          <Button variant="outline" size="sm" onClick={onExportFile} title="Export Python File" disabled={isProcessing}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        </div>
      </div>
    </div>
  );
}

// Minimal state for assistantOutput to satisfy Toolbar's conditional loading icon for explain/debug
// This is a bit of a workaround. Ideally, the Toolbar wouldn't need to know about assistantOutput.
// A more robust solution might involve separate loading states per button if granular control is needed.
let assistantOutput = ''; 
