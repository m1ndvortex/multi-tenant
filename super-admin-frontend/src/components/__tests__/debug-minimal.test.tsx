import React from 'react';

// Minimal component to test if the issue is with the component structure
const TestComponent: React.FC<{ test?: string }> = ({ test }) => {
  return <div>Test: {test}</div>;
};

export { TestComponent };

describe('Debug Minimal Component', () => {
  it('should export component correctly', () => {
    expect(TestComponent).toBeDefined();
    expect(typeof TestComponent).toBe('function');
  });
});