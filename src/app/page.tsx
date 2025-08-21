
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { Toolbar } from '@/components/ide/Toolbar';
import { EditorPanel } from '@/components/ide/EditorPanel';
import { TestCasesInputPanel } from '@/components/ide/TestCasesInputPanel';
import { TestResultsPanel } from '@/components/ide/TestResultsPanel';
import { useToast } from '@/hooks/use-toast';
import { runPythonLocally } from '@/lib/pyExec';
import { analyzePythonError } from '@/lib/errorAnalyzer';
import { generateTestCasesForCode, type GenerateTestCasesOutput } from '@/ai/flows/generate-test-cases-flow';
import { codeAssistantDebugging } from '@/ai/flows/code-assistant-debugging';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';

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
  { id: 'multi_input_1_2', name: 'Somme (1.0, 2.0)', inputs: ['1.0', '2.0'], expectedOutput: 'The sum is: 3.0' },
  { id: 'multi_input_empty_5.5', name: 'Entrée vide puis nombre', inputs: ['', '5.5'], expectedOutput: 'The sum is: 5.5' },
  { id: 'multi_input_decimal_values', name: 'Deux nombres décimaux', inputs: ['1.23', '4.56'], expectedOutput: 'The sum is: 5.79' },
  { id: 'multi_input_large_numbers', name: 'Grands nombres', inputs: ['1000000', '2500000'], expectedOutput: 'The sum is: 3500000.0' },
  { id: 'multi_input_zero_first', name: 'Premier nombre zéro', inputs: ['0.0', '99.9'], expectedOutput: 'The sum is: 99.9' },
];


interface ErrorDialogContent {
  title: string;
  aiExplanation: string;
  rawError?: string;
  codeSnapshot?: string;
  errorLine?: number;
}

export default function IdePage() {
  const [code, setCode] = useState<string>(DEFAULT_CODE);
  const [userTestCases, setUserTestCases] = useState<TestCase[]>(initialTestCases);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isGeneratingTests, setIsGeneratingTests] = useState<boolean>(false);
  const [isFetchingExplanation, setIsFetchingExplanation] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>('script.py');
  const { toast } = useToast();
  const extractErrorLine = useCallback((errorText?: string): number | undefined => {
    if (!errorText) return undefined;
    const m = errorText.match(/line\s+(\d+)/i);
    if (!m) return undefined;
    const n = parseInt(m[1], 10);
    return Number.isFinite(n) ? n : undefined;
  }, []);

  // Normalizes stdout for fair comparison with expected output.
  // - trims whitespace
  // - uses the last non-empty line (so input() prompts don't cause failures)
  // - keeps a simple string for matching
  const normalizeForCompare = useCallback((text: string): string => {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length === 0) return '';
    return lines[lines.length - 1];
  }, []);


  const [errorDialogIsOpen, setErrorDialogIsOpen] = useState<boolean>(false);
  const [errorForDialog, setErrorForDialog] = useState<ErrorDialogContent | null>(null);
  useEffect(() => {
    if (errorDialogIsOpen && errorLineRef.current) {
      try { errorLineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch {}
    }
  }, [errorDialogIsOpen, errorForDialog?.errorLine]);
  const errorLineRef = useRef<HTMLDivElement | null>(null);

  const handleCleanCode = useCallback(() => {
    setCode('');
    toast({ title: 'Code Nettoyé', description: "L'éditeur a été vidé." });
  }, [toast]);

  const isAIServiceError = (errorMessage: string): boolean => {
    const lowerCaseMessage = errorMessage.toLowerCase();
    return lowerCaseMessage.includes('503') || 
           lowerCaseMessage.includes('service unavailable') || 
           lowerCaseMessage.includes('model is overloaded');
  };

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
    let anErrorOccurred = false;

    toast({
      title: "Exécution des Tests Démarrée",
      description: `Exécution de ${userTestCases.length} cas de test...`,
      variant: "default"
    });

    for (const testCase of userTestCases) {
      if (anErrorOccurred) break; 

      try {
        const joinedInputs = testCase.inputs.join('\n');
        const execResult = await runPythonLocally({ code, testInput: joinedInputs });
        
        if (execResult.errorOutput) {
          const expectedIsError = testCase.expectedOutput.trim().toUpperCase() === 'ERROR';
          if (expectedIsError) {
            // This test expects an error: mark as passed and do not invoke AI explanation
            currentTestRunResults.push({
              ...testCase,
              actualOutput: 'ERREUR (attendue)\n' + execResult.errorOutput,
              passed: true,
            });
            setTestResults([...currentTestRunResults]);
            continue; // proceed to next test
          }
          anErrorOccurred = true;
          allTestsPassedOverall = false;
          currentTestRunResults.push({
            ...testCase,
            actualOutput: "ERREUR (voir détails)",
            passed: false,
          });
          setTestResults([...currentTestRunResults]); 

          setIsFetchingExplanation(true);
          toast({
            title: "Analyse de l'Erreur en Cours...",
            description: "L'assistant IA prépare une explication de l'erreur.",
          });

          try {
            // First try deterministic local analysis
            const analysis = analyzePythonError(execResult.errorOutput, code);
            let explanation = analysis.explanation;

            // If not confident, fallback to AI explainer
            if (!analysis.confident) {
              const debugInfo = await codeAssistantDebugging({
                code: code,
                errors: execResult.errorOutput,
                output: execResult.successOutput || "", 
              });
              explanation = debugInfo.suggestions;
            }
            setErrorForDialog({
              title: "Explication de l'Erreur (IA)",
              aiExplanation: explanation,
              rawError: execResult.errorOutput,
              codeSnapshot: code,
              errorLine: extractErrorLine(execResult.errorOutput),
            });
          } catch (debugErr: any) {
            let aiExplanationMessage = `L'assistant IA n'a pas pu fournir d'explication. Erreur brute:\n${execResult.errorOutput}`;
            if (isAIServiceError(debugErr.message)) {
              toast({
                title: "Service IA Indisponible",
                description: "L'assistant IA est temporairement surchargé pour l'explication. Veuillez réessayer plus tard.",
                variant: "destructive",
              });
              aiExplanationMessage = "L'assistant IA est temporairement indisponible pour fournir une explication en raison d'une surcharge. Veuillez réessayer plus tard.";
            } else {
               toast({
                title: "Erreur de l'Assistant IA",
                description: "Impossible d'obtenir l'explication de l'erreur. Affichage de l'erreur brute.",
                variant: "destructive",
              });
            }
            setErrorForDialog({
              title: "Erreur d'Exécution",
              aiExplanation: aiExplanationMessage,
              rawError: execResult.errorOutput,
              codeSnapshot: code,
              errorLine: extractErrorLine(execResult.errorOutput),
            });
          } finally {
            setIsFetchingExplanation(false);
            setErrorDialogIsOpen(true); 
          }
          break; 
        } else if (execResult.successOutput !== null) {
          // If the test expects an error but code succeeded, it's a fail
          const expectedIsError = testCase.expectedOutput.trim().toUpperCase() === 'ERROR';
          if (expectedIsError) {
            allTestsPassedOverall = false;
            currentTestRunResults.push({
              ...testCase,
              actualOutput: execResult.successOutput,
              passed: false,
            });
            setTestResults([...currentTestRunResults]);
            continue;
          }
          const actualRaw = execResult.successOutput;
          const actual = normalizeForCompare(actualRaw);
          const expected = normalizeForCompare(testCase.expectedOutput);
          // Pass if exact on normalized last line OR if the full stdout contains expected
          const passed = actual === expected || actualRaw.includes(expected);
          if (!passed) {
            allTestsPassedOverall = false;
          }
          currentTestRunResults.push({
            ...testCase,
            actualOutput: actualRaw,
            passed,
          });
        } else { 
          anErrorOccurred = true;
          allTestsPassedOverall = false;
          currentTestRunResults.push({
            ...testCase,
            actualOutput: "Sortie IA Invalide (null)",
            passed: false,
          });
           setErrorForDialog({
              title: "Erreur de Simulation IA",
              aiExplanation: "L'IA n'a pas pu simuler l'exécution ou le format de la réponse était incorrect.",
              codeSnapshot: code,
            });
            setErrorDialogIsOpen(true);
        }
        setTestResults([...currentTestRunResults]);

      } catch (err: any) { 
        anErrorOccurred = true;
        allTestsPassedOverall = false;
        const errorMsg = err.message || "Une erreur inattendue s'est produite.";
        let dialogTitle = `Erreur Système dans le Test : ${testCase.name}`;
        let dialogExplanation = errorMsg;

        if (isAIServiceError(errorMsg)) {
          toast({
            title: "Service IA Indisponible",
            description: "La simulation du code a échoué car le service IA est temporairement surchargé. Veuillez réessayer plus tard.",
            variant: "destructive",
          });
          dialogTitle = "Erreur de Simulation IA";
          dialogExplanation = "La simulation de votre code n'a pas pu être effectuée car le service IA est actuellement surchargé. Veuillez réessayer dans quelques instants.";
           currentTestRunResults.push({
            ...testCase,
            actualOutput: `ERREUR IA: Service surchargé`,
            passed: false,
          });
        } else {
            toast({
            title: dialogTitle,
            description: errorMsg,
            variant: "destructive"
          });
          currentTestRunResults.push({
            ...testCase,
            actualOutput: `ERREUR SYSTÈME: ${errorMsg}`,
            passed: false,
          });
        }
        setTestResults([...currentTestRunResults]);
        setErrorForDialog({
            title: dialogTitle,
            aiExplanation: dialogExplanation,
            rawError: isAIServiceError(errorMsg) ? undefined : errorMsg,
            codeSnapshot: code,
          });
        setErrorDialogIsOpen(true);
        break;
      }
    }
    
    if (!anErrorOccurred) { 
        toast({
        title: "Exécution des Tests Terminée",
        description: `${currentTestRunResults.filter(r => r.passed).length}/${currentTestRunResults.length} tests réussis.`,
        variant: allTestsPassedOverall ? "default" : "destructive"
        });
    }
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
      if (isAIServiceError(error.message)) {
         toast({
          title: "Service IA Indisponible",
          description: "La génération de tests a échoué car le service IA est temporairement surchargé. Veuillez réessayer plus tard.",
          variant: "destructive",
        });
      } else {
        toast({ title: 'Erreur de Génération IA', description: error.message || 'Une erreur inconnue est survenue.', variant: 'destructive' });
      }
    } finally {
      setIsGeneratingTests(false);
    }
  }, [code, toast]);


  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        if (!isProcessing && !isGeneratingTests && !isFetchingExplanation) { 
          handleRunTests();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleRunTests, isProcessing, isGeneratingTests, isFetchingExplanation]);


  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-sans overflow-hidden">
      <Toolbar
        onRunTests={handleRunTests}
        onImportFile={handleImportFile}
        onExportFile={handleExportFile}
        fileName={fileName}
        onFileNameChange={setFileName}
        isProcessing={isProcessing || isGeneratingTests || isFetchingExplanation}
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
                 isProcessing={isProcessing || isGeneratingTests || isFetchingExplanation}
                 codeIsEmpty={!code.trim()}
                 onDeleteAllTestCases={handleDeleteAllTestCases}
                 onGenerateTestCases={handleGenerateTestCases}
               />
            </Panel>
            <PanelResizeHandle className="h-px bg-border hover:bg-primary transition-colors data-[resize-handle-state=drag]:bg-primary my-1 self-stretch" />
            <Panel defaultSize={50} minSize={25} className="min-h-0 pt-1">
               <TestResultsPanel results={testResults} isTesting={isProcessing && testResults.length < userTestCases.length && userTestCases.length > 0 && !errorDialogIsOpen} />
            </Panel>
          </PanelGroup>
        </Panel>
      </PanelGroup>

      {errorForDialog && (
        <AlertDialog open={errorDialogIsOpen} onOpenChange={(isOpen) => {
          setErrorDialogIsOpen(isOpen);
          if (!isOpen) setErrorForDialog(null);
        }}>
          <AlertDialogContent className="max-w-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>{errorForDialog.title}</AlertDialogTitle>
            </AlertDialogHeader>
            <div className="mt-2 text-sm text-foreground space-y-4">
               {isFetchingExplanation && !errorForDialog.aiExplanation.startsWith("L'assistant IA est temporairement") && !errorForDialog.aiExplanation.startsWith("L'assistant IA n'a pas pu") ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-2">L'assistant IA prépare une explication...</p>
                </div>
              ) : (
                <>
                  <p className="font-semibold">Explication de l'IA :</p>
                  <ScrollArea className="h-auto max-h-40 w-full rounded-md border p-3 bg-muted/50">
                    <p className="text-sm whitespace-pre-wrap break-words font-sans">
                      {errorForDialog.aiExplanation}
                    </p>
                  </ScrollArea>
                </>
              )}
              {errorForDialog.codeSnapshot && (
                <>
                  <p className="font-semibold pt-2">Code Concerné:</p>
                  <ScrollArea className="h-40 w-full rounded-md border p-2 bg-muted/50">
                    <pre className="text-xs whitespace-pre-wrap break-all font-mono">
                      {errorForDialog.codeSnapshot.split('\n').map((ln, idx) => {
                        const lineNo = idx + 1;
                        const isErr = errorForDialog.errorLine && lineNo === errorForDialog.errorLine;
                        const numClass = isErr ? 'text-red-600 font-semibold' : 'text-muted-foreground';
                        const lineClass = isErr ? 'bg-red-500/10 rounded px-1 -mx-1 ring-1 ring-red-500/30' : undefined;
                        return (
                          <div key={idx} ref={isErr ? errorLineRef : undefined} className={lineClass}>
                            <span className={`${numClass} select-none mr-2`}>{`${lineNo}-`}</span>
                            <span>{ln}</span>
                            {isErr && (
                              <span className="ml-2 text-red-600 font-semibold">← erreur ici</span>
                            )}
                          </div>
                        );
                      })}
                    </pre>
                  </ScrollArea>
                </>
              )}
               {errorForDialog.rawError && !errorForDialog.aiExplanation.includes(errorForDialog.rawError) && (
                <>
                  <p className="font-semibold pt-2 text-xs text-muted-foreground">Erreur brute (pour référence):</p>
                  <ScrollArea className="h-20 w-full rounded-md border p-2 bg-muted/20">
                    <pre className="text-xs whitespace-pre-wrap break-all font-mono">
                      {errorForDialog.rawError}
                    </pre>
                  </ScrollArea>
                </>
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => {setErrorDialogIsOpen(false); setErrorForDialog(null);}} disabled={isFetchingExplanation}>
                Fermer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
