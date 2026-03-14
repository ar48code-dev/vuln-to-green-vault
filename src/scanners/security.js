/**
 * Security Scanner — Real code analysis engine
 * Scans code for common vulnerabilities using pattern-based detection
 */

class SecurityScanner {
  constructor() {
    this.rules = this._buildRules();
  }

  _buildRules() {
    return [
      // ─── SQL INJECTION ───
      {
        id: 'SQLI-001',
        name: 'SQL Injection (String Concatenation)',
        severity: 'CRITICAL',
        category: 'sql-injection',
        cwe: 'CWE-89',
        pattern: /(?:SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC)\s+.*?[\+\`\$\{].*?(?:req\.|request\.|params\.|body\.|query\.|input|user)/gi,
        languages: ['javascript', 'typescript', 'python', 'ruby', 'php', 'java'],
        description: 'User input is directly concatenated into SQL query strings, allowing attackers to execute arbitrary SQL commands.',
        fix: 'Use parameterized queries or prepared statements instead of string concatenation.'
      },
      {
        id: 'SQLI-002',
        name: 'SQL Injection (Template Literal)',
        severity: 'CRITICAL',
        category: 'sql-injection',
        cwe: 'CWE-89',
        pattern: /(?:query|execute|raw|exec)\s*\(\s*`[^`]*\$\{[^}]*(?:req|param|body|query|input|user)[^}]*\}[^`]*`/gi,
        languages: ['javascript', 'typescript'],
        description: 'Template literals with user input used in database queries.',
        fix: 'Use parameterized queries: db.query("SELECT * FROM users WHERE id = $1", [userId])'
      },
      {
        id: 'SQLI-003',
        name: 'SQL Injection (f-string/format)',
        severity: 'CRITICAL',
        category: 'sql-injection',
        cwe: 'CWE-89',
        pattern: /(?:cursor\.execute|db\.execute|conn\.execute)\s*\(\s*f["'][^"']*\{[^}]*(?:request|param|input|user|form)[^}]*\}/gi,
        languages: ['python'],
        description: 'Python f-string with user input in SQL query.',
        fix: 'Use parameterized queries: cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))'
      },
      // ─── XSS ───
      {
        id: 'XSS-001',
        name: 'Cross-Site Scripting (innerHTML)',
        severity: 'HIGH',
        category: 'xss',
        cwe: 'CWE-79',
        pattern: /\.innerHTML\s*=\s*(?!['"`]<).*?(?:req\.|request\.|params\.|body\.|query\.|input|user|\$\{)/gi,
        languages: ['javascript', 'typescript'],
        description: 'User input directly assigned to innerHTML without sanitization.',
        fix: 'Use textContent instead of innerHTML, or sanitize with DOMPurify.'
      },
      {
        id: 'XSS-002',
        name: 'Cross-Site Scripting (document.write)',
        severity: 'HIGH',
        category: 'xss',
        cwe: 'CWE-79',
        pattern: /document\.write\s*\(.*?(?:req\.|request\.|params\.|body\.|query\.|location|user|\$\{)/gi,
        languages: ['javascript', 'typescript'],
        description: 'User input passed to document.write() can execute arbitrary scripts.',
        fix: 'Avoid document.write(). Use DOM manipulation with textContent.'
      },
      {
        id: 'XSS-003',
        name: 'Cross-Site Scripting (Unescaped Output)',
        severity: 'HIGH',
        category: 'xss',
        cwe: 'CWE-79',
        pattern: /res\.send\s*\(\s*[`"'].*?<.*?\$\{.*?\}.*?>.*?[`"']\s*\)/gi,
        languages: ['javascript', 'typescript'],
        description: 'User input rendered in HTML response without escaping.',
        fix: 'Use a template engine with auto-escaping (e.g., EJS, Handlebars) or escape HTML entities.'
      },
      // ─── SECRETS ───
      {
        id: 'SECRET-001',
        name: 'Hardcoded API Key',
        severity: 'HIGH',
        category: 'exposed-secrets',
        cwe: 'CWE-798',
        pattern: /(?:api[_-]?key|apikey|api[_-]?secret|api[_-]?token)\s*[:=]\s*["'][a-zA-Z0-9_\-]{16,}["']/gi,
        languages: ['*'],
        description: 'API key or secret is hardcoded in the source code.',
        fix: 'Store secrets in environment variables or a secrets manager (e.g., GitLab CI/CD variables, HashiCorp Vault).'
      },
      {
        id: 'SECRET-002',
        name: 'Hardcoded Password',
        severity: 'CRITICAL',
        category: 'exposed-secrets',
        cwe: 'CWE-798',
        pattern: /(?:password|passwd|pwd|secret)\s*[:=]\s*["'][^"']{8,}["']/gi,
        languages: ['*'],
        description: 'Password is hardcoded in the source code.',
        fix: 'Use environment variables or a secrets manager for passwords.'
      },
      {
        id: 'SECRET-003',
        name: 'Private Key in Source',
        severity: 'CRITICAL',
        category: 'exposed-secrets',
        cwe: 'CWE-321',
        pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/gi,
        languages: ['*'],
        description: 'Private key is embedded directly in source code.',
        fix: 'Store private keys in secure files excluded from version control, or use a KMS.'
      },
      {
        id: 'SECRET-004',
        name: 'AWS Access Key',
        severity: 'CRITICAL',
        category: 'exposed-secrets',
        cwe: 'CWE-798',
        pattern: /AKIA[0-9A-Z]{16}/g,
        languages: ['*'],
        description: 'AWS Access Key ID found in source code.',
        fix: 'Use IAM roles, environment variables, or AWS Secrets Manager.'
      },
      // ─── CSRF ───
      {
        id: 'CSRF-001',
        name: 'Missing CSRF Protection',
        severity: 'MEDIUM',
        category: 'csrf',
        cwe: 'CWE-352',
        pattern: /app\.(post|put|patch|delete)\s*\(\s*['"][^'"]+['"]\s*,\s*(?:async\s+)?\(?(?:req|request)/gi,
        languages: ['javascript', 'typescript'],
        description: 'State-changing endpoint without CSRF token validation.',
        fix: 'Implement CSRF middleware (e.g., csurf for Express) for all state-changing endpoints.'
      },
      // ─── INSECURE DEPENDENCIES ───
      {
        id: 'DEP-001',
        name: 'Insecure eval() Usage',
        severity: 'CRITICAL',
        category: 'code-injection',
        cwe: 'CWE-94',
        pattern: /\beval\s*\(\s*(?:req\.|request\.|params\.|body\.|query\.|input|user|\$\{)/gi,
        languages: ['javascript', 'typescript', 'python'],
        description: 'eval() with user input allows arbitrary code execution.',
        fix: 'Never use eval() with user input. Use JSON.parse() for JSON data or switch to a safe parser.'
      },
      {
        id: 'DEP-002',
        name: 'Insecure Deserialization',
        severity: 'HIGH',
        category: 'deserialization',
        cwe: 'CWE-502',
        pattern: /(?:pickle\.loads|yaml\.load\s*\([^)]*\)\s*(?!,\s*Loader)|unserialize|Marshal\.load)/gi,
        languages: ['python', 'ruby', 'php'],
        description: 'Unsafe deserialization of untrusted data can lead to remote code execution.',
        fix: 'Use safe deserialization methods (e.g., yaml.safe_load in Python, JSON for data exchange).'
      },
      // ─── AUTHENTICATION ───
      {
        id: 'AUTH-001',
        name: 'Weak JWT Secret',
        severity: 'HIGH',
        category: 'authentication',
        cwe: 'CWE-326',
        pattern: /jwt\.sign\s*\([^)]*,\s*["'](?:secret|password|key|123|admin|test)[^"']*["']/gi,
        languages: ['javascript', 'typescript'],
        description: 'JWT is signed with a weak or default secret.',
        fix: 'Use a strong, randomly generated secret (minimum 256 bits). Store in environment variables.'
      },
      {
        id: 'AUTH-002',
        name: 'No Auth on Sensitive Endpoint',
        severity: 'HIGH',
        category: 'authentication',
        cwe: 'CWE-306',
        pattern: /(?:router|app)\.(get|post|put|delete)\s*\(\s*['"]\/(?:admin|api\/admin|dashboard|settings|users\/delete)/gi,
        languages: ['javascript', 'typescript'],
        description: 'Sensitive endpoint may lack authentication middleware.',
        fix: 'Add authentication middleware before route handlers for all sensitive endpoints.'
      },
      // ─── PATH TRAVERSAL ───
      {
        id: 'PATH-001',
        name: 'Path Traversal',
        severity: 'HIGH',
        category: 'path-traversal',
        cwe: 'CWE-22',
        pattern: /(?:readFile|readFileSync|createReadStream|access|open)\s*\(\s*(?:req\.|request\.|params\.|body\.|query\.|`[^`]*\$\{)/gi,
        languages: ['javascript', 'typescript'],
        description: 'File path constructed from user input without validation.',
        fix: 'Validate and sanitize file paths. Use path.resolve() and ensure the resolved path is within the expected directory.'
      },
      // ─── COMMAND INJECTION ───
      {
        id: 'CMD-001',
        name: 'Command Injection',
        severity: 'CRITICAL',
        category: 'command-injection',
        cwe: 'CWE-78',
        pattern: /(?:exec|execSync|spawn|system|child_process)\s*\(\s*(?:`[^`]*\$\{|.*?\+\s*(?:req\.|request\.|params\.|body\.|query\.|input|user))/gi,
        languages: ['javascript', 'typescript', 'python', 'ruby'],
        description: 'User input passed to system command execution.',
        fix: 'Use parameterized commands (e.g., execFile with arguments array). Never concatenate user input into shell commands.'
      },
      // ─── INSECURE CONFIGURATION ───
      {
        id: 'CONFIG-001',
        name: 'CORS Allow All Origins',
        severity: 'MEDIUM',
        category: 'misconfiguration',
        cwe: 'CWE-942',
        pattern: /cors\(\s*\{[^}]*origin\s*:\s*(?:true|['"]?\*['"]?)/gi,
        languages: ['javascript', 'typescript'],
        description: 'CORS configured to allow all origins.',
        fix: 'Restrict CORS to specific trusted origins.'
      },
      {
        id: 'CONFIG-002',
        name: 'Debug Mode in Production',
        severity: 'MEDIUM',
        category: 'misconfiguration',
        cwe: 'CWE-489',
        pattern: /(?:DEBUG\s*=\s*True|debug\s*:\s*true|NODE_ENV\s*=\s*['"]development['"])/gi,
        languages: ['*'],
        description: 'Debug mode enabled, potentially exposing sensitive information.',
        fix: 'Ensure debug mode is disabled in production configurations.'
      },
      // ─── CRYPTO ───
      {
        id: 'CRYPTO-001',
        name: 'Weak Hashing Algorithm (MD5/SHA1)',
        severity: 'MEDIUM',
        category: 'cryptography',
        cwe: 'CWE-328',
        pattern: /(?:createHash|hashlib\.)\s*\(\s*['"](?:md5|sha1)['"]|MD5\.Create|SHA1\.Create/gi,
        languages: ['*'],
        description: 'MD5 or SHA1 used for hashing. These are cryptographically weak.',
        fix: 'Use SHA-256 or bcrypt for password hashing.'
      },
      {
        id: 'CRYPTO-002',
        name: 'Hardcoded Encryption Key',
        severity: 'HIGH',
        category: 'cryptography',
        cwe: 'CWE-321',
        pattern: /(?:createCipher|createCipheriv|AES\.new)\s*\([^)]*['"][a-fA-F0-9]{32,}['"]/gi,
        languages: ['*'],
        description: 'Encryption key hardcoded in source code.',
        fix: 'Use a KMS or environment variables for encryption keys.'
      }
    ];
  }

  /**
   * Scan a single file's content for vulnerabilities
   */
  scanFile(filePath, content, language = null) {
    const findings = [];
    const ext = filePath.split('.').pop().toLowerCase();
    const lang = language || this._detectLanguage(ext);
    const lines = content.split('\n');

    for (const rule of this.rules) {
      // Check if rule applies to this language
      if (!rule.languages.includes('*') && !rule.languages.includes(lang)) continue;

      // Skip certain rules for non-code files
      if (this._isConfigFile(ext) && !['exposed-secrets', 'misconfiguration'].includes(rule.category)) continue;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Reset regex lastIndex
        rule.pattern.lastIndex = 0;
        const match = rule.pattern.exec(line);

        if (match) {
          // Check for false positives
          if (this._isFalsePositive(line, rule, filePath)) continue;

          findings.push({
            ruleId: rule.id,
            name: rule.name,
            severity: rule.severity,
            category: rule.category,
            cwe: rule.cwe,
            file: filePath,
            line: i + 1,
            column: match.index + 1,
            lineContent: line.trim(),
            description: rule.description,
            fix: rule.fix,
            matchedText: match[0]
          });
        }
      }
    }

    return findings;
  }

  /**
   * Scan multiple files and return aggregated results
   */
  scanFiles(files) {
    const allFindings = [];
    const summary = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };

    for (const [filePath, content] of Object.entries(files)) {
      const findings = this.scanFile(filePath, content);
      allFindings.push(...findings);
      findings.forEach(f => { summary[f.severity] = (summary[f.severity] || 0) + 1; });
    }

    // Sort by severity
    const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    allFindings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return {
      totalVulnerabilities: allFindings.length,
      summary,
      findings: allFindings,
      scannedFiles: Object.keys(files).length,
      scanTimestamp: new Date().toISOString()
    };
  }

  _detectLanguage(ext) {
    const langMap = {
      js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
      py: 'python', rb: 'ruby', php: 'php', java: 'java',
      go: 'go', rs: 'rust', cs: 'csharp', yml: 'yaml', yaml: 'yaml',
      tf: 'terraform', hcl: 'terraform', dockerfile: 'dockerfile',
      sh: 'shell', bash: 'shell'
    };
    return langMap[ext] || 'unknown';
  }

  _isConfigFile(ext) {
    return ['yml', 'yaml', 'json', 'toml', 'ini', 'cfg', 'conf', 'env', 'tf', 'hcl'].includes(ext);
  }

  _isFalsePositive(line, rule, filePath) {
    // Skip comments
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('*') || trimmed.startsWith('/*')) {
      return true;
    }
    // Skip test files for some rules
    if (filePath.includes('test') || filePath.includes('spec') || filePath.includes('__tests__')) {
      if (['CONFIG-002', 'SECRET-002'].includes(rule.id)) return true;
    }
    // Skip example/doc files
    if (filePath.includes('example') || filePath.includes('.md') || filePath.includes('README')) {
      return true;
    }
    return false;
  }

  /**
   * Generate fix suggestions for a vulnerability
   */
  generateFix(finding) {
    const fixes = {
      'sql-injection': {
        javascript: `// Before (VULNERABLE):\n// const result = await db.query(\`SELECT * FROM users WHERE id = \${userId}\`);\n\n// After (SECURE):\nconst result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);`,
        python: `# Before (VULNERABLE):\n# cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")\n\n# After (SECURE):\ncursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))`
      },
      'xss': {
        javascript: `// Before (VULNERABLE):\n// element.innerHTML = userInput;\n\n// After (SECURE):\nelement.textContent = userInput;\n// Or use DOMPurify:\n// element.innerHTML = DOMPurify.sanitize(userInput);`
      },
      'exposed-secrets': {
        '*': `// Before (VULNERABLE):\n// const apiKey = "sk-abc123...";\n\n// After (SECURE):\nconst apiKey = process.env.API_KEY;\n// Store in .env file and add .env to .gitignore`
      },
      'command-injection': {
        javascript: `// Before (VULNERABLE):\n// exec(\`ls -la \${userInput}\`);\n\n// After (SECURE):\nconst { execFile } = require('child_process');\nexecFile('ls', ['-la', userInput], (err, stdout) => { /* ... */ });`
      }
    };

    return fixes[finding.category] || { '*': finding.fix };
  }
}

module.exports = new SecurityScanner();
