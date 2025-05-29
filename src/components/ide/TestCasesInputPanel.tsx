
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Trash2, MinusCircle } from 'lucide-react';
import type { TestCase } from '@/app/page';

interface TestCasesInputPanelProps {
  testCases: TestCase[];
  onTestCasesChange: (testCases: TestCase[]) => void;
  isProcessing: boolean;
}

export function TestCasesInputPanel({ testCases, onTestCasesChange, isProcessing }: TestCasesInputPanelProps) {
  const handleAddTestCase = () => {
    const newTestCase: TestCase = {
      id: Date.now().toString(),
      name: `Cas de Test ${testCases.length + 1}`,
      inputs: [''], // Start with one empty input line
      expectedOutput: '',
    };
    onTestCasesChange([...testCases, newTestCase]);
  };

  const handleRemoveTestCase = (id: string) => {
    onTestCasesChange(testCases.filter(tc => tc.id !== id));
  };

  const handleTestCaseNameChange = (id: string, value: string) => {
    onTestCasesChange(
      testCases.map(tc => (tc.id === id ? { ...tc, name: value } : tc))
    );
  };
  
  const handleTestCaseExpectedOutputChange = (id: string, value: string) => {
    onTestCasesChange(
      testCases.map(tc => (tc.id === id ? { ...tc, expectedOutput: value } : tc))
    );
  };

  const handleAddInputLine = (testCaseId: string) => {
    onTestCasesChange(
      testCases.map(tc =>
        tc.id === testCaseId ? { ...tc, inputs: [...tc.inputs, ''] } : tc
      )
    );
  };

  const handleRemoveInputLine = (testCaseId: string, inputIndex: number) => {
    onTestCasesChange(
      testCases.map(tc =>
        tc.id === testCaseId
          ? { ...tc, inputs: tc.inputs.filter((_, idx) => idx !== inputIndex) }
          : tc
      )
    );
  };

  const handleInputChange = (testCaseId: string, inputIndex: number, value: string) => {
    onTestCasesChange(
      testCases.map(tc =>
        tc.id === testCaseId
          ? {
              ...tc,
              inputs: tc.inputs.map((input, idx) =>
                idx === inputIndex ? value : input
              ),
            }
          : tc
      )
    );
  };


  return (
    <Card className="h-full flex flex-col shadow-lg overflow-hidden">
      <CardHeader className="p-3 border-b">
        <CardTitle className="text-lg">Définir les Cas de Test</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-3">
        {testCases.length === 0 && (
          <div className="text-center text-muted-foreground py-4">
            Aucun cas de test défini. Cliquez sur "Ajouter un Cas de Test" pour commencer.
          </div>
        )}
        {testCases.map((testCase, index) => (
          <div key={testCase.id} className="mb-4 p-3 border rounded-md bg-card-foreground/5">
            <div className="flex justify-between items-center mb-2">
              <Input
                placeholder={`Nom du Cas de Test ${index + 1}`}
                value={testCase.name}
                onChange={(e) => handleTestCaseNameChange(testCase.id, e.target.value)}
                className="text-sm font-medium flex-grow mr-2 bg-background"
                disabled={isProcessing}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveTestCase(testCase.id)}
                disabled={isProcessing}
                title="Supprimer le Cas de Test"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-1 mb-2">
              <label className="text-xs font-medium text-muted-foreground">Entrées (chaque ligne pour un `input()`):</label>
              {testCase.inputs.map((inputValue, inputIndex) => (
                <div key={inputIndex} className="flex items-center gap-1">
                  <Input
                    placeholder={`Ligne d'entrée ${inputIndex + 1}`}
                    value={inputValue}
                    onChange={(e) => handleInputChange(testCase.id, inputIndex, e.target.value)}
                    className="text-xs font-mono bg-background flex-grow"
                    disabled={isProcessing}
                  />
                   {testCase.inputs.length > 1 && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleRemoveInputLine(testCase.id, inputIndex)} 
                      disabled={isProcessing}
                      title="Supprimer cette ligne d'entrée"
                      className="text-destructive/70 hover:text-destructive hover:bg-destructive/10 p-1 h-auto w-auto"
                    >
                      <MinusCircle className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
              <Button 
                onClick={() => handleAddInputLine(testCase.id)} 
                variant="outline" 
                size="xs" // smaller button
                className="mt-1 text-xs py-0.5 px-1.5 h-auto" // compact styling
                disabled={isProcessing}
              >
                <PlusCircle className="mr-1 h-3 w-3" /> Ajouter une ligne d'entrée
              </Button>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground">Sortie Attendue:</label>
              <Textarea
                placeholder="Sortie Attendue"
                value={testCase.expectedOutput}
                onChange={(e) => handleTestCaseExpectedOutputChange(testCase.id, e.target.value)}
                className="text-xs font-mono bg-background"
                rows={2}
                disabled={isProcessing}
              />
            </div>
          </div>
        ))}
        <Button onClick={handleAddTestCase} variant="outline" size="sm" className="mt-2 w-full" disabled={isProcessing}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Ajouter un Cas de Test
        </Button>
      </CardContent>
    </Card>
  );
}
