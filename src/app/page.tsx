
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Toolbar } from '@/components/ide/Toolbar';
import { EditorPanel } from '@/components/ide/EditorPanel';
import { TestCasesInputPanel } from '@/components/ide/TestCasesInputPanel';
import { TestResultsPanel } from '@/components/ide/TestResultsPanel';
import { useToast } from '@/hooks/use-toast';
import { executePythonCode } from '@/ai/flows/execute-python-code';

const DEFAULT_CODE = \`def greet(name):
  message = f"Hello, {name}!"
  return message

user_name = input("Enter your name: ")
print(greet(user_name))

# Example: Sum of two numbers
# num1_str = input("Enter first number: ")
# num2_str = input("Enter second number: ")
# if num1_str.isdigit() and num2_str.isdigit():
#   num1 = int(num1_str)
#   num2 = int(num2_str)
#   print(f"The sum is: {num1 + num2}")
# else:
#   print("Invalid input for numbers.")
\`;

export interface TestCase {
  id: string;
  name: string;
  input: string; 
  expectedOutput: string;
}

export interface TestResult extends TestCase {
  actualOutput: string;
  passed: boolean;
}

const initialTestCases: TestCase[] = [
  { id: '1', name: 'Greet Alice', input: 'Alice', expectedOutput: 'Hello, Alice!' },
  { id: '2', name: 'Greet Bob', input: 'Bob', expectedOutput: 'Hello, Bob!' },
];


export default function IdePage() {
  const [code, setCode] = useState<string>(DEFAULT_CODE);
  const [userTestCases, setUserTestCases] = useState<TestCase[]>(initialTestCases);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>('script.py');
  const { toast } = useToast();

  const handleRunTests = useCallback(async () => {
    if (!code.trim()) {
      toast({ title: 'Empty Code', description: 'Please enter some Python code to run.', variant: 'destructive' });
      return;
    }
    if (userTestCases.length === 0) {
      toast({ title: 'No Test Cases', description: 'Please define at least one test case to run.', variant: 'destructive' });
      return;
    }

    setIsProcessing(true);
    setTestResults([]); 
    const currentTestRunResults: TestResult[] = [];
    let allTestsPassedOverall = true;

    toast({
      title: "Test Execution Started",
      description: `Running ${userTestCases.length} test case(s)...`,
      variant: "default"
    });

    for (const testCase of userTestCases) {
      try {
        const result = await executePythonCode({ code, testInput: testCase.input });
        const actual = result.simulatedOutput.trim();
        const expected = testCase.expectedOutput.trim();
        const passed = actual === expected;
        
        if (!passed) {
          allTestsPassedOverall = false;
        }

        currentTestRunResults.push({
          ...testCase,
          actualOutput: actual,
          passed,
        });
        // Update incrementally for UI responsiveness
        setTestResults([...currentTestRunResults]); 

      } catch (err: any) {
        allTestsPassedOverall = false;
        const errorMsg = err.message || "An error occurred during AI simulation for this test case.";
        currentTestRunResults.push({
          ...testCase,
          actualOutput: \`ERROR: \${errorMsg}\`,
          passed: false,
        });
        setTestResults([...currentTestRunResults]);
         toast({ 
          title: \`Error in Test: \${testCase.name}\`,
          description: errorMsg,
          variant: "destructive"
        });
      }
    }
    
    toast({ 
      title: "Test Execution Complete", 
      description: \`\${currentTestRunResults.filter(r => r.passed).length}/\${currentTestRunResults.length} tests passed.\`,
      variant: allTestsPassedOverall ? "default" : "destructive"
    });
    setIsProcessing(false);
  }, [code, userTestCases, toast]);


  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCode(e.target?.result as string);
        setFileName(file.name);
        toast({ title: 'File Imported', description: \`\${file.name} loaded into editor.\` });
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
    a.download = fileName.endsWith('.py') ? fileName : \`\${fileName}.py\`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: 'File Exported', description: \`\${a.download} saved.\` });
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        handleRunTests();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleRunTests]);


  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-sans overflow-hidden">
      <Toolbar
        onRunTests={handleRunTests} // Renamed prop
        onImportFile={handleImportFile}
        onExportFile={handleExportFile}
        fileName={fileName}
        onFileNameChange={setFileName}
        isProcessing={isProcessing}
      />
      <PanelGroup direction="horizontal" className="flex-1 overflow-hidden">
        <Panel defaultSize={60} minSize={30} className="min-w-0">
          <div className="h-full flex flex-col p-4 pr-0">
            <EditorPanel code={code} onCodeChange={setCode} />
          </div>
        </Panel>
        <PanelResizeHandle className="w-px bg-border hover:bg-primary transition-colors data-[resize-handle-state=drag]:bg-primary mx-2 self-stretch" />
        <Panel defaultSize={40} minSize={25} className="min-w-0">
          <PanelGroup direction="vertical" className="h-full p-4 pl-0">
            <Panel defaultSize={50} minSize={25} className="min-h-0 pb-1">
               <TestCasesInputPanel 
                 testCases={userTestCases} 
                 onTestCasesChange={setUserTestCases}
                 isProcessing={isProcessing}
               />
            </Panel>
            <PanelResizeHandle className="h-px bg-border hover:bg-primary transition-colors data-[resize-handle-state=drag]:bg-primary my-1 self-stretch" />
            <Panel defaultSize={50} minSize={25} className="min-h-0 pt-1">
               <TestResultsPanel results={testResults} isTesting={isProcessing && testResults.length < userTestCases.length && userTestCases.length > 0} />
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>
    </div>
  );
}
