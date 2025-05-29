
"use client";

import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  // Initialize theme state to undefined to prevent flash of wrong theme
  const [theme, setTheme] = useState<'light' | 'dark' | undefined>(undefined);

  useEffect(() => {
    // This effect runs once on mount to set the initial theme
    const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    let initialTheme: 'light' | 'dark';

    if (storedTheme) {
      initialTheme = storedTheme;
    } else if (systemPrefersDark) {
      initialTheme = 'dark';
    } else {
      initialTheme = 'light'; // Default to light
    }
    
    setTheme(initialTheme);
    // Apply class immediately after determining initial theme
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    // Persist if it was determined by system preference and not already stored
    if (!storedTheme) {
        localStorage.setItem('theme', initialTheme);
    }

  }, []); // Empty dependency array means this runs once on mount

  useEffect(() => {
    // This effect runs when theme state changes (e.g., by toggle),
    // but only after initial theme has been set.
    if (theme === undefined) return; 

    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]); // Run when theme state changes

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  // Avoid rendering the button until theme is determined to prevent icon flash or show a placeholder
  if (theme === undefined) {
    // Render a disabled button or a skeleton as a placeholder
    return <Button variant="ghost" size="sm" aria-label="Toggle theme" disabled className="h-9 w-9 p-0" />;
  }

  return (
    <Button variant="ghost" size="sm" onClick={toggleTheme} aria-label="Toggle theme" className="h-9 w-9 p-0">
      {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
