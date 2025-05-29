
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

const DEFAULT_CODE = `# Welcome to CodeMuse Python IDE!

# Simple print
print("Hello, CodeMuse!")

# Example of a function
def greet(name):
  return f"Greetings, {name}!"

print(greet("Developer"))

# Example with input()
# Try running this!
name = input("What's your name? ")
print(f"Nice to meet you, {name}!")

# For loop example
# for i in range(3):
# print(f"Loop iteration: {i}")

# You can also try the 'Explain Code' or 'Debug Code' features.
# To debug, introduce an error, e.g.:
# print(unknown_variable)
`;

export default function IdePage() {
  const [code, setCode] = useState<string>(DEFAULT_CODE);
  const [output, setOutput] = useState<string>('');
  const [assistantOutput, setAssistantOutput] = useState<string>('');
  const [isAssistantLoading, setIsAssistantLoading] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>('script.py');
  const { toast } = useToast();

  const handleRunCode = useCallback(async () => {
    setOutput(''); // Clear previous output

    // @ts-ignore
    if (typeof Sk === 'undefined' || typeof Sk.configure === 'undefined') {
      const errorMsg = "Skulpt (Python interpreter) is not loaded. Please check your internet connection or try refreshing the page.";
      setOutput(errorMsg);
      toast({ title: "Interpreter Error", description: errorMsg, variant: "destructive" });
      return;
    }

    let currentOutput = "";
    const updateOutput = (text: string) => {
      currentOutput += text;
      setOutput(currentOutput);
    };
    
    // @ts-ignore
    const Sk = window.Sk;

    function builtinRead(x: string) {
      if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined) {
        throw new Error("File not found: '" + x + "'");
      }
      return Sk.builtinFiles["files"][x];
    }

    Sk.configure({
      output: (text: string) => {
        updateOutput(text);
      },
      read: builtinRead,
      inputfun: (promptText: string) => {
        updateOutput(promptText); // Show the prompt in the output
        const userInput = window.prompt(promptText.trimEnd()); // Get input from user
        if (userInput !== null) {
          updateOutput(userInput + '\\n'); // Echo user input
        }
        return userInput;
      },
      inputfunTakesPrompt: true,
      python3: true,
      // RetainLineNumbers will help with more accurate error reporting if Skulpt supports it well
      // retPDB: true, // For debugging, if needed
    });

    try {
      updateOutput(`Executing '${fileName}' with Skulpt...\n---\n`);
      await Sk.misceval.asyncToPromise(() => {
        return Sk.importMainWithBody("<stdin>", false, code, true);
      });
      updateOutput("\n---\nExecution finished.\n");
      toast({ title: "Code Executed", description: `${fileName} run successfully.` });
    } catch (err: any) {
      let errorMsg = "An error occurred during execution.";
      if (err.toString) {
        // Skulpt errors often have a lot of internal details, try to get a concise message
        errorMsg = err.toString().replace(/\\nSuspendedExecution.*/s, '').trim();
        if (err.tp$str !== undefined) {
            errorMsg = err.tp$str().v; // More specific Skulpt error message
        }
      }
      updateOutput(`\n---Error---\n${errorMsg}\n`);
      toast({ title: "Execution Error", description: errorMsg, variant: "destructive" });
    }
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
    // Pass the current output (which might contain Skulpt errors) to the debugging flow
    const errors = output.toLowerCase().includes("error") || output.toLowerCase().includes("traceback") ? output : "No specific errors detected by interpreter, but AI can still review.";
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
      <PanelGroup direction="horizontal" className="flex-1 overflow-hidden">
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
