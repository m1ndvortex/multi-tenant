// Test without any mocks
import { ErrorTrendsChart } from '../ErrorTrendsChart';

describe('Debug No Mock', () => {
  it('should import ErrorTrendsChart without mocks', () => {
    console.log('ErrorTrendsChart:', ErrorTrendsChart);
    console.log('Type:', typeof ErrorTrendsChart);
    expect(ErrorTrendsChart).toBeDefined();
  });
});