import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from '@/components/ErrorBoundary';
import React from 'react';

function ThrowingChild(): React.ReactNode {
  throw new Error('Test error');
}

function GoodChild() {
  return <div>All good</div>;
}

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary name="Test">
        <GoodChild />
      </ErrorBoundary>
    );
    expect(screen.getByText('All good')).toBeTruthy();
  });

  it('catches errors and shows fallback', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    render(
      <ErrorBoundary name="TestComponent">
        <ThrowingChild />
      </ErrorBoundary>
    );
    
    expect(screen.getByText(/Something went wrong/i)).toBeTruthy();
    expect(screen.getByText(/Test error/i)).toBeTruthy();
    consoleSpy.mockRestore();
  });
});
