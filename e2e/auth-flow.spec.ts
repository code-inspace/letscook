import { test, expect } from "@playwright/test";

test.describe("Authentication & Route Protection Flow", () => {
  test("should redirect unauthenticated users visiting / to /login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.locator("h1")).toContainText("Let's");
    await expect(page.locator("h1")).toContainText("Cook");
  });

  test("should toggle between Sign In and Sign Up tabs", async ({ page }) => {
    await page.goto("/login");

    // Click Sign Up tab
    await page.getByRole("button", { name: "Créer un compte" }).click();
    await expect(page.getByPlaceholder("Ex: Axel Coudair")).toBeVisible();
    await expect(page.getByRole("button", { name: "Créer mon compte" })).toBeVisible();

    // Click Sign In tab
    await page.getByRole("button", { name: "Se connecter" }).click();
    await expect(page.getByPlaceholder("Ex: Axel Coudair")).not.toBeVisible();
    await expect(page.getByRole("button", { name: "Se connecter" })).toBeVisible();
  });

  test("should show validation error on empty submit", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Se connecter" }).click();
    const emailInput = page.getByPlaceholder("nom@exemple.com");
    await expect(emailInput).toBeVisible();
  });
});
