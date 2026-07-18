import { expect, test } from "@playwright/test";

test("scans the overview and verifies a source-backed ticker detail", async ({
  page,
}) => {
  await page.goto("/tickers");

  await expect(
    page.getByRole("heading", { name: "Serenity 종목 인텔리전스" }),
  ).toBeVisible();
  const cohrRow = page.getByRole("row", { name: /COHR/ });
  await expect(cohrRow).toContainText("47");
  await expect(cohrRow).toContainText("+38");
  await expect(cohrRow).toContainText("-3");
  await expect(cohrRow).toContainText("긍정 우세");

  await cohrRow.getByText("47", { exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "COHR Coherent Corp." }),
  ).toBeVisible();
  await expect(page.getByText("최근 주요 주장")).toBeVisible();
  await expect(
    page.getByRole("img", { name: "최근 90일 Serenity 언급 추이" }),
  ).toBeVisible();

  await page.getByRole("link", { name: /의견과 원문/ }).click();
  await expect(page.getByText("AI 분석").first()).toBeVisible();
  await expect(page.getByText("원문 근거").first()).toBeVisible();
  await expect(
    page.getByRole("link", { name: "X에서 원문 보기" }).first(),
  ).toHaveAttribute("target", "_blank");
});

test("filters tickers from the URL-driven search control", async ({ page }) => {
  await page.goto("/tickers");
  const search = page.getByRole("textbox", { name: "티커 또는 회사명 검색" });
  await search.fill("coh");
  await search.press("Enter");

  await expect(page).toHaveURL(/q=coh/);
  await expect(page.getByRole("link", { name: /COHR Coherent Corp/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /AAOI/ })).toHaveCount(0);
});

test("keeps overview and detail within the mobile viewport", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium");

  await page.goto("/tickers");

  const overviewOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overviewOverflow).toBeLessThanOrEqual(1);
  await expect(page.getByRole("row", { name: /COHR/ })).toContainText("총 47");

  await page.getByRole("link", { name: /COHR Coherent Corp/ }).click();
  const detailOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(detailOverflow).toBeLessThanOrEqual(1);
  await expect(page.getByRole("navigation", { name: "종목 상세 보기" })).toBeVisible();
});
