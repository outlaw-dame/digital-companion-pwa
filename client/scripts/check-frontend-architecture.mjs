#!/usr/bin/env node
/**
 * Frontend Architecture Check Script
 * 
 * Phase 11: Enforces architecture contract rules
 * 
 * Checks:
 * 1. Konsta is blocked everywhere
 * 2. Raw Framework7 imports only in design/semantic/
 * 3. Raw Capacitor imports only in platform/
 * 4. Raw Iconoir imports only in design/icons/ and AppIcon
 * 5. Optional: Sensitive logging patterns
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Configuration
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const FRONTEND_ROOT = resolve(__dirname, '..');
const SRC_ROOT = resolve(FRONTEND_ROOT, 'src');

// Colors for output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

// Log helpers
const log = {
  error: (msg) => console.error(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  warn: (msg) => console.warn(`${colors.yellow}[WARN]${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bold}${colors.cyan}${msg}${colors.reset}`),
};

// Track results
let exitCode = 0;
let violations = 0;
let warnings = 0;

// ========================================================================
// CHECK DEFINITIONS
// ========================================================================

const checks = [
  {
    id: 'konsta-blocked',
    name: 'Konsta imports blocked',
    description: 'Konsta should not be imported anywhere in the codebase',
    patterns: [
      { pattern: /from ['"]konsta['"]/, message: 'Konsta import detected' },
      { pattern: /from ['"]konsta\/vue['"]/, message: 'Konsta Vue import detected' },
      { pattern: /require\(['"]konsta['"]\)/, message: 'Konsta require detected' },
      { pattern: /import.*konsta/, message: 'Konsta import detected' },
    ],
    severity: 'error',
    exclude: [],
  },
  {
    id: 'framework7-import-boundary',
    name: 'Framework7 import boundaries',
    description: 'Raw Framework7 imports only allowed in design/semantic/',
    patterns: [
      { pattern: /from ['"]framework7['"]/, message: 'Raw framework7 import detected' },
      { pattern: /from ['"]framework7-vue['"]/, message: 'Raw framework7-vue import detected' },
      { pattern: /from ['"]framework7\//, message: 'Raw framework7 submodule import detected' },
      { pattern: /from ['"]framework7-vue\//, message: 'Raw framework7-vue submodule import detected' },
    ],
    severity: 'error',
    exclude: [
      'frontend/src/design/semantic/',
      'frontend/src/design/framework7/',
    ],
  },
  {
    id: 'capacitor-import-boundary',
    name: 'Capacitor import boundaries',
    description: 'Raw Capacitor imports only allowed in platform/ and composables/',
    patterns: [
      { pattern: /from ['"]@capacitor\//, message: 'Raw Capacitor import detected' },
    ],
    severity: 'error',
    exclude: [
      'frontend/src/platform/',
      'frontend/src/composables/',
    ],
  },
  {
    id: 'iconoir-import-boundary',
    name: 'Iconoir import boundaries',
    description: 'Raw Iconoir imports only allowed in design/icons/ and AppIcon',
    patterns: [
      { pattern: /from ['"]@iconoir\//, message: 'Raw Iconoir import detected' },
    ],
    severity: 'error',
    exclude: [
      'frontend/src/design/icons/',
      'frontend/src/components/AppIcon.vue',
    ],
  },
  {
    id: 'sensitive-logging',
    name: 'Sensitive data in logging',
    description: 'Check for sensitive data being logged',
    patterns: [
      { pattern: /console\.log\(.*(password|token|secret|auth|apiKey|privateKey|accessToken|refreshToken)/i, message: 'Potential sensitive data in console.log' },
      { pattern: /console\.error\(.*(password|token|secret|auth|apiKey|privateKey|accessToken|refreshToken)/i, message: 'Potential sensitive data in console.error' },
      { pattern: /console\.warn\(.*(password|token|secret|auth|apiKey|privateKey|accessToken|refreshToken)/i, message: 'Potential sensitive data in console.warn' },
      { pattern: /console\.log\(.*(body|payload|message|draft|content)/i, message: 'Potential user content in console.log' },
      { pattern: /JSON\.stringify\(.*(request|response|payload|body)/i, message: 'Potential sensitive data in JSON.stringify' },
    ],
    severity: 'warn',
    exclude: [
      'frontend/src/utils/logging.ts',
      'frontend/tests/',
    ],
  },
  {
    id: 'raw-console-calls',
    name: 'Raw console calls',
    description: 'Check for raw console calls (should use logging utility)',
    patterns: [
      { pattern: /console\.(log|warn|error|info|debug)\s*\(/g, message: 'Raw console call detected. Use logging utility instead' },
    ],
    severity: 'warn',
    exclude: [
      'frontend/src/utils/logging.ts',
      'frontend/tests/',
      'frontend/scripts/',
    ],
  },
];

// ========================================================================
// FILE COLLECTION
// ========================================================================

/**
 * Recursively collect all files matching patterns
 */
function collectFiles(dir, extensions = ['.js', '.ts', '.vue'], exclude = []) {
  const files = [];
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = resolve(dir, entry.name);
    
    // Skip node_modules and other excluded directories
    if (exclude.some(ex => fullPath.includes(ex))) {
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath, extensions, exclude));
    } else if (entry.isFile()) {
      const ext = entry.name.slice(entry.name.lastIndexOf('.'));
      if (extensions.includes(ext)) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

/**
 * Check if a file path is in one of the excluded directories
 */
function isExcluded(filePath, excludePatterns) {
  return excludePatterns.some(pattern => {
    const normalizedPattern = pattern.replace(/\*$/, '');
    const normalizedPath = filePath.replace(/\.(js|ts|vue)$/, '');
    return normalizedPath.includes(normalizedPattern) || 
           normalizedPath.startsWith(resolve(SRC_ROOT, normalizedPattern));
  });
}

/**
 * Normalize path for display
 */
function normalizePath(filePath) {
  return relative(FRONTEND_ROOT, filePath).replace(/\\/g, '/');
}

// ========================================================================
// PATTERN CHECKING
// ========================================================================

/**
 * Check file content against patterns
 */
function checkFile(filePath, check) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const relPath = normalizePath(filePath);

    for (const patternDef of check.patterns) {
      const matches = content.match(patternDef.pattern);
      if (matches) {
        // Check if file is in excluded directories
        if (isExcluded(filePath, check.exclude)) {
          continue;
        }

        for (let i = 0; i < matches.length; i++) {
          const lineNumber = content.substring(0, content.indexOf(matches[i])).split('\n').length;
          const contextLine = content.split('\n')[lineNumber - 1].trim();
          
          const violation = {
            file: relPath,
            line: lineNumber,
            rule: check.id,
            message: patternDef.message,
            context: contextLine,
            severity: check.severity,
          };

          if (check.severity === 'error') {
            violations++;
            log.error(`${relPath}:${lineNumber} - ${patternDef.message}`);
            log.warn(`  Context: ${contextLine}`);
          } else {
            warnings++;
            log.warn(`${relPath}:${lineNumber} - ${patternDef.message}`);
            log.info(`  Context: ${contextLine}`);
          }

          exitCode = 1;
        }
      }
    }
  } catch (err) {
    // File might not exist or be unreadable
    log.warn(`Could not read ${filePath}: ${err.message}`);
  }
}

// ========================================================================
// MAIN EXECUTION
// ========================================================================

function main() {
  log.header('='.repeat(60));
  log.header('Frontend Architecture Check - Phase 11');
  log.header('='.repeat(60));
  log.info(`Scanning: ${FRONTEND_ROOT}`);
  log.info(`Timestamp: ${new Date().toISOString()}`);
  log.header('-'.repeat(60));

  // Collect all source files
  log.info('Collecting source files...');
  const sourceFiles = collectFiles(SRC_ROOT, ['.js', '.ts', '.vue'], ['node_modules', 'dist']);
  log.info(`Found ${sourceFiles.length} source files`);

  // Run all checks
  log.header('-'.repeat(60));
  log.info('Running architecture checks...');
  log.header('-'.repeat(60));

  for (const check of checks) {
    log.info(`\n${colors.bold}Check: ${check.name}${colors.reset}`);
    log.info(`${colors.gray}${check.description}${colors.reset}`);

    let checkViolations = 0;
    let checkWarnings = 0;

    for (const filePath of sourceFiles) {
      const fileViolations = violations;
      const fileWarnings = warnings;
      
      checkFile(filePath, check);
      
      if (violations > fileViolations) {
        checkViolations += violations - fileViolations;
      }
      if (warnings > fileWarnings) {
        checkWarnings += warnings - fileWarnings;
      }
    }

    if (checkViolations === 0 && checkWarnings === 0) {
      log.success(`✓ PASS`);
    } else {
      log.error(`✗ FAIL - ${checkViolations} errors, ${checkWarnings} warnings`);
    }
  }

  // Summary
  log.header('='.repeat(60));
  log.header('SUMMARY');
  log.header('='.repeat(60));
  log.info(`Total files scanned: ${sourceFiles.length}`);
  log.info(`Errors found: ${violations}`);
  log.info(`Warnings found: ${warnings}`);

  if (exitCode === 0) {
    log.success('✓ All architecture checks passed!');
  } else {
    log.error('✗ Architecture checks failed!');
    log.info('\nFix the issues above and run again.');
    log.info('See docs/internal/frontend-architecture-contract.md for rules.');
  }

  log.header('='.repeat(60));
  
  process.exit(exitCode);
}

// Run with error handling
try {
  main();
} catch (err) {
  log.error(`Fatal error: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
}
