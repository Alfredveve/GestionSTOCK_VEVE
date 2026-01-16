import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ThemeToggle } from './ThemeToggle';
import { ThemeProvider, useTheme } from '../ThemeProvider';

// Mock the ThemeProvider context if needed or just use it
describe('ThemeToggle', () => {
  it('should render the toggle button', () => {
    render(
      <ThemeProvider defaultTheme="light" storageKey="test-theme">
        <ThemeToggle />
      </ThemeProvider>
    );
    
    const button = screen.getByRole('button');
    expect(button).toBeDefined();
  });

  it('should change theme when clicked', () => {
    render(
      <ThemeProvider defaultTheme="light" storageKey="test-theme">
        <ThemeToggle />
      </ThemeProvider>
    );
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    // Check if the html has the 'dark' class
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
