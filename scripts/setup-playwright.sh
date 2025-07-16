#!/bin/bash

echo "Setting up Playwright for visual testing..."

# Playwrightをインストール
echo "Installing Playwright..."
npm install --save-dev @playwright/test

# Playwrightブラウザをインストール
echo "Installing Playwright browsers..."
npx playwright install

# スクリーンショット比較用のディレクトリを作成
echo "Creating screenshot directories..."
mkdir -p src/__tests__/e2e/screenshots
mkdir -p playwright-report

# package.jsonにスクリプトを追加するための情報を表示
echo ""
echo "Please add the following scripts to your package.json:"
echo ""
echo '"test:e2e": "playwright test",'
echo '"test:e2e:ui": "playwright test --ui",'
echo '"test:e2e:debug": "playwright test --debug",'
echo '"test:e2e:headed": "playwright test --headed",'
echo '"test:visual": "playwright test src/__tests__/e2e/gantt-visual.spec.ts",'
echo '"test:visual:update": "playwright test src/__tests__/e2e/gantt-visual.spec.ts --update-snapshots",'
echo '"test:visual:ui": "playwright test src/__tests__/e2e/gantt-visual.spec.ts --ui"'
echo ""

echo "Setup completed!"
echo ""
echo "To run visual tests:"
echo "1. Start the development server: npm run dev"
echo "2. Run visual tests: npm run test:visual"
echo "3. Update screenshots: npm run test:visual:update"
echo "4. Open test UI: npm run test:visual:ui"