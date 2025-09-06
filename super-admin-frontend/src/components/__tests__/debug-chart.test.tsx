// Test Chart.js imports
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

describe('Debug Chart Import', () => {
  it('should import chart components correctly', () => {
    console.log('ChartJS:', typeof ChartJS);
    console.log('Line:', typeof Line);
    console.log('Bar:', typeof Bar);
    expect(ChartJS).toBeDefined();
    expect(Line).toBeDefined();
    expect(Bar).toBeDefined();
  });
});