import { describe, it, expect } from 'vitest';
import { queryClient } from '../lib/queryClient';

describe('QueryClient Global Configuration', () => {
  it('should have staleTime set to 0', () => {
    const defaultOptions = queryClient.getDefaultOptions();
    expect(defaultOptions.queries?.staleTime).toBe(0);
  });

  it('should have retry set to 1', () => {
    const defaultOptions = queryClient.getDefaultOptions();
    expect(defaultOptions.queries?.retry).toBe(1);
  });
});
