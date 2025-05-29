
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Toolbar } from '@/components/ide/Toolbar';
import { EditorPanel } from '@/components/ide/EditorPanel';
import { TestCasesInputPanel } from '@/components/ide/TestCasesInputPanel';
import { TestResultsPanel } from '@/components/ide/TestResultsPanel';
import { useToast } from '@/hooks/use-toast';
import { executePythonCode } from '@/ai/flows/execute-python-code';

const DEFAULT_CODE = `def greet(name):
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
`;

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
  { id: '1', name: 'Saluer Alice', input: 'Alice', expectedOutput: 'Hello, Alice!' },
  { id: '2', name: 'Saluer Bob', input: 'Bob', expectedOutput: 'Hello, Bob!' },
  { id: '3', name: 'Test Vide', input: '', expectedOutput: 'Hello, !' },
  { id: '4', name: 'Test Nombre', input: '123', expectedOutput: 'Hello, 123!' },
  { id: '5', name: 'Test Phrase Longue', input: 'Un nom tres tres long pour voir', expectedOutput: 'Hello, Un nom tres tres long pour voir!' },
  { id: '6', name: 'Saluer Charlie', input: 'Charlie', expectedOutput: 'Hello, Charlie!' },
  { id: '7', name: 'Saluer Dave', input: 'Dave', expectedOutput: 'Hello, Dave!' },
  { id: '8', name: 'Saluer Eve', input: 'Eve', expectedOutput: 'Hello, Eve!' },
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
      toast({ title: 'Code Vide', description: 'Veuillez entrer du code Python à exécuter.', variant: 'destructive' });
      return;
    }
    if (userTestCases.length === 0) {
      toast({ title: 'Aucun Cas de Test', description: 'Veuillez définir au moins un cas de test à exécuter.', variant: 'destructive' });
      return;
    }

    setIsProcessing(true);
    setTestResults([]);
    const currentTestRunResults: TestResult[] = [];
    let allTestsPassedOverall = true;

    toast({
      title: "Exécution des Tests Démarrée",
      description: `Exécution de ${userTestCases.length} cas de test...`,
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
        // Update results incrementally for better UX
        setTestResults([...currentTestRunResults]);

      } catch (err: any) {
        allTestsPassedOverall = false;
        const errorMsg = err.message || "Une erreur s'est produite lors de la simulation IA pour ce cas de test.";
        currentTestRunResults.push({
          ...testCase,
          actualOutput: `ERREUR: ${errorMsg}`,
          passed: false,
        });
        setTestResults([...currentTestRunResults]); // Update results incrementally
         toast({
          title: `Erreur dans le Test : ${testCase.name}`,
          description: errorMsg,
          variant: "destructive"
        });
      }
    }
    
    toast({
      title: "Exécution des Tests Terminée",
      description: `${currentTestRunResults.filter(r => r.passed).length}/${currentTestRunResults.length} tests réussis.`,
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
        toast({ title: 'Fichier Importé', description: `${file.name} chargé dans l'éditeur.` });
      };
      reader.readAsText(file);
    }
    // Reset input to allow re-uploading same file
    if (event.target) {
      event.target.value = ""; 
    }
  };

  const handleExportFile = () => {
    if (!code.trim()) {
      toast({ title: 'Code Vide', description: 'Rien à exporter.', variant: 'destructive' });
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
    toast({ title: 'Fichier Exporté', description: `${a.download} sauvegardé.` });
  };

  // Keyboard shortcut for running tests (Ctrl+Enter or Cmd+Enter)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        if (!isProcessing) { // Only run if not already processing
          handleRunTests();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleRunTests, isProcessing]);


  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-sans overflow-hidden">
      <Toolbar
        onRunTests={handleRunTests}
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
