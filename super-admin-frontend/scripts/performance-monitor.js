#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Performance monitoring script for the Super Admin Dashboard
 * This script analyzes build output and provides performance insights
 */

const PERFORMANCE_THRESHOLDS = {
  bundleSize: 1024 * 1024, // 1MB
  chunkSize: 500 * 1024,   // 500KB
  assetSize: 100 * 1024,   // 100KB
  totalAssets: 50,         // Maximum number of assets
};

function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function analyzeBuildOutput() {
  const distPath = path.join(__dirname, '../dist');
  
  if (!fs.existsSync(distPath)) {
    console.error('❌ Build output not found. Run "npm run build" first.');
    process.exit(1);
  }

  console.log('🔍 Analyzing build output...\n');

  const results = {
    totalSize: 0,
    jsFiles: [],
    cssFiles: [],
    assets: [],
    warnings: [],
    recommendations: [],
  };

  function analyzeDirectory(dir, relativePath = '') {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);
      const relativeFilePath = path.join(relativePath, file);
      
      if (stats.isDirectory()) {
        analyzeDirectory(filePath, relativeFilePath);
      } else {
        const size = stats.size;
        results.totalSize += size;
        
        const ext = path.extname(file).toLowerCase();
        const fileInfo = {
          name: relativeFilePath,
          size,
          formattedSize: formatSize(size),
        };
        
        if (ext === '.js') {
          results.jsFiles.push(fileInfo);
          
          // Check for large JS chunks
          if (size > PERFORMANCE_THRESHOLDS.chunkSize) {
            results.warnings.push(`Large JS chunk: ${relativeFilePath} (${formatSize(size)})`);
          }
        } else if (ext === '.css') {
          results.cssFiles.push(fileInfo);
        } else {
          results.assets.push(fileInfo);
          
          // Check for large assets
          if (size > PERFORMANCE_THRESHOLDS.assetSize) {
            results.warnings.push(`Large asset: ${relativeFilePath} (${formatSize(size)})`);
          }
        }
      }
    });
  }

  analyzeDirectory(distPath);

  // Sort files by size (largest first)
  results.jsFiles.sort((a, b) => b.size - a.size);
  results.cssFiles.sort((a, b) => b.size - a.size);
  results.assets.sort((a, b) => b.size - a.size);

  return results;
}

function generateRecommendations(results) {
  const recommendations = [];

  // Bundle size recommendations
  if (results.totalSize > PERFORMANCE_THRESHOLDS.bundleSize) {
    recommendations.push({
      type: 'warning',
      message: `Total bundle size (${formatSize(results.totalSize)}) exceeds recommended limit (${formatSize(PERFORMANCE_THRESHOLDS.bundleSize)})`,
      suggestions: [
        'Consider code splitting for large components',
        'Remove unused dependencies',
        'Use dynamic imports for non-critical features',
        'Optimize images and compress assets',
      ],
    });
  }

  // JS chunk recommendations
  const largeJsFiles = results.jsFiles.filter(f => f.size > PERFORMANCE_THRESHOLDS.chunkSize);
  if (largeJsFiles.length > 0) {
    recommendations.push({
      type: 'info',
      message: `${largeJsFiles.length} large JavaScript chunks detected`,
      suggestions: [
        'Split large components into smaller chunks',
        'Use React.lazy() for component-level code splitting',
        'Move vendor libraries to separate chunks',
      ],
    });
  }

  // Asset recommendations
  if (results.assets.length > PERFORMANCE_THRESHOLDS.totalAssets) {
    recommendations.push({
      type: 'info',
      message: `High number of assets (${results.assets.length})`,
      suggestions: [
        'Combine small assets where possible',
        'Use CSS sprites for icons',
        'Consider using a CDN for static assets',
      ],
    });
  }

  // Performance best practices
  recommendations.push({
    type: 'tip',
    message: 'Performance optimization tips',
    suggestions: [
      'Enable gzip compression on your server',
      'Use HTTP/2 for better multiplexing',
      'Implement proper caching headers',
      'Consider using a service worker for caching',
      'Monitor Core Web Vitals in production',
    ],
  });

  return recommendations;
}

function printReport(results) {
  console.log('📊 Performance Analysis Report');
  console.log('================================\n');

  // Summary
  console.log('📈 Summary:');
  console.log(`   Total Size: ${formatSize(results.totalSize)}`);
  console.log(`   JS Files: ${results.jsFiles.length}`);
  console.log(`   CSS Files: ${results.cssFiles.length}`);
  console.log(`   Assets: ${results.assets.length}\n`);

  // JavaScript files
  if (results.jsFiles.length > 0) {
    console.log('📄 JavaScript Files:');
    results.jsFiles.slice(0, 10).forEach(file => {
      const indicator = file.size > PERFORMANCE_THRESHOLDS.chunkSize ? '⚠️ ' : '✅ ';
      console.log(`   ${indicator}${file.name} - ${file.formattedSize}`);
    });
    if (results.jsFiles.length > 10) {
      console.log(`   ... and ${results.jsFiles.length - 10} more files`);
    }
    console.log();
  }

  // CSS files
  if (results.cssFiles.length > 0) {
    console.log('🎨 CSS Files:');
    results.cssFiles.forEach(file => {
      console.log(`   ✅ ${file.name} - ${file.formattedSize}`);
    });
    console.log();
  }

  // Warnings
  if (results.warnings.length > 0) {
    console.log('⚠️  Warnings:');
    results.warnings.forEach(warning => {
      console.log(`   • ${warning}`);
    });
    console.log();
  }

  // Recommendations
  const recommendations = generateRecommendations(results);
  if (recommendations.length > 0) {
    console.log('💡 Recommendations:');
    recommendations.forEach(rec => {
      const icon = rec.type === 'warning' ? '⚠️' : rec.type === 'info' ? 'ℹ️' : '💡';
      console.log(`\n   ${icon} ${rec.message}:`);
      rec.suggestions.forEach(suggestion => {
        console.log(`      • ${suggestion}`);
      });
    });
    console.log();
  }

  // Performance score
  let score = 100;
  if (results.totalSize > PERFORMANCE_THRESHOLDS.bundleSize) score -= 20;
  if (results.warnings.length > 0) score -= results.warnings.length * 5;
  if (results.jsFiles.length > 10) score -= 10;

  score = Math.max(0, score);
  const scoreColor = score >= 80 ? '🟢' : score >= 60 ? '🟡' : '🔴';
  
  console.log(`${scoreColor} Performance Score: ${score}/100\n`);

  // Next steps
  console.log('🚀 Next Steps:');
  console.log('   1. Run "npm run build:analyze" to see detailed bundle analysis');
  console.log('   2. Use "npm run test:performance" to run performance tests');
  console.log('   3. Monitor performance in production with Web Vitals');
  console.log('   4. Consider implementing performance budgets in CI/CD\n');
}

function checkDependencies() {
  console.log('🔧 Checking performance monitoring setup...\n');

  const packageJsonPath = path.join(__dirname, '../package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  const requiredDeps = [
    'rollup-plugin-visualizer',
    'web-vitals',
  ];

  const missingDeps = requiredDeps.filter(dep => 
    !packageJson.devDependencies?.[dep] && !packageJson.dependencies?.[dep]
  );

  if (missingDeps.length > 0) {
    console.log('❌ Missing performance monitoring dependencies:');
    missingDeps.forEach(dep => console.log(`   • ${dep}`));
    console.log('\nInstall them with:');
    console.log(`   npm install --save-dev ${missingDeps.join(' ')}\n`);
    return false;
  }

  console.log('✅ All performance monitoring dependencies are installed\n');
  return true;
}

function main() {
  console.log('🎯 Super Admin Dashboard Performance Monitor\n');

  // Check dependencies
  if (!checkDependencies()) {
    process.exit(1);
  }

  // Analyze build output
  const results = analyzeBuildOutput();
  printReport(results);

  // Generate performance report file
  const reportPath = path.join(__dirname, '../performance-reports');
  if (!fs.existsSync(reportPath)) {
    fs.mkdirSync(reportPath, { recursive: true });
  }

  const reportFile = path.join(reportPath, `performance-report-${Date.now()}.json`);
  fs.writeFileSync(reportFile, JSON.stringify({
    timestamp: new Date().toISOString(),
    results,
    recommendations: generateRecommendations(results),
  }, null, 2));

  console.log(`📋 Detailed report saved to: ${reportFile}`);
}

if (require.main === module) {
  main();
}

module.exports = {
  analyzeBuildOutput,
  generateRecommendations,
  formatSize,
};