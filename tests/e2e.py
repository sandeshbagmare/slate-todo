"""End-to-end checks for the streak / stats / power-feature release.

Run against the dev server:  python tests/e2e.py
Every step asserts on the real DOM; screenshots land in shots/.
"""
import json
import pathlib
import sys
import time

from playwright.sync_api import sync_playwright

BASE = "http://localhost:5173"
SHOTS = pathlib.Path("shots")
SHOTS.mkdir(exist_ok=True)
results: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, note: str = "") -> None:
    results.append((name, ok, note))
    print(f"{'PASS' if ok else 'FAIL'}  {name}{'  — ' + note if note else ''}")


def main() -> int:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={"width": 1440, "height": 950})
        page = ctx.new_page()
        errors: list[str] = []
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append(str(e)))

        page.goto(BASE, wait_until="networkidle")
        page.evaluate("localStorage.clear()")
        page.reload(wait_until="networkidle")
        page.wait_for_timeout(600)

        # 1. calendar is still the landing view
        check("landing view is Calendar", page.locator("h1").first.inner_text().startswith("Calendar"))

        # 2. stats view exists and is reachable from the sidebar
        page.locator("aside").get_by_role("button", name="Stats & streaks").click()
        page.wait_for_timeout(400)
        check("stats view renders", page.locator("h1").first.inner_text().startswith("Stats"))
        check("streak hero visible", page.get_by_text("days in a row").first.is_visible())
        check("heatmap cells", page.locator("[title*='done']").count() == 91,
              f"{page.locator('[title*=\'done\']').count()} cells")
        page.screenshot(path=str(SHOTS / "stats-empty.png"))

        # 3. quick-add parses date, priority, list and repeat in one line
        page.locator("aside").get_by_role("button", name="Upcoming").click()
        page.wait_for_timeout(300)
        composer = page.get_by_label("New task title")
        composer.click()
        composer.fill("Review the PR tomorrow !2 #Work every week")
        page.keyboard.press("Enter")
        page.wait_for_timeout(500)
        row = page.locator("ul[aria-label=Tasks] li").filter(has_text="Review the PR").first
        text = row.inner_text()
        title_line = text.splitlines()[0].strip()
        check("quick add kept a clean title", title_line == "Review the PR", title_line)
        check("quick add set repeat chip", "Weekly" in text)
        check("quick add set list", "Work" in text)
        check("quick add set priority", "Med" in text)

        # 4. completing a task starts the streak and spawns the next occurrence
        row.get_by_role("button", name='Complete "Review the PR tomorrow !2 #Work every week"').click() if False else row.locator("button[aria-label^=Complete]").click()
        page.wait_for_timeout(600)
        data = page.evaluate("JSON.parse(localStorage.getItem('slate.streak'))")
        check("completion logged for today", sum(1 for v in data["log"].values() if v > 0) >= 1,
              json.dumps(data["log"]))
        tasks = page.evaluate("JSON.parse(localStorage.getItem('slate.tasks'))")
        spawned = [t for t in tasks if t.get("title") == "Review the PR" and not t["done"]]
        done = [t for t in tasks if t.get("title") == "Review the PR" and t["done"]]
        check("repeating task spawned next occurrence", len(spawned) == 1 and len(done) == 1,
              f"{len(spawned)} open / {len(done)} done")
        if spawned and done:
            import datetime as _dt

            expected = (_dt.date.fromisoformat(done[0]["due"]) + _dt.timedelta(days=7)).isoformat()
            check("next occurrence is one week later", spawned[0]["due"] == expected,
                  f"{done[0]['due']} -> {spawned[0]['due']}")

        # 5. command palette opens, searches and navigates
        page.keyboard.press("Control+k")
        page.wait_for_timeout(300)
        check("palette opens", page.get_by_role("dialog", name="Command palette").is_visible())
        page.get_by_label("Command palette input").fill("stats")
        page.keyboard.press("Enter")
        page.wait_for_timeout(400)
        check("palette navigates to stats", page.locator("h1").first.inner_text().startswith("Stats"))
        check("streak counted today", page.get_by_text("day in a row").first.is_visible())
        check("today goal progress moved", page.locator("text=/^1\/3$/").count() >= 1)

        # 6. freeze repairs a broken run
        page.evaluate(
            """() => {
              const d = new Date(); d.setDate(d.getDate() - 2);
              const pad = (n) => String(n).padStart(2, '0');
              const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
              localStorage.setItem('slate.streak', JSON.stringify(
                { enabled: true, log: { [key]: 2 }, best: 4, shields: 1, goal: 3 }));
              localStorage.setItem('slate.view', JSON.stringify('stats'));
            }"""
        )
        page.reload(wait_until="networkidle")
        page.wait_for_timeout(600)
        repair = page.get_by_role("button", name="Use a freeze to save yesterday")
        check("freeze offered for a broken run", repair.is_visible())
        repair.click()
        page.wait_for_timeout(300)
        after = page.evaluate("JSON.parse(localStorage.getItem('slate.streak'))")
        check("freeze consumed", after["shields"] == 0)
        check("streak restored", page.get_by_text("days in a row").first.is_visible())
        page.screenshot(path=str(SHOTS / "stats-streak.png"))

        # 7. export produces a backup file
        with page.expect_download() as dl:
            page.locator("aside").get_by_role("button", name="Export").click()
        download = dl.value
        check("export downloads a json backup", download.suggested_filename.endswith(".json"),
              download.suggested_filename)
        backup = pathlib.Path(download.path())
        payload = json.loads(backup.read_text())
        check("backup carries tasks, lists and streak",
              {"tasks", "lists", "streak"} <= set(payload.keys()))

        # 8. phone layout: five tabs, stats reachable, no overflow
        phone = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
        m = phone.new_page()
        m.goto(BASE, wait_until="networkidle")
        m.wait_for_timeout(700)
        tabs = m.locator("nav[aria-label=Main] button")
        check("five bottom tabs", tabs.count() == 5, str(tabs.count()))
        m.locator("nav[aria-label=Main]").get_by_role("button", name="Stats").click()
        m.wait_for_timeout(400)
        check("stats reachable on phone", m.locator("h1").first.inner_text().startswith("Stats"))
        check("no horizontal overflow", m.evaluate("document.documentElement.scrollWidth === innerWidth"))
        m.screenshot(path=str(SHOTS / "stats-mobile.png"))

        # 9. week mode + drag to reschedule
        page.evaluate("localStorage.setItem('slate.view', JSON.stringify('calendar'))")
        page.reload(wait_until="networkidle")
        page.wait_for_timeout(600)
        page.get_by_role("button", name="week", exact=True).click()
        page.wait_for_timeout(450)
        check("week board has 7 day columns",
              page.locator("button[aria-label$='tasks']").count() == 7,
              str(page.locator("button[aria-label$='tasks']").count()))

        before = page.evaluate("JSON.parse(localStorage.getItem('slate.tasks'))")
        moved_js = page.evaluate(
            """() => {
              const chips = [...document.querySelectorAll('[draggable="true"]')];
              const chip = chips.find((el) => el.textContent.trim().length > 0);
              if (!chip) return 'no chip';
              window.__dragId = chip.dataset.taskId;
              const cols = [...document.querySelectorAll('button[aria-label$="tasks"]')].map((el) => el.parentElement);
              const dt = new DataTransfer();
              chip.dispatchEvent(new DragEvent('dragstart', { dataTransfer: dt, bubbles: true }));
              cols[6].dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }));
              cols[6].dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
              chip.dispatchEvent(new DragEvent('dragend', { dataTransfer: dt, bubbles: true }));
              return chip.dataset.taskId;
            }"""
        )
        page.wait_for_timeout(500)
        after = page.evaluate("JSON.parse(localStorage.getItem('slate.tasks'))")
        moved = next((t for t in before if moved_js and t["id"] == moved_js), None)
        target = next((t for t in after if moved_js and t["id"] == moved_js), None)
        check("drag moved the task to another day",
              moved_js not in ("ok", "no chip") and target is not None and moved is not None
              and target["due"] != moved["due"],
              f"{moved['due'] if moved else '?'} -> {target['due'] if target else '?'}")
        check("move toast offers undo", page.locator("[role=status]").count() > 0)
        page.screenshot(path=str(SHOTS / "week-board.png"))

        # 10. switching back to month keeps the month grid
        page.get_by_role("button", name="month", exact=True).click()
        page.wait_for_timeout(350)
        check("month mode restored", page.locator("button[aria-label$='tasks']").count() == 42)

        # 11. no console errors anywhere
        check("no console errors", len(errors) == 0, "; ".join(errors[:3]))
        browser.close()

    failed = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
