import { ErrorTrends, ErrorSeverity } from '@/services/errorLoggingService';

describe('Debug Service Import', () => {
  it('should import service types correctly', () => {
    console.log('ErrorSeverity:', ErrorSeverity);
    expect(ErrorSeverity).toBeDefined();
  });
});