const { test, expect } = require('@playwright/test');

test.describe('Blog & Website Integration Tests', () => {
  test('Homepage loads correctly', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Lewis Cowles/i);
    await expect(page.locator('header')).toBeVisible();
  });

  test('Blog index lists articles including the latest post', async ({ page }) => {
    await page.goto('/blog/');
    await expect(page.locator('h1')).toContainText('Web log');
    
    // Check that the new RFC 8693 post is present in the blog index
    const rfcPostLink = page.locator('a[href="/blog/jwt-act-claim-rfc-8693/"]');
    await expect(rfcPostLink).toBeVisible();
    await expect(rfcPostLink).toContainText('JWT - Delegated Actor Claims & RFC 8693');
  });

  test('RFC 8693 blog post renders correctly', async ({ page }) => {
    await page.goto('/blog/jwt-act-claim-rfc-8693/');
    
    // Check page title and main heading
    await expect(page).toHaveTitle(/JWT Delegated Actor Claims & RFC 8693/i);
    await expect(page.locator('h1.p-name')).toContainText('JWT - Delegated Actor Claims & RFC 8693');
    
    // Check published date
    await expect(page.locator('time.post-date')).toContainText('2026-08-01');
    
    // Check key content sections
    await expect(page.locator('.e-content')).toContainText('Matthew Wasbrough');
    await expect(page.locator('.e-content')).toContainText('RFC 8693');
    await expect(page.locator('.e-content code').first()).toBeVisible();
  });
});
