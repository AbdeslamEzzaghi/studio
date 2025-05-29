
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Toolbar } from '@/components/ide/Toolbar';
import { EditorPanel } from '@/components/ide/EditorPanel';
import { OutputPanel } from '@/components/ide/OutputPanel';
import { AssistantPanel } from '@/components/ide/AssistantPanel';
import { useToast } from '@/hooks/use-toast';
import { codeAssistantCodeExplanation } from '@/ai/flows/code-assistant-code-explanation';
import { codeAssistantDebugging } from '@/ai/flows/code-assistant-debugging';
import { AlertTriangle } from 'lucide-react';
// Alert components are imported but not directly used in the new toast. Keeping for potential future use or if other toasts use them.
// import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const DEFAULT_CODE = `print("Hello, CodeMuse!")

# Example of a function
def greet(name):
  return f"Greetings, {name}!"

print(greet("Developer"))
print(f"The year is {2024}")

# Try the 'Explain Code' or 'Debug Code' features!
# For debugging, you can introduce an error, e.g.:
# print(unknown_variable)
`;

export default function IdePage() {
  const [code, setCode] = useState<string>(DEFAULT_CODE);
  const [output, setOutput] = useState<string>('');
  const [assistantOutput, setAssistantOutput] = useState<string>('');
  const [isAssistantLoading, setIsAssistantLoading] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>('script.py');
  const { toast } = useToast();

  const handleRunCode = useCallback(() => {
    setOutput(''); // Clear previous output
    let executionOutput = `Simulating Python execution...\nCodeMuse executed '${fileName}'.\n\n--- Output ---\n`;
    const printOutputs: string[] = [];

    // Basic "static analysis" for infinite loop warning
    if (code.toLowerCase().includes('while true:') || code.toLowerCase().includes('while 1:')) {
      toast({
        title: 'Potential Issue Detected',
        description: 'Your code might contain an infinite loop (e.g., "while True:"). Execution is simulated.',
        variant: 'destructive',
      });
      executionOutput += "Warning: Potential infinite loop detected.\n";
    }

    try {
      const lines = code.split('\n');
      lines.forEach(line => {
        const trimmedLine = line.trim();
        // Basic check for print() statements
        if (trimmedLine.startsWith('print(') && trimmedLine.endsWith(')')) {
          try {
            let argContent = trimmedLine.substring(6, trimmedLine.length - 1).trim();

            // Handle simple string literals (single or double quotes)
            if ((argContent.startsWith('"') && argContent.endsWith('"')) || (argContent.startsWith("'") && argContent.endsWith("'"))) {
              printOutputs.push(argContent.slice(1, -1));
            }
            // Handle basic f-strings (f"..." or f'...')
            else if ((argContent.startsWith('f"') && argContent.endsWith('"')) || (argContent.startsWith("f'") && argContent.endsWith("'"))) {
              let fStringContent = argContent.substring(2, argContent.length - 1);
              // Simulate f-string by replacing {expression} with (value of expression)
              // This is a very basic simulation and does not evaluate Python expressions.
              fStringContent = fStringContent.replace(/\{([^}]+)\}/g, (_match, expression) => {
                // Attempt to check if the expression is a literal number
                if (!isNaN(parseFloat(expression)) && isFinite(Number(expression))) {
                  return expression;
                }
                return `(value of ${expression.trim()})`;
              });
              printOutputs.push(fStringContent);
            }
            // Handle other cases (variables, expressions) by showing what would be printed
            else {
              printOutputs.push(`(output of: ${argContent})`);
            }
          } catch (e) {
            // Catch errors during parsing of the print statement itself
            printOutputs.push(`(Error parsing print statement: ${trimmedLine})`);
          }
        }
      });

      if (printOutputs.length > 0) {
        executionOutput += printOutputs.join('\n') + '\n';
      } else if (!executionOutput.includes("Warning:")) { // Avoid double messaging if already warned
        executionOutput += "(No print() statements found or no output produced by basic simulator)\n";
      }
      executionOutput += "\n--- End of Output ---";

    } catch (e: any) {
      executionOutput += `Error during simulated execution: ${e.message}\n`;
      executionOutput += "\n--- End of Output ---";
      toast({
        title: 'Simulated Execution Error',
        description: e.message,
        variant: 'destructive',
      });
    }
    
    setOutput(executionOutput);

    toast({
      title: 'Code "Executed"',
      description: (
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-primary mt-1" /> 
          {/* Changed text-yellow-500 to text-primary for theme consistency */}
          <div>
            Execution is simulated. No actual Python code is run.
            This is a basic attempt to show `print()` outputs.
          </div>
        </div>
      ),
    });
  }, [code, fileName, toast]);

  const handleExplainCode = async () => {
    if (!code.trim()) {
      toast({ title: 'Empty Code', description: 'Please enter some Python code to explain.', variant: 'destructive' });
      return;
    }
    setIsAssistantLoading(true);
    setAssistantOutput('');
    try {
      const result = await codeAssistantCodeExplanation({ code });
      setAssistantOutput(`Explanation:\n${result.explainedCode}`);
      toast({ title: 'Code Explained', description: 'AI has added comments to your code.' });
    } catch (error) {
      console.error('Error explaining code:', error);
      setAssistantOutput('Error explaining code. See console for details.');
      toast({ title: 'Error', description: 'Failed to explain code.', variant: 'destructive' });
    }
    setIsAssistantLoading(false);
  };

  const handleDebugCode = async () => {
    if (!code.trim()) {
      toast({ title: 'Empty Code', description: 'Please enter some Python code to debug.', variant: 'destructive' });
      return;
    }
    setIsAssistantLoading(true);
    setAssistantOutput('');
    const errors = output.toLowerCase().includes("error") ? output : "No specific errors detected by simulator, but AI can still review.";
    try {
      const result = await codeAssistantDebugging({ code, output, errors });
      setAssistantOutput(`Debugging Suggestions:\n${result.suggestions}`);
      toast({ title: 'Debugging Assistant', description: 'AI has provided debugging suggestions.' });
    } catch (error) {
      console.error('Error debugging code:', error);
      setAssistantOutput('Error generating debugging suggestions. See console for details.');
      toast({ title: 'Error', description: 'Failed to get debugging suggestions.', variant: 'destructive' });
    }
    setIsAssistantLoading(false);
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCode(e.target?.result as string);
        setFileName(file.name);
        toast({ title: 'File Imported', description: `${file.name} loaded into editor.` });
      };
      reader.readAsText(file);
    }
    if (event.target) {
      event.target.value = ""; 
    }
  };

  const handleExportFile = () => {
    if (!code.trim()) {
      toast({ title: 'Empty Code', description: 'Nothing to export.', variant: 'destructive' });
      return;
    }
    const blob = new Blob([code], { type: 'text/x-python;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName.endsWith('.py') ? fileName : `${fileName}.py`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: 'File Exported', description: `${a.download} saved.` });
  };
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        handleRunCode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleRunCode]);


  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-sans overflow-hidden">
      <Toolbar
        onRunCode={handleRunCode}
        onExplainCode={handleExplainCode}
        onDebugCode={handleDebugCode}
        onImportFile={handleImportFile}
        onExportFile={handleExportFile}
        fileName={fileName}
        onFileNameChange={setFileName}
        isAssistantLoading={isAssistantLoading}
      />
      <PanelGroup direction="horizontal" className="flex-1 gap-4 overflow-hidden">
        <Panel defaultSize={70} minSize={40} className="min-w-0">
          <div className="h-full flex flex-col p-4 pr-0">
            <EditorPanel code={code} onCodeChange={setCode} />
          </div>
        </Panel>
        <PanelResizeHandle className="w-px bg-border hover:bg-primary transition-colors data-[resize-handle-state=drag]:bg-primary mx-2 self-stretch" />
        <Panel defaultSize={30} minSize={20} className="min-w-0">
          <PanelGroup direction="vertical" className="h-full gap-4 p-4 pl-0">
            <Panel defaultSize={60} minSize={20} className="min-h-0">
               <AssistantPanel assistantOutput={assistantOutput} isLoading={isAssistantLoading} />
            </Panel>
            <PanelResizeHandle className="h-px bg-border hover:bg-primary transition-colors data-[resize-handle-state=drag]:bg-primary my-2 self-stretch" />
            <Panel defaultSize={40} minSize={20} className="min-h-0">
               <OutputPanel output={output} />
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>
    </div>
  );
}

    