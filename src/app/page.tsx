
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Toolbar } from '@/components/ide/Toolbar';
import { EditorPanel } from '@/components/ide/EditorPanel';
import { OutputPanel } from '@/components/ide/OutputPanel';
import { AssistantPanel } from '@/components/ide/AssistantPanel';
import { TestResultsPanel } from '@/components/ide/TestResultsPanel'; // New
import { useToast } from '@/hooks/use-toast';
import { codeAssistantCodeExplanation } from '@/ai/flows/code-assistant-code-explanation';
import { codeAssistantDebugging } from '@/ai/flows/code-assistant-debugging';
import { executePythonCode } from '@/ai/flows/execute-python-code';

const DEFAULT_CODE = `def greet(name):
  return f"Hello, {name}!"

# Get name from input
user_name = input("Enter your name: ")
print(greet(user_name))

# Another example
# print("Calculating sum...")
# num1 = 5 # or use input()
# num2 = 10 # or use input()
# print(f"The sum is: {num1 + num2}")
`;

export interface TestCase {
  id: string;
  name: string;
  input: string; // Simulates what user would type for input()
  expectedOutput: string;
}

export interface TestResult extends TestCase {
  actualOutput: string;
  passed: boolean;
}

const sampleTestCases: TestCase[] = [
  { id: '1', name: 'Greet Alice', input: 'Alice', expectedOutput: 'Hello, Alice!' },
  { id: '2', name: 'Greet Bob', input: 'Bob', expectedOutput: 'Hello, Bob!' },
  { id: '3', name: 'Greet World', input: 'World', expectedOutput: 'Hello, World!' },
  { id: '4', name: 'Greet Empty String', input: '', expectedOutput: 'Hello, !' }, // Example of a potentially "failing" case if not handled
];


export default function IdePage() {
  const [code, setCode] = useState<string>(DEFAULT_CODE);
  const [output, setOutput] = useState<string>(''); // Will show detailed logs of test runs
  const [assistantOutput, setAssistantOutput] = useState<string>('');
  const [testResults, setTestResults] = useState<TestResult[]>([]); // New
  const [isProcessing, setIsProcessing] = useState<boolean>(false); // Renamed from isAssistantLoading
  const [isTesting, setIsTesting] = useState<boolean>(false); // New for TestResultsPanel loading state
  const [fileName, setFileName] = useState<string>('script.py');
  const { toast } = useToast();

  const handleRunCode = useCallback(async () => {
    if (!code.trim()) {
      toast({ title: 'Empty Code', description: 'Please enter some Python code to run.', variant: 'destructive' });
      return;
    }
    setIsProcessing(true);
    setIsTesting(true);
    setOutput('Starting test execution...\n=====================\n');
    setTestResults([]);
    const currentTestResults: TestResult[] = [];
    let allTestsPassed = true;

    for (const testCase of sampleTestCases) {
      setOutput(prev => `${prev}Running test: ${testCase.name} (Input: "${testCase.input}")\n`);
      try {
        const result = await executePythonCode({ code, testInput: testCase.input });
        const actual = result.simulatedOutput.trim();
        const expected = testCase.expectedOutput.trim();
        const passed = actual === expected;
        
        if (!passed) {
          allTestsPassed = false;
        }

        currentTestResults.push({
          ...testCase,
          actualOutput: actual,
          passed,
        });
        setTestResults([...currentTestResults]); // Update incrementally for UI responsiveness

        setOutput(prev => `${prev}Expected: "${expected}"\nActual: "${actual}"\nStatus: ${passed ? 'PASSED' : 'FAILED'}\n---------------------\n`);
      } catch (err: any) {
        allTestsPassed = false;
        const errorMsg = err.message || "An error occurred during AI simulation for this test case.";
        currentTestResults.push({
          ...testCase,
          actualOutput: `ERROR: ${errorMsg}`,
          passed: false,
        });
        setTestResults([...currentTestResults]);
        setOutput(prev => `${prev}Error for test "${testCase.name}": ${errorMsg}\n---------------------\n`);
      }
    }
    
    setOutput(prev => `${prev}\nTest execution finished.\nSummary: ${allTestsPassed ? 'All tests passed!' : 'Some tests failed.'}`);
    toast({ 
      title: "Test Execution Complete", 
      description: `${currentTestResults.filter(r => r.passed).length}/${currentTestResults.length} tests passed.`,
      variant: allTestsPassed ? "default" : "destructive"
    });
    setIsProcessing(false);
    setIsTesting(false);
  }, [code, fileName, toast]);

  const handleExplainCode = async () => {
    if (!code.trim()) {
      toast({ title: 'Empty Code', description: 'Please enter some Python code to explain.', variant: 'destructive' });
      return;
    }
    setIsProcessing(true);
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
    setIsProcessing(false);
  };

  const handleDebugCode = async () => {
    if (!code.trim()) {
      toast({ title: 'Empty Code', description: 'Please enter some Python code to debug.', variant: 'destructive' });
      return;
    }
    setIsProcessing(true);
    setAssistantOutput('');
    // For debugging, we might want to use the general output or specific test failure output.
    // For now, let's pass the general output which includes test logs.
    const errors = output.toLowerCase().includes("error") || output.toLowerCase().includes("traceback") || output.toLowerCase().includes("failed") ? output : "No specific errors detected, but AI can still review.";
    try {
      const result = await codeAssistantDebugging({ code, output, errors });
      setAssistantOutput(`Debugging Suggestions:\n${result.suggestions}`);
      toast({ title: 'Debugging Assistant', description: 'AI has provided debugging suggestions.' });
    } catch (error) {
      console.error('Error debugging code:', error);
      setAssistantOutput('Error generating debugging suggestions. See console for details.');
      toast({ title: 'Error', description: 'Failed to get debugging suggestions.', variant: 'destructive' });
    }
    setIsProcessing(false);
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
        isProcessing={isProcessing} // Renamed
      />
      <PanelGroup direction="horizontal" className="flex-1 overflow-hidden">
        <Panel defaultSize={60} minSize={30} className="min-w-0"> {/* Adjusted default/min size */}
          <div className="h-full flex flex-col p-4 pr-0">
            <EditorPanel code={code} onCodeChange={setCode} />
          </div>
        </Panel>
        <PanelResizeHandle className="w-px bg-border hover:bg-primary transition-colors data-[resize-handle-state=drag]:bg-primary mx-2 self-stretch" />
        <Panel defaultSize={40} minSize={25} className="min-w-0"> {/* Adjusted default/min size */}
          <PanelGroup direction="vertical" className="h-full gap-2 p-4 pl-0"> {/* Reduced gap slightly */}
            <Panel defaultSize={33} minSize={20} className="min-h-0">
               <AssistantPanel assistantOutput={assistantOutput} isLoading={isProcessing && assistantOutput !== '' && !isTesting} />
            </Panel>
            <PanelResizeHandle className="h-px bg-border hover:bg-primary transition-colors data-[resize-handle-state=drag]:bg-primary my-1 self-stretch" /> {/* Reduced margin */}
            <Panel defaultSize={34} minSize={20} className="min-h-0">
               <TestResultsPanel results={testResults} isTesting={isTesting} />
            </Panel>
            <PanelResizeHandle className="h-px bg-border hover:bg-primary transition-colors data-[resize-handle-state=drag]:bg-primary my-1 self-stretch" /> {/* Reduced margin */}
            <Panel defaultSize={33} minSize={15} className="min-h-0">
               <OutputPanel output={output} />
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>
    </div>
  );
}
