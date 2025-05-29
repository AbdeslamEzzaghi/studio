
"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, XCircle, HelpCircle, Loader2 } from 'lucide-react';
import type { TestResult } from '@/app/page'; 

interface TestResultsPanelProps {
  results: TestResult[];
  isTesting: boolean;
}

export function TestResultsPanel({ results, isTesting }: TestResultsPanelProps) {
  return (
    <Card className="h-full flex flex-col shadow-lg overflow-hidden">
      <CardHeader className="p-3 border-b flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" />
          Résultats des Tests
        </CardTitle>
        {isTesting && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        {results.length === 0 && !isTesting ? (
          <p className="p-4 text-sm text-muted-foreground">Exécutez le code pour voir les résultats des tests ici.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Statut</TableHead>
                <TableHead>Cas de Test</TableHead>
                <TableHead>Entrée(s)</TableHead>
                <TableHead>Attendu</TableHead>
                <TableHead>Réel</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result) => (
                <TableRow key={result.id}>
                  <TableCell>
                    {result.passed ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{result.name}</TableCell>
                  <TableCell>
                    <pre className="whitespace-pre-wrap text-xs">
                      {result.inputs.map((inp, i) => `Ligne ${i+1}: "${inp}"`).join('\n') || 'N/A'}
                    </pre>
                  </TableCell>
                  <TableCell><pre className="whitespace-pre-wrap text-xs">{result.expectedOutput}</pre></TableCell>
                  <TableCell><pre className="whitespace-pre-wrap text-xs">{result.actualOutput}</pre></TableCell>
                </TableRow>
              ))}
              {isTesting && results.length === 0 && (
                 Array.from({ length: 2 }).map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    <TableCell><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></TableCell>
                    <TableCell className="text-muted-foreground">En cours...</TableCell>
                    <TableCell className="text-muted-foreground">...</TableCell>
                    <TableCell className="text-muted-foreground">...</TableCell>
                    <TableCell className="text-muted-foreground">...</TableCell>
                  </TableRow>
                 ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
