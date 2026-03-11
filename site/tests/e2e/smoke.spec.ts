import { test, expect } from '@playwright/test';

test('home renders the civic hero', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Radar p\u00fablico para leer qu\u00e9 se contrata, con qui\u00e9n y c\u00f3mo evoluciona.')).toBeVisible();
});
