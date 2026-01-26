import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mapping of old imports to new imports
const importMappings = [
    {
        pattern: /import\s+(?:type\s+)?\{\s*([^}]+)\s*\}\s+from\s+['"]@\/services\/inventoryService['"]/g,
        replacement: (match, types) => {
            const typeList = types.split(',').map(t => t.trim()).filter(t => { // Keep only type imports, not service imports
                const knownTypes = [
                    'Product',
                    'Category',
                    'Supplier',
                    'Invoice',
                    'InvoiceItem',
                    'Quote',
                    'QuoteItem',
                    'PointOfSale',
                    'StockMovement',
                    'Receipt',
                    'ReceiptItem',
                    'ReceiptCreatePayload',
                    'Expense',
                    'ExpenseCategory',
                    'PaginatedResponse'
                ];
                return knownTypes.includes(t);
            });

            if (typeList.length === 0) 
                return match;
             // Keep original if no types
            return `import type { ${
                typeList.join(', ')
            } } from '@/types'`;
        }
    }, {
        pattern: /import\s+(?:type\s+)?\{\s*([^}]+)\s*\}\s+from\s+['"]@\/services\/dashboardService['"]/g,
        replacement: (match, types) => {
            const typeList = types.split(',').map(t => t.trim()).filter(t => {
                return t === 'DashboardStats';
            });

            if (typeList.length === 0) 
                return match;
            
            return `import type { ${
                typeList.join(', ')
            } } from '@/types'`;
        }
    },
    // Handle mixed imports (service + types)
    {
        pattern: /import\s+inventoryService,\s*\{\s*(?:type\s+)?([^}]+)\s*\}\s+from\s+['"]@\/services\/inventoryService['"]/g,
        replacement: (match, types) => {
            const typeList = types.split(',').map(t => t.trim().replace(/^type\s+/, '')).filter(t => {
                const knownTypes = [
                    'Product',
                    'Category',
                    'Supplier',
                    'Invoice',
                    'InvoiceItem',
                    'Quote',
                    'QuoteItem',
                    'PointOfSale',
                    'StockMovement',
                    'Receipt',
                    'ReceiptItem',
                    'ReceiptCreatePayload',
                    'Expense',
                    'ExpenseCategory',
                    'PaginatedResponse'
                ];
                return knownTypes.includes(t);
            });

            if (typeList.length === 0) {
                return `import inventoryService from '@/services/inventoryService'`;
            }
            return `import inventoryService from '@/services/inventoryService';\nimport type { ${
                typeList.join(', ')
            } } from '@/types'`;
        }
    }
];

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    importMappings.forEach(({pattern, replacement}) => {
        const newContent = content.replace(pattern, (...args) => {
            modified = true;
            return typeof replacement === 'function' ? replacement(...args) : replacement;
        });
        content = newContent;
    });

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Updated: ${
            path.relative(process.cwd(), filePath)
        }`);
        return true;
    }

    return false;
}

function walkDirectory(dir, filePattern =/\.(tsx?|jsx?)$/) {
    const files = [];

    function walk(currentPath) {
        const entries = fs.readdirSync(currentPath, {withFileTypes: true});

        for (const entry of entries) {
            const fullPath = path.join(currentPath, entry.name);

            if (entry.isDirectory()) { // Skip node_modules, dist, build directories
                if (!['node_modules', 'dist', 'build', '.git'].includes(entry.name)) {
                    walk(fullPath);
                }
            } else if (entry.isFile() && filePattern.test(entry.name)) {
                files.push(fullPath);
            }
        }
    }

    walk(dir);
    return files;
}

// Main execution
const srcDir = path.join(__dirname, 'src');
console.log('🔍 Scanning for files to migrate...\n');

const files = walkDirectory(srcDir);
let updatedCount = 0;

files.forEach(file => {
    if (processFile(file)) {
        updatedCount++;
    }
});

console.log(`\n✨ Migration complete! Updated ${updatedCount} file(s).`);
