"use client";

import React from 'react';
import { Play, MessageSquareText, Bug, Upload, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// Label was imported but not used, so I'll remove it to keep things clean.
// import { Label } from '@/components/ui/label'; 
import { CodeMuseLogo } from '@/components/icons';

interface ToolbarProps {
  onRunCode: () => void;
  onExplainCode: () => void;
  onDebugCode: () => void;
  onImportFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onExportFile: () => void;
  fileName: string;
  onFileNameChange: (name: string) => void;
  isAssistantLoading: boolean;
}

export function Toolbar({
  onRunCode,
  onExplainCode,
  onDebugCode,
  onImportFile,
  onExportFile,
  fileName,
  onFileNameChange,
  isAssistantLoading,
}: ToolbarProps) {
  const importInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  return (
    <div className="flex items-center justify-between p-3 border-b bg-card shadow-sm">
      <CodeMuseLogo />
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onRunCode} title="Run Code (Ctrl+Enter)">
          <Play className="mr-2 h-4 w-4" /> Run
        </Button>
        <Button variant="ghost" size="sm" onClick={onExplainCode} disabled={isAssistantLoading} title="Explain Code">
          <MessageSquareText className="mr-2 h-4 w-4" /> Explain
        </Button>
        <Button variant="ghost" size="sm" onClick={onDebugCode} disabled={isAssistantLoading} title="Debug Code">
          <Bug className="mr-2 h-4 w-4" /> Debug
        </Button>
        
        <div className="flex items-center gap-2 ml-4">
          <Button variant="outline" size="sm" onClick={handleImportClick} title="Import Python File">
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
          />
          <Button variant="outline" size="sm" onClick={onExportFile} title="Export Python File">
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
        </div>
      </div>
    </div>
  );
}
