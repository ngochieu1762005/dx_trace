#!/usr/bin/env python3
# SPDX-FileCopyrightText: 2026 DX-TRACE contributors
# SPDX-License-Identifier: MIT
# DX-TRACE project authors: Đặng Nhật Minh, Nguyễn Ngọc Hiếu
# SPDX-License-Identifier: MIT
# SPDX-FileCopyrightText: 2026 DX-TRACE contributors
"""Exercise only a loopback, synthetic DX_LOCAL_DEMO instance with Playwright.

Install: python -m pip install playwright==1.62.0
         python -m playwright install --with-deps chromium
Run after building and starting the local demo on 127.0.0.1:8080.
No production credentials, external profiles or real business data are needed.
"""
import os
from pathlib import Path
from urllib.parse import urlsplit

from playwright.sync_api import expect, sync_playwright


def main():
    origin = os.environ.get("DX_EVIDENCE_UI_URL", "http://127.0.0.1:8080").rstrip("/")
    url = urlsplit(origin)
    if (url.scheme != "http" or url.hostname != "127.0.0.1" or url.port != 8080
            or url.username or url.password or url.path or url.query or url.fragment):
        raise ValueError("This smoke test requires the loopback DX_LOCAL_DEMO origin http://127.0.0.1:8080")
    output = Path(os.environ.get("DX_EVIDENCE_SCREENSHOT_DIR", "/tmp/evidence-ui"))
    output.mkdir(parents=True, exist_ok=True)
    expect.set_options(timeout=10000)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            page = browser.new_page(viewport={"width": 1280, "height": 1000}, device_scale_factor=1)
            page.set_default_timeout(10000)
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.goto(origin + "/?area=training#overview", wait_until="domcontentloaded")
            expect(page.locator(".dispatch-chart")).to_be_visible()
            expect(page.locator(".dispatch-plot li")).to_have_count(7)
            expect(page.locator(".dispatch-next li a")).to_have_count(3)
            page.screenshot(path=str(output / "warehouse-desktop.png"))
            page.set_viewport_size({"width": 390, "height": 844})
            if not page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"):
                raise AssertionError("Warehouse overview overflows the mobile viewport")
            page.screenshot(path=str(output / "warehouse-mobile.png"))
            page.get_by_role("link", name="Mở hướng dẫn diễn tập").click()
            page.locator(".training-paths a").filter(has_text="TOM-102").click()
            expect(page.locator(".lot-dossier")).to_contain_text("Tôm sú đông lạnh")
            page.set_viewport_size({"width": 1280, "height": 1000})

            page.goto(origin + "/?area=training#audit", wait_until="domcontentloaded")
            proof = page.get_by_role("region", name="Bằng chứng quyết định nghiệp vụ")
            expect(proof).to_be_visible()
            expect(proof.get_by_text("MÔ PHỎNG", exact=True)).to_be_visible()
            expect(proof.locator(".evidence-demo-disclaimer")).to_contain_text("hoàn toàn giả lập")

            proof.get_by_role("button", name="Kiểm tra mẫu minh họa", exact=True).click()
            expect(proof.get_by_text("Bằng chứng mẫu hợp lệ", exact=True)).to_be_visible()
            expect(proof.locator(".evidence-checks .valid")).to_have_count(6)
            expect(proof.locator(".evidence-checks .invalid")).to_have_count(0)
            proof.screenshot(path=str(output / "evidence-desktop-valid.png"))

            proof.get_by_role("button", name="Mô phỏng sửa kết quả kiểm định", exact=True).click()
            expect(proof.get_by_text("Phát hiện bằng chứng mẫu đã bị sửa", exact=True)).to_be_visible()
            expect(proof.locator(".evidence-checks .invalid")).to_have_count(3)
            signature = proof.locator(".evidence-checks > div").filter(has_text="Chữ ký số").locator("strong")
            expect(signature).to_have_text("HỢP LỆ")
            expect(proof.locator(".evidence-demo-note")).to_contain_text("toàn bộ bằng chứng bị từ chối")
            proof.screenshot(path=str(output / "evidence-desktop-tampered.png"))

            page.set_viewport_size({"width": 390, "height": 844})
            proof.screenshot(path=str(output / "evidence-mobile-tampered.png"))
            if not page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"):
                raise AssertionError("Evidence page overflows the 390px mobile viewport")

            proof.get_by_role("button", name="Khôi phục & kiểm tra mẫu", exact=True).click()
            expect(proof.get_by_text("Bằng chứng mẫu hợp lệ", exact=True)).to_be_visible()
            expect(proof.locator(".evidence-checks .valid")).to_have_count(6)
            proof.screenshot(path=str(output / "evidence-mobile-restored.png"))

            page.goto(origin + "/?area=training#devices", wait_until="domcontentloaded")
            expect(page.locator(".cold-chain-fixture").first).to_be_visible()
            expect(page.locator(".cold-chain-fixture").first).to_contain_text("mô phỏng")
            if not page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"):
                raise AssertionError("Device page overflows the 390px mobile viewport")
            page.screenshot(path=str(output / "cold-chain-mobile-synthetic.png"), full_page=True)
            if errors:
                raise AssertionError("Browser runtime error: " + errors[0])
            print("PASS: synthetic evidence, tampering, original signature, restore and mobile source labels")
            print("Screenshots: " + str(output))
        finally:
            browser.close()


if __name__ == "__main__":
    main()
