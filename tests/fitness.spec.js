const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BLOG_DIR = path.join(__dirname, '..', 'blog');

// Category / Year / Special directories to exclude from individual post audits
const categoryDirs = new Set([
  '2019', '2020', '2021', 'automation', 'docker', 'golang', 'open-source', 
  'python', 'windows', 'excellence', 'modern-deployment-patterns',
  'interesting-sqlalchemy-python-code', 'python-testing-with-pytest-quick-tips'
]);

// Helper to get all actual blog post subdirectories containing an index.html
function getBlogPostDirectories() {
  const entries = fs.readdirSync(BLOG_DIR, { withFileTypes: true });
  const posts = [];
  
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const indexPath = path.join(BLOG_DIR, entry.name, 'index.html');
      if (fs.existsSync(indexPath)) {
        posts.push(entry.name);
      }
    }
  }
  return posts;
}

// Helper to collect all HTML content from index pages across blog/
function getAllBlogIndexesContent() {
  let combinedContent = fs.readFileSync(path.join(BLOG_DIR, 'index.html'), 'utf-8');
  
  const entries = fs.readdirSync(BLOG_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const indexPath = path.join(BLOG_DIR, entry.name, 'index.html');
      if (fs.existsSync(indexPath)) {
        combinedContent += '\n' + fs.readFileSync(indexPath, 'utf-8');
      }
    }
  }
  return combinedContent;
}

test.describe('Blog Architectural Fitness Functions', () => {

  test('Fitness Function 1: No Orphan Posts (All 75+ blog folders linked in index)', async ({ page }) => {
    const allIndexesContent = getAllBlogIndexesContent();
    const postDirs = getBlogPostDirectories();
    const missingFromIndex = [];

    for (const dirName of postDirs) {
      if (categoryDirs.has(dirName)) continue;
      
      if (!allIndexesContent.includes(`/blog/${dirName}/`) && !allIndexesContent.includes(`/blog/${dirName}`)) {
        missingFromIndex.push(dirName);
      }
    }

    expect(missingFromIndex, `Orphan post directories found: ${missingFromIndex.join(', ')}`).toEqual([]);
  });

  test('Fitness Function 2: Microformats2 & Semantic HTML Audit (Scans ALL posts on site)', async ({ page }) => {
    const allPostSlugs = getBlogPostDirectories().filter(dir => !categoryDirs.has(dir));
    
    for (const postSlug of allPostSlugs) {
      await page.goto(`/blog/${postSlug}/`);
      
      const hEntry = page.locator('article.h-entry');
      await expect(hEntry, `Post /blog/${postSlug}/ is missing .h-entry article container`).toBeVisible();
      
      const pName = page.locator('article .p-name');
      await expect(pName.first(), `Post /blog/${postSlug}/ is missing .p-name title`).toBeVisible();
      
      const dtPublished = page.locator('article .dt-published');
      await expect(dtPublished, `Post /blog/${postSlug}/ is missing .dt-published time`).toBeVisible();
      
      const datetimeAttr = await dtPublished.getAttribute('datetime');
      expect(datetimeAttr, `Post /blog/${postSlug}/ has invalid datetime attribute`).toMatch(/^\d{4}-\d{2}-\d{2}/);
      
      const author = page.locator('article .u-author');
      await expect(author, `Post /blog/${postSlug}/ is missing .u-author`).toBeVisible();
      
      const eContent = page.locator('article .e-content');
      await expect(eContent, `Post /blog/${postSlug}/ is missing .e-content`).toBeVisible();
    }
  });

  test('Fitness Function 3: Accessibility & Image Alt Attribute Audit (Scans ALL pages & posts)', async ({ page }) => {
    const mainPages = ['/', '/blog/', '/about/', '/privacy.html', '/offline.html'];
    const allPostSlugs = getBlogPostDirectories().filter(dir => !categoryDirs.has(dir));
    const allRoutes = [...mainPages, ...allPostSlugs.map(s => `/blog/${s}/`)];

    for (const url of allRoutes) {
      await page.goto(url);
      
      const images = page.locator('img');
      const count = await images.count();
      
      for (let i = 0; i < count; i++) {
        const img = images.nth(i);
        const alt = await img.getAttribute('alt');
        expect(alt, `Image ${i} on ${url} is missing an alt attribute`).not.toBeNull();
      }
    }
  });

});
