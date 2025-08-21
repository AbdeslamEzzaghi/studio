
"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, HelpCircle, Loader2, MessageCircle } from 'lucide-react';
import type { TestResult } from '@/app/page'; 

interface TestResultsPanelProps {
  results: TestResult[];
  isTesting: boolean;
  onRequestExplanation?: (testResult: TestResult) => void;
}

export function TestResultsPanel({ results, isTesting, onRequestExplanation }: TestResultsPanelProps) {
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
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((result) => (
                <>
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
                    <TableCell>
                      {!result.passed && onRequestExplanation && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onRequestExplanation(result)}
                          disabled={result.isLoadingExplanation}
                          className="text-xs"
                        >
                          {result.isLoadingExplanation ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Analyse...
                            </>
                          ) : (
                            <>
                              <MessageCircle className="h-3 w-3 mr-1" />
                              Voir plus
                            </>
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  {!result.passed && result.failureExplanation && (
                    <TableRow key={`${result.id}-explanation`}>
                      <TableCell colSpan={6} className="bg-muted/50 p-4">
                        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3">
                          <div className="flex items-start gap-2">
                            <MessageCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                            <div className="text-sm text-yellow-800">
                              <p className="font-medium mb-1">Explication de l'échec :</p>
                              <p className="whitespace-pre-wrap">{result.failureExplanation}</p>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
              {isTesting && results.length === 0 && (
                 Array.from({ length: 2 }).map((_, index) => (
                  <TableRow key={`skeleton-${index}`}>
                    <TableCell><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></TableCell>
                    <TableCell className="text-muted-foreground">En cours...</TableCell>
                    <TableCell className="text-muted-foreground">...</TableCell>
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
