#!/bin/bash

# Setup script for jotai-controller npm package

echo "🚀 Setting up jotai-controller npm package..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the package
echo "🔨 Building the package..."
npm run build

echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Test the package: npm run test"
echo "2. Check the build: ls -la lib/"
echo "3. Publish to npm: npm publish"
echo ""
echo "📁 Package structure:"
echo "├── src/           # Source TypeScript files"
echo "├── lib/           # Built JavaScript files"
echo "├── examples/      # Usage examples"
echo "├── package.json   # Package configuration"
echo "├── tsconfig.json  # TypeScript configuration"
echo "├── rollup.config.js # Build configuration"
echo "└── README.md      # Documentation"

