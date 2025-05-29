
"use client";

import React from 'react';
import { Play, Upload, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CodeMuseLogo } from '@/components/icons';
import { ThemeToggle } from '@/components/ThemeToggle'; 

interface ToolbarProps {
  onRunTests: () => void;
  onImportFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onExportFile: () => void;
  fileName: string;
  onFileNameChange: (name: string) => void;
  isProcessing: boolean;
}

export function Toolbar({
  onRunTests,
  onImportFile,
  onExportFile,
  fileName,
  onFileNameChange,
  isProcessing,
}: ToolbarProps) {
  const importInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  return (
    <div className="flex items-center justify-between p-3 border-b bg-card shadow-sm">
      <CodeMuseLogo />
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onRunTests} disabled={isProcessing} title="Exécuter les Tests (Ctrl+Enter)">
          {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
           Exécuter les Tests
        </Button>
        
        <div className="flex items-center gap-2 ml-4">
          <Button variant="outline" size="sm" onClick={handleImportClick} title="Importer un fichier Python" disabled={isProcessing}>
            <Upload className="mr-2 h-4 w-4" /> Importer
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
            placeholder="nomdufichier.py"
            value={fileName}
            onChange={(e) => onFileNameChange(e.target.value)}
            className="w-36 h-9 text-sm"
            disabled={isProcessing}
          />
          <Button variant="outline" size="sm" onClick={onExportFile} title="Exporter le fichier Python" disabled={isProcessing}>
            <Download className="mr-2 h-4 w-4" /> Exporter
          </Button>
        </div>
        <div className="ml-2"> 
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
