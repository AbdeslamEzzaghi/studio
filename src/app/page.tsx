
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Toolbar } from '@/components/ide/Toolbar';
import { EditorPanel } from '@/components/ide/EditorPanel';
import { TestCasesInputPanel } from '@/components/ide/TestCasesInputPanel';
import { TestResultsPanel } from '@/components/ide/TestResultsPanel';
import { useToast } from '@/hooks/use-toast';
import { executePythonCode } from '@/ai/flows/execute-python-code';
import { generateTestCasesForCode, type GenerateTestCasesOutput } from '@/ai/flows/generate-test-cases-flow';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from '@/components/ui/scroll-area';

const DEFAULT_CODE = `a = float(input("Enter the first number: "))
b = float(input("Enter the second number: "))
print("The sum is:", a + b)
`;

export interface TestCase {
  id: string;
  name: string;
  inputs: string[];
  expectedOutput: string;
}

export interface TestResult extends TestCase {
  actualOutput: string;
  passed: boolean;
}

const initialTestCases: TestCase[] = [
  { id: 'sum_10_20', name: 'Somme (10.0, 20.0)', inputs: ['10.0', '20.0'], expectedOutput: 'The sum is: 30.0' },
  { id: 'sum_neg_5_7_5', name: 'Somme (-5.0, 7.5)', inputs: ['-5.0', '7.5'], expectedOutput: 'The sum is: 2.5' },
  { id: 'sum_0_0', name: 'Somme (0, 0)', inputs: ['0', '0'], expectedOutput: 'The sum is: 0.0' },
];

interface ErrorDialogContent {
  title: string;
  description: string;
  codeSnapshot?: string;
}

export default function IdePage() {
  const [code, setCode] = useState<string>(DEFAULT_CODE);
  const [userTestCases, setUserTestCases] = useState<TestCase[]>(initialTestCases);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isGeneratingTests, setIsGeneratingTests] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>('script.py');
  const { toast } = useToast();

  const [errorDialogIsOpen, setErrorDialogIsOpen] = useState<boolean>(false);
  const [errorForDialog, setErrorForDialog] = useState<ErrorDialogContent | null>(null);

  const handleCleanCode = useCallback(() => {
    setCode('');
    toast({ title: 'Code Nettoyé', description: "L'éditeur a été vidé." });
  }, [toast]);

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
        const joinedInputs = testCase.inputs.join('\n');
        const result = await executePythonCode({ code, testInput: joinedInputs });
        
        if (result.errorOutput) {
          allTestsPassedOverall = false;
          currentTestRunResults.push({
            ...testCase,
            actualOutput: "ERREUR (voir détails)",
            passed: false,
          });
          setErrorForDialog({
            title: "Erreur d'Exécution du Test",
            description: result.errorOutput,
            codeSnapshot: code,
          });
          setErrorDialogIsOpen(true);
           // Stop further tests if one fails and shows a dialog, or decide if you want to continue
           // For now, we'll continue and potentially show multiple dialogs or just the first error.
           // Let's show only the first error for simplicity in this iteration.
           // break; // Uncomment to stop on first error
        } else if (result.successOutput !== null) {
          const actual = result.successOutput.trim();
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
        } else { // Should not happen if flow is correct
          allTestsPassedOverall = false;
          currentTestRunResults.push({
            ...testCase,
            actualOutput: "Sortie IA Invalide",
            passed: false,
          });
        }
        setTestResults([...currentTestRunResults]); // Update results incrementally

      } catch (err: any) {
        allTestsPassedOverall = false;
        const errorMsg = err.message || "Une erreur inattendue s'est produite lors de la simulation IA pour ce cas de test.";
        currentTestRunResults.push({
          ...testCase,
          actualOutput: `ERREUR SYSTÈME: ${errorMsg}`,
          passed: false,
        });
        setTestResults([...currentTestRunResults]);
        setErrorForDialog({
            title: "Erreur Système lors du Test",
            description: errorMsg,
            codeSnapshot: code,
          });
        setErrorDialogIsOpen(true);
        // break; // Uncomment to stop on first system error
         toast({
          title: `Erreur Système dans le Test : ${testCase.name}`,
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

  const handleDeleteAllTestCases = useCallback(() => {
    setUserTestCases([]);
    setTestResults([]);
    toast({ title: 'Cas de Test Supprimés', description: 'Tous les cas de test ont été supprimés.' });
  }, [toast]);

  const handleGenerateTestCases = useCallback(async () => {
    if (!code.trim()) {
      toast({ title: 'Code Vide', description: 'Veuillez écrire du code dans l\'éditeur avant de générer des tests.', variant: 'destructive' });
      return;
    }
    setIsGeneratingTests(true);
    toast({ title: 'Génération de Tests IA', description: 'L\'IA génère des cas de test pour votre code...' });
    try {
      const result: GenerateTestCasesOutput = await generateTestCasesForCode({ code });
      if (result.generatedTestCases && result.generatedTestCases.length > 0) {
        const newTestCases = result.generatedTestCases.map((tc, index) => ({
          id: `ai_${Date.now().toString()}_${index}`,
          name: tc.name,
          inputs: tc.inputs,
          expectedOutput: tc.expectedOutput,
        }));
        setUserTestCases(newTestCases);
        setTestResults([]);
        toast({ title: 'Tests Générés par IA', description: `${newTestCases.length} cas de test ont été générés et chargés.` });
      } else {
        toast({ title: 'Génération Échouée', description: 'L\'IA n\'a pas pu générer de cas de test ou le format était incorrect.', variant: 'destructive' });
      }
    } catch (error: any) {
      toast({ title: 'Erreur de Génération IA', description: error.message || 'Une erreur inconnue est survenue.', variant: 'destructive' });
    } finally {
      setIsGeneratingTests(false);
    }
  }, [code, toast]);


  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        if (!isProcessing && !isGeneratingTests) { 
          handleRunTests();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleRunTests, isProcessing, isGeneratingTests]);


  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-sans overflow-hidden">
      <Toolbar
        onRunTests={handleRunTests}
        onImportFile={handleImportFile}
        onExportFile={handleExportFile}
        fileName={fileName}
        onFileNameChange={setFileName}
        isProcessing={isProcessing || isGeneratingTests}
        onCleanCode={handleCleanCode}
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
                 isProcessing={isProcessing || isGeneratingTests}
                 codeIsEmpty={!code.trim()}
                 onDeleteAllTestCases={handleDeleteAllTestCases}
                 onGenerateTestCases={handleGenerateTestCases}
               />
            </Panel>
            <PanelResizeHandle className="h-px bg-border hover:bg-primary transition-colors data-[resize-handle-state=drag]:bg-primary my-1 self-stretch" />
            <Panel defaultSize={50} minSize={25} className="min-h-0 pt-1">
               <TestResultsPanel results={testResults} isTesting={isProcessing && testResults.length < userTestCases.length && userTestCases.length > 0} />
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>

      {errorForDialog && (
        <AlertDialog open={errorDialogIsOpen} onOpenChange={setErrorDialogIsOpen}>
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>{errorForDialog.title}</AlertDialogTitle>
            </AlertDialogHeader>
            <div className="mt-2 text-sm text-foreground space-y-4">
              <p className="font-semibold">Message d'Erreur:</p>
              <ScrollArea className="h-40 w-full rounded-md border p-2 bg-muted/50">
                <pre className="text-xs whitespace-pre-wrap break-all font-mono">
                  {errorForDialog.description}
                </pre>
              </ScrollArea>
              {errorForDialog.codeSnapshot && (
                <>
                  <p className="font-semibold pt-2">Code Concerné:</p>
                  <ScrollArea className="h-40 w-full rounded-md border p-2 bg-muted/50">
                    <pre className="text-xs whitespace-pre-wrap break-all font-mono">
                      {errorForDialog.codeSnapshot}
                    </pre>
                  </ScrollArea>
                </>
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setErrorDialogIsOpen(false)}>Fermer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
