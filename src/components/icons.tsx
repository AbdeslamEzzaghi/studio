"use client";

import { Code2 } from 'lucide-react';

export function CodeMuseLogo() {
  return (
    <div className="flex items-center gap-2 text-primary">
      <Code2 className="h-8 w-8" />
      <h1 className="text-2xl font-bold text-foreground">CodeMuse</h1>
    </div>
  );
}
