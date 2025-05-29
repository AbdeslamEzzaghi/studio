"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Toolbar } from '@/components/ide/Toolbar';
import { EditorPanel } from '@/components/ide/EditorPanel';
import { OutputPanel } from '@/components/ide/OutputPanel';
import { AssistantPanel } from '@/components/ide/AssistantPanel';
import { useToast } from '@/hooks/use-toast';
import { codeAssistantCodeExplanation } from '@/ai/flows/code-assistant-code-explanation';
import { codeAssistantDebugging } from '@/ai/flows/code-assistant-debugging';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const DEFAULT_CODE = `print("Hello, CodeMuse!")

# Example of a function
def greet(name):
  return f"Greetings, {name}!"

print(greet("Developer"))

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
    // Simulate execution and safety warning
    let executionOutput = `Simulating Python execution...\nCodeMuse executed '${fileName}'.\n\n--- Output ---\n`;
    
    // Basic "static analysis" for infinite loop warning
    if (code.toLowerCase().includes('while true:') || code.toLowerCase().includes('while 1:')) {
      toast({
        title: 'Potential Issue Detected',
        description: 'Your code might contain an infinite loop (e.g., "while True:"). Execution is simulated.',
        variant: 'destructive',
      });
      executionOutput += "Warning: Potential infinite loop detected.\n";
    }

    // Simplified "execution"
    // This is a placeholder. Real Python execution in browser is complex (e.g. Pyodide) or needs a backend.
    // For now, we'll just echo a success message.
    // To "run" the code, we'd ideally evaluate it.
    // Here, let's try to capture print statements crudely if possible, or just show a generic message.
    try {
      // This is NOT real Python execution. It's a very basic simulation.
      // It won't handle actual Python syntax or logic beyond simple print statements.
      const printOutputs: string[] = [];
      const mockPrint = (...args: any[]) => {
        printOutputs.push(args.map(String).join(' '));
      };
      
      // A very limited "eval" like environment.
      // For actual output, this would need to be far more sophisticated.
      // For demonstration, we just state what would happen.
      if (code.trim() === DEFAULT_CODE.trim()) {
         mockPrint("Hello, CodeMuse!");
         mockPrint("Greetings, Developer!");
      } else if (code.includes("print(")) {
        mockPrint("(Output from print statements would appear here in a real environment)");
      }


      if (printOutputs.length > 0) {
        executionOutput += printOutputs.join('\n') + '\n';
      } else {
        executionOutput += "(No explicit print output from this basic simulation)\n";
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
          <AlertTriangle className="h-5 w-5 text-yellow-500 mt-1" />
          <div>
            Execution is simulated. No actual Python code is run in this environment.
            Always be cautious with untrusted code in real environments.
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
    // For "errors", we can use the current output if it looks like an error, or a default.
    // A more robust solution would be to have a separate error state or parse output.
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
    // Reset file input to allow importing the same file again
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
      <main className="flex flex-1 p-4 gap-4 overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0"> {/* Editor Panel */}
          <EditorPanel code={code} onCodeChange={setCode} />
        </div>
        <div className="w-2/5 flex flex-col gap-4 min-w-0"> {/* Right Column: Assistant and Output */}
          <div className="flex-1 flex flex-col min-h-0"> {/* Assistant Panel */}
            <AssistantPanel assistantOutput={assistantOutput} isLoading={isAssistantLoading} />
          </div>
          <div className="h-1/3 flex flex-col min-h-0"> {/* Output Panel */}
            <OutputPanel output={output} />
          </div>
        </div>
      </main>
    </div>
  );
}
