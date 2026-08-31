import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('citizen dashboard is concise and links into investigation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: /Entender la contratación menor/ })).toBeVisible();
  await expect(page.locator('.year-control select')).toHaveValue('all');
  await expect(page.locator('.guided-links a')).toHaveCount(4);
  await page.getByRole('link', { name: /Buscar una empresa/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: /Explorador de contratos/ })).toBeVisible();
});

test('explorer renders a bounded page and opens record evidence', async ({ page }) => {
  await page.goto('/explorador?year=2026');
  await expect(page.getByText(/resultados/)).toBeVisible();
  const rowCount = await page.locator('.explorer-table tbody tr').count();
  expect(rowCount).toBeGreaterThan(0);
  expect(rowCount).toBeLessThanOrEqual(50);
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThan(15000);
  await page.locator('.explorer-table tbody tr').first().getByRole('button', { name: 'Ver detalle' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').getByText(/Importe/)).toBeVisible();
});

test('language switch preserves a usable Galician interface', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'GL' }).click();
  await expect(page).toHaveURL(/lang=gl/);
  await expect(page.getByRole('heading', { name: /Entender a contratación menor/ })).toBeVisible();
  await page.goto('/evolucion?lang=gl');
  await expect(page.getByRole('heading', { name: /Cambios de ritmo, picos e exercicios atípicos/ })).toBeVisible();
  await expect(page.getByText('Ámbito da análise')).toBeVisible();
});

test('methodology documents law, architecture and eight rules in Galician', async ({ page }) => {
  await page.goto('/metodologia?lang=gl');
  await expect(page.getByRole('heading', { level: 1, name: /Como se constrúe a web/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Arquitectura' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Lei 9\/2017 consolidada/ })).toHaveAttribute('href', /boe\.es/);
  await expect(page.locator('.method-rule')).toHaveCount(8);
});

test('patterns use descriptive names and unambiguous counters', async ({ page }) => {
  await page.goto('/patrones?lang=gl');
  await expect(page.getByText('Tipos de regra activos')).toBeVisible();
  await expect(page.locator('.pattern-counts').getByText('Casos agrupados', { exact: true })).toBeVisible();
  await expect(page.getByText('Sinais individuais')).toBeVisible();
  await expect(page.getByText('unit-concentration', { exact: true })).toHaveCount(0);
});

test('mobile layout uses cards and a collapsed menu', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/explorador?year=2026');
  await expect(page.getByRole('button', { name: 'Menú' })).toBeVisible();
  await expect(page.locator('.record-cards article').first()).toBeVisible();
  const cardCount = await page.locator('.record-cards article').count();
  expect(cardCount).toBeGreaterThan(0);
  expect(cardCount).toBeLessThanOrEqual(50);
  await expect(page.locator('.explorer-table')).toBeHidden();
});

test('principal routes have no serious automatic accessibility violations', async ({ page }) => {
  for (const route of ['/', '/explorador?year=2026', '/patrones', '/metodologia?lang=gl']) {
    await page.goto(route);
    const results = await new AxeBuilder({ page }).disableRules(['color-contrast']).analyze();
    expect(results.violations.filter((item) => ['critical', 'serious'].includes(item.impact ?? ''))).toEqual([]);
  }
});
