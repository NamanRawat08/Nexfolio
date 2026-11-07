import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '../../components/ui/Button.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';

/** Header button that switches between the light and dark theme. */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const label = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
  const Icon = theme === 'dark' ? Sun : Moon;

  return (
    <Button variant="outline" size="icon" onClick={toggle} title={label} aria-label={label} className="text-muted">
      <Icon className="w-4 h-4" aria-hidden="true" />
    </Button>
  );
}
