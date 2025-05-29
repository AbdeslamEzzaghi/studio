
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PlusCircle, Trash2 } from 'lucide-react';
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
      name: `Test Case ${testCases.length + 1}`,
      input: '',
      expectedOutput: '',
    };
    onTestCasesChange([...testCases, newTestCase]);
  };

  const handleRemoveTestCase = (id: string) => {
    onTestCasesChange(testCases.filter(tc => tc.id !== id));
  };

  const handleTestCaseChange = (id: string, field: keyof TestCase, value: string) => {
    onTestCasesChange(
      testCases.map(tc => (tc.id === id ? { ...tc, [field]: value } : tc))
    );
  };

  return (
    <Card className="flex-1 flex flex-col shadow-lg">
      <CardHeader className="p-3 border-b">
        <CardTitle className="text-lg">Define Test Cases</CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1">
        <ScrollArea className="h-full w-full p-3">
          {testCases.length === 0 && (
            <div className="text-center text-muted-foreground py-4">
              No test cases defined. Click "Add Test Case" to begin.
            </div>
          )}
          {testCases.map((testCase, index) => (
            <div key={testCase.id} className="mb-4 p-3 border rounded-md bg-card-foreground/5">
              <div className="flex justify-between items-center mb-2">
                <Input
                  placeholder={`Test Case ${index + 1} Name`}
                  value={testCase.name}
                  onChange={(e) => handleTestCaseChange(testCase.id, 'name', e.target.value)}
                  className="text-sm font-medium flex-grow mr-2 bg-background"
                  disabled={isProcessing}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveTestCase(testCase.id)}
                  disabled={isProcessing}
                  title="Remove Test Case"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                <Textarea
                  placeholder="Test Input (simulates user input for input())"
                  value={testCase.input}
                  onChange={(e) => handleTestCaseChange(testCase.id, 'input', e.target.value)}
                  className="text-xs font-mono bg-background"
                  rows={2}
                  disabled={isProcessing}
                />
                <Textarea
                  placeholder="Expected Output"
                  value={testCase.expectedOutput}
                  onChange={(e) => handleTestCaseChange(testCase.id, 'expectedOutput', e.target.value)}
                  className="text-xs font-mono bg-background"
                  rows={2}
                  disabled={isProcessing}
                />
              </div>
            </div>
          ))}
          <Button onClick={handleAddTestCase} variant="outline" size="sm" className="mt-2 w-full" disabled={isProcessing}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Test Case
          </Button>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
