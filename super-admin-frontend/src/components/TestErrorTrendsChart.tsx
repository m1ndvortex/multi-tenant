import React from 'react';

interface TestProps {
  test?: string;
}

export const TestErrorTrendsChart: React.FC<TestProps> = ({ test }) => {
  return <div>Test component: {test}</div>;
};