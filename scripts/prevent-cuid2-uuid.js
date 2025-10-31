#!/usr/bin/env node

// Script to prevent cuid2 and uuid packages from being reintroduced
// This script checks for the presence of these packages in the codebase
// and fails if they are found

const fs = require('fs');
const path = require('path');

const forbiddenPackages = ['@paralleldrive/cuid2', 'uuid'];
const forbiddenPatterns = ['require\\(["\']@paralleldrive/cuid2["\']\\)', 'require\\(["\']uuid["\']\\)'];

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  for (const pattern of forbiddenPatterns) {
    const regex = new RegExp(pattern);
    if (regex.test(content)) {
      console.error(`Forbidden package pattern found in ${filePath}: ${pattern}`);
      process.exit(1);
    }
  }
}

function checkDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);
  
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      checkDirectory(filePath);
    } else if (stat.isFile() && (file.endsWith('.js') || file.endsWith('.ts') || file.endsWith('.jsx') || file.endsWith('.tsx'))) {
      checkFile(filePath);
    }
  }
}

// Check package.json for forbidden dependencies
const packageJsonPath = path.join(__dirname, '..', 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  for (const pkg of forbiddenPackages) {
    if ((packageJson.dependencies && packageJson.dependencies[pkg]) || 
        (packageJson.devDependencies && packageJson.devDependencies[pkg])) {
      console.error(`Forbidden package found in package.json: ${pkg}`);
      process.exit(1);
    }
  }
}

// Check source files for forbidden patterns
try {
  checkDirectory(path.join(__dirname, '..', 'src'));
  checkDirectory(path.join(__dirname, '..', 'server'));
  checkDirectory(path.join(__dirname, '..', 'tests'));
  
  console.log('No forbidden packages or patterns found.');
  process.exit(0);
} catch (error) {
  console.error('Error checking for forbidden packages:', error.message);
  process.exit(1);
}