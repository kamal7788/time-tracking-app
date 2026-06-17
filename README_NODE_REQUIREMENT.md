# Deployment Requirements

## Node Version

This project requires **Node.js 22.0.0 or higher** to work with Prisma 7.

Current Node version in this environment: **20.20.2**

### Solution Options

1. **Upgrade to Node 22+**
   - Update Node.js version in your environment
   - `node -v` should show something like `v22.x.x`

2. **Use Bun** (recommended)
   - Bun supports Node APIs and is compatible with Prisma 7
   - Install Bun: `curl -fsSL https://bun.sh/install | bash`
   - Run with Bun: `bun run build`

3. **Use Prisma 5 (Legacy)**
   - If you cannot upgrade Node, we can revert to Prisma 5
   - This will work with Node 20, but has some limitations

## Prisma 7 Migration

Prisma 7 includes these major changes:
- `datasource url` moved to `prisma.config.ts`
- New adapter pattern for database connections
- Various improvements and fixes

If choosing to upgrade to Node 22+, you may need to address these compatibility issues.

## Docker

If using Docker, update the node base image:
```dockerfile
FROM node:22-alpine AS base
```

## Local Development

```bash
# With Node 22+
npm install
npm run build

# Or with Bun
bun install
bun run build
```

## Troubleshooting

### Node Version Issue
If you encounter the error:
```
npm warn EBADENGINE Unsupported engine
npm warn EB     package: '@prisma/streams-local@0.1.2',
npm warn EBADENGINE   required: { bun: '>=1.3.6', node: '>=22.0.0' },
npm warn EBADENGINE   current: { node: 'v20.20.2', npm: '10.8.2' }
```

This indicates a Node version mismatch. Please upgrade Node.js to version 22 or later.

### Deployment Issues
If encountering Prisma client initialization errors, ensure your NODE_ENV is set correctly and all required environment variables are configured.

## Getting Help

For specific issues with the migration or compatibility, please create an issue in this repository with:
- Your current Node.js version
- Any error messages
- The command you ran
