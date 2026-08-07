const catchment_area = 875.41;
const mmf = 1.12;
const clock_hour_corr = 1.15;
const loss_rate = 0.23;

// Mock UH ordinates (a subset or real one from Python verification)
// Let's use the real ones or print them. Actually, let's load the real UH ordinates from python.
// Let's first test the JS logic for generating bells and doing regression/convolution.

function get_arf_regression(duration, area) {
  const tables = {
    24: [[500,0.94],[1000,0.91],[1500,0.90],[2000,0.88],[3000,0.86],[4000,0.83],[5000,0.81]],
    48: [[500,0.95],[1000,0.92],[1500,0.91],[2000,0.89],[3000,0.87],[4000,0.85],[5000,0.83]],
    72: [[500,0.96],[1000,0.94],[1500,0.93],[2000,0.92],[3000,0.90],[4000,0.88],[5000,0.86]]
  };
  const T = tables[duration];
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  const n = T.length;
  for (let i = 0; i < n; i++) {
    const x = T[i][0];
    const y = T[i][1];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }
  const meanX = sumX / n;
  const meanY = sumY / n;
  const num = sumXY - n * meanX * meanY;
  const den = sumXX - n * meanX * meanX;
  const slope = num / den;
  const intercept = meanY - slope * meanX;
  return slope * area + intercept;
}

console.log("24-hr ARF:", get_arf_regression(24, catchment_area));
console.log("48-hr ARF:", get_arf_regression(48, catchment_area));
console.log("72-hr ARF:", get_arf_regression(72, catchment_area));
