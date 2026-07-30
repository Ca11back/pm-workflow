#!/usr/bin/env python3
"""Fixture and read-only regression tests for validate_delivery.py."""

from __future__ import annotations

import hashlib
import tempfile
import unittest
from pathlib import Path

import validate_delivery


GATE_STATE = {
    "before-pen": ("experience", "pen-authoring", "pm-experience"),
    "before-candidate": ("candidate", "candidate-freeze", "pm-experience"),
    "before-review": ("review", "review", "pm-reverse-review"),
    "before-release": ("release", "release", "pm-handoff"),
    "before-receipt-close": ("receipt", "receipt-close", "pm-handoff"),
}


def hash_tree(root: Path) -> tuple[tuple[str, str], ...]:
    return tuple(
        (str(path.relative_to(root)), hashlib.sha256(path.read_bytes()).hexdigest())
        for path in sorted(item for item in root.rglob("*") if item.is_file())
    )


class Fixture:
    def __init__(self, root: Path, gate: str) -> None:
        self.root = root
        self.gate = gate
        self.entry = root / "START-HERE.md"
        self._write_files()

    def _write(self, relative: str, content: str) -> None:
        path = self.root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")

    def _write_files(self) -> None:
        phase, action, next_skill = GATE_STATE[self.gate]
        experience_ready = self.gate != "before-pen"
        after_candidate = self.gate in {"before-review", "before-release", "before-receipt-close"}
        review_ready = self.gate in {"before-release", "before-receipt-close"}
        released = self.gate == "before-receipt-close"
        candidate_result = "`passed` / 2026-07-30" if after_candidate else "`pending` / pending"
        candidate_manifest = "`draft/` / `manifest.md`" if after_candidate else "`draft/` / pending"
        included_experience = (
            "`delivery.md` / `experience/brief.md`、`experience/prototype.pen`、"
            "`experience/previews/preview.png`、`experience/manifest.md`"
            if experience_ready
            else "`delivery.md` / `experience/brief.md`"
        )
        preview = "`yes` / 2026-07-30" if experience_ready else "`no` / pending"
        preview_approval = (
            "批准当前预览并进入 Candidate / 2026-07-30" if experience_ready else "`pending`"
        )
        unresolved = "`none`" if experience_ready else "Pen authoring has not started"
        experience_status = "`completed`" if experience_ready else "`pending`"
        experience_paths = (
            "`experience/brief.md` / `experience/prototype.pen` / `experience/previews/preview.png`"
            if experience_ready
            else "`experience/brief.md` / `none` / `none`"
        )
        experience_manifest = "`experience/manifest.md`" if experience_ready else "`none`"
        missing_coverage = "`none`" if experience_ready else "approved scope still requires authoring"
        experience_check = "`done`" if experience_ready else "`missing`"
        experience_check_evidence = (
            "Experience evidence complete" if experience_ready else "Pen authoring has not started"
        )
        review_status = "`passed`" if review_ready else "`not-run`"
        review_check = "`done`" if review_ready else "`missing`"
        review_check_evidence = "`passed` report is current" if review_ready else "Review not run"
        confirmation_status = "`done`" if review_ready else "`missing`"
        confirmation_evidence = "确认交付给开发 / 2026-07-31" if review_ready else "pending"
        report_mode = "`reviews/review.md` / `separate-pass`" if review_ready else "none / `not-run`"
        review_validity = "`current` / none" if review_ready else "`none` / none"
        current_release = "`releases/REL-fixture-v1/`" if released else "`none`"
        lifecycle = "`released`" if released else "`draft`"
        release_sent = (
            "`yes` / 开发负责人，REL-fixture-v1，2026-07-31"
            if released
            else "`no` / pending"
        )
        acknowledgement = (
            "开发负责人明确回复已收到 REL-fixture-v1 / 2026-07-31"
            if released
            else "`pending`"
        )

        self._write(
            "START-HERE.md",
            f"""# START HERE：Fixture

## Current state card

- Phase：`{phase}`
- Current gate / status：`{self.gate}` / `ready`
- Current blocker：`none`
- Allowed now：`{action}` / run the bounded transition
- Forbidden now：`stop`
- Pass condition：all recorded mechanical evidence is present
- Next skill：`{next_skill}`
- Next action / owner：run {self.gate} / PM Agent

## Identity and current pointer

- Delivery / path：`DEL-fixture` / `START-HERE.md`
- Current draft bundle root：`draft/`
- Current Release：{current_release}
- Lifecycle：{lifecycle}
- Intended use：`implementation`
- PM / business Owner：产品负责人

## Current delivery scope

- Candidate / Release ID：`REL-fixture-v1`
- Active unit or Slice：本次可独立交付的 Fixture Slice
- Included files / shared dependencies：`delivery.md`、`experience/brief.md`
- Explicit exclusions：none
- Known risks / limits：none

## Candidate evidence

- Candidate gate result / date：{candidate_result}
- Bundle root / manifest：{candidate_manifest}
- Included behavior / Experience：{included_experience}
- Rendered preview shown / date：{preview}
- PM/Owner preview approval words / date：{preview_approval}
- Unresolved feedback：{unresolved}

## Four handoff checks

| Check | Status | Evidence or accepted risk |
| --- | --- | --- |
| Behavior | `done` | behavior evidence complete |
| Experience | {experience_check} | {experience_check_evidence} |
| Review | {review_check} | {review_check_evidence} |
| Confirmation | {confirmation_status} | {confirmation_evidence} |

## Experience evidence

- Target / status / reason：`pen` / {experience_status} / current scope is user-visible
- Brief / source / previews：{experience_paths}
- Experience manifest：{experience_manifest}
- Visual role / direct route：`implementation-target` / direct-fixture
- Scope/fidelity approval：批准单页低保真范围 / 2026-07-30
- Covered Markdown / Pen nodes：`delivery.md#RULE-001` / `experience/prototype.pen#node`
- Sync / structural / visual / save / read-back：`synced` / pass / pass / saved / pass
- Missing coverage：{missing_coverage}
- Skip/unavailable continuation：`none`

## Review evidence

- Review status：{review_status}
- Candidate bundle root / scope / included Experience：`draft/` / Fixture Slice / current Experience identity
- Report / mode：{report_mode}
- Review validity / historical reports：{review_validity}

## Decision snapshot

- Inventory paths：`delivery.md`
- Progress：`known_required_open=0 · blocking_current_slice=0 · deferred=0 · owner_confirmation=0`
- Definition exit evidence：critical path complete
- Current node / internal presentation：`none` / `guided`

## Release plan, sending, and engineering receipt

- Planned Release / snapshot root：`REL-fixture-v1` / `releases/REL-fixture-v1/`
- Planned Release manifest / reading order：`delivery.md` → `experience/brief.md` → `experience/manifest.md`; implementation; current Review binding
- Release sent / date：{release_sent}
- Receipt status：`pending`
- Acknowledgement words / date：{acknowledgement}
- Receipt-close gate result / date：`pending` / pending
""",
        )
        self._write(
            "draft/experience/brief.md",
            """# Experience brief

- Business Owner：产品负责人
- Scope/fidelity approval words / date：批准单页低保真范围 / 2026-07-30
- Smallest affected scope：one page and its material states
- Fidelity / interaction / surface：low-fidelity static states / desktop
""",
        )
        if experience_ready:
            self._write(
                "draft/experience/manifest.md",
                """# Experience manifest

- Experience status：`completed`
- Experience reason：current scope is user-visible
- Direct route：direct-fixture
- Visual role：`implementation-target`
- Scope/fidelity approval：批准单页低保真范围 / 2026-07-30
- Save status：`saved`
- Preview shown / date：`yes` / 2026-07-30
- PM/Owner preview approval words / date：批准当前预览并进入 Candidate / 2026-07-30
- Behavior or visual drift：`none`
- Missing coverage：`none`
- Unavailable limitation：`none`
- Route discovery evidence：`none`
- Capability check evidence：`none`
- Direct-operation attempt：`none`
- Retry result：`none`
- Product risk：`none`
- PM/Owner continuation：`none`
""",
            )
        self._write("draft/delivery.md", "# Delivery\n\n<a id=\"RULE-001\"></a>\n")
        if after_candidate:
            self._write("draft/manifest.md", "# Candidate manifest\n\n1. `delivery.md`\n2. `experience/brief.md`\n")
        if experience_ready:
            self._write("draft/experience/prototype.pen", "fixture pen source\n")
            self._write("draft/experience/previews/preview.png", "fixture preview\n")
        if review_ready:
            self._write("reviews/review.md", "# Review\n\n- Result: passed\n")
        if released:
            self._write("releases/REL-fixture-v1/MANIFEST.md", "# Release manifest\n")
            self._write("releases/REL-fixture-v1/delivery.md", "# Immutable delivery\n")

    def replace(self, old: str, new: str) -> None:
        text = self.entry.read_text(encoding="utf-8")
        if old not in text:
            raise AssertionError(f"fixture text not found: {old}")
        self.entry.write_text(text.replace(old, new), encoding="utf-8")

    def replace_manifest(self, old: str, new: str) -> None:
        path = self.root / "draft/experience/manifest.md"
        text = path.read_text(encoding="utf-8")
        if old not in text:
            raise AssertionError(f"manifest text not found: {old}")
        path.write_text(text.replace(old, new), encoding="utf-8")


class ValidatorFixtures(unittest.TestCase):
    def validate_read_only(self, fixture: Fixture, gate: str) -> list[str]:
        before = hash_tree(fixture.root)
        errors = validate_delivery.validate(fixture.entry, gate)
        after = hash_tree(fixture.root)
        self.assertEqual(before, after, f"Validator changed files for {gate}")
        return errors

    def fixture(self, gate: str) -> tuple[tempfile.TemporaryDirectory[str], Fixture]:
        temporary = tempfile.TemporaryDirectory(prefix="pm-delivery-validator-")
        return temporary, Fixture(Path(temporary.name), gate)

    def test_before_pen_pass_and_missing_approval_fail(self) -> None:
        temporary, fixture = self.fixture("before-pen")
        self.addCleanup(temporary.cleanup)
        self.assertEqual([], self.validate_read_only(fixture, "before-pen"))
        fixture.replace(
            "- Scope/fidelity approval：批准单页低保真范围 / 2026-07-30",
            "- Scope/fidelity approval：`pending`",
        )
        errors = self.validate_read_only(fixture, "before-pen")
        self.assertTrue(any("scope/fidelity approval" in error for error in errors))

    def test_before_candidate_pass_and_premature_snapshot_fail(self) -> None:
        temporary, fixture = self.fixture("before-candidate")
        self.addCleanup(temporary.cleanup)
        self.assertEqual([], self.validate_read_only(fixture, "before-candidate"))

        fixture.replace(
            "- Current gate / status：`before-candidate` / `ready`",
            "- Current gate / status：`before-candidate` / `blocked`",
        )
        fixture.replace(
            "- PM/Owner preview approval words / date：批准当前预览并进入 Candidate / 2026-07-30",
            "- PM/Owner preview approval words / date：`pending`",
        )
        fixture.replace_manifest(
            "- PM/Owner preview approval words / date：批准当前预览并进入 Candidate / 2026-07-30",
            "- PM/Owner preview approval words / date：`pending`",
        )
        errors = self.validate_read_only(fixture, "before-candidate")
        self.assertTrue(any("later explicit dated" in error for error in errors))
        self.assertTrue(any("Current gate / status" in error for error in errors))

    def test_before_candidate_rejects_premarked_gate_result(self) -> None:
        temporary, fixture = self.fixture("before-candidate")
        self.addCleanup(temporary.cleanup)
        fixture.replace(
            "- Candidate gate result / date：`pending` / pending",
            "- Candidate gate result / date：`passed` / 2026-07-30",
        )
        errors = self.validate_read_only(fixture, "before-candidate")
        self.assertTrue(any("must remain pending" in error for error in errors))

    def test_before_review_pass_and_missing_manifest_fail(self) -> None:
        temporary, fixture = self.fixture("before-review")
        self.addCleanup(temporary.cleanup)
        self.assertEqual([], self.validate_read_only(fixture, "before-review"))
        (fixture.root / "draft/manifest.md").unlink()
        errors = self.validate_read_only(fixture, "before-review")
        self.assertTrue(any("Candidate manifest does not exist" in error for error in errors))

    def test_state_card_and_bundle_root_are_single_explicit_sources(self) -> None:
        temporary, fixture = self.fixture("before-review")
        self.addCleanup(temporary.cleanup)
        fixture.replace(
            "- Bundle root / manifest：`draft/` / `manifest.md`",
            "- Bundle root / manifest：`other/` / `manifest.md`",
        )
        errors = self.validate_read_only(fixture, "before-review")
        self.assertTrue(any("differs from Current draft bundle root" in error for error in errors))

        temporary_duplicate, duplicate = self.fixture("before-review")
        self.addCleanup(temporary_duplicate.cleanup)
        duplicate.replace("- Phase：`review`", "- Phase：`review`\n- Phase：`candidate`")
        errors = self.validate_read_only(duplicate, "before-review")
        self.assertTrue(any("exactly one Phase" in error for error in errors))

        temporary_route, wrong_route = self.fixture("before-review")
        self.addCleanup(temporary_route.cleanup)
        wrong_route.replace(
            "- Next skill：`pm-reverse-review`",
            "- Next skill：`pm-handoff`",
        )
        errors = self.validate_read_only(wrong_route, "before-review")
        self.assertTrue(any("Next skill must be pm-reverse-review" in error for error in errors))

        temporary_missing, missing = self.fixture("before-review")
        self.addCleanup(temporary_missing.cleanup)
        missing.replace("- Current draft bundle root：`draft/`", "- Current draft bundle root：`pending`")
        errors = self.validate_read_only(missing, "before-review")
        self.assertTrue(any("missing current draft bundle root" in error for error in errors))

    def test_before_release_pass_missing_confirmation_fail_and_skip_allowed(self) -> None:
        temporary, fixture = self.fixture("before-release")
        self.addCleanup(temporary.cleanup)
        self.assertEqual([], self.validate_read_only(fixture, "before-release"))
        fixture.replace(
            "| Confirmation | `done` | 确认交付给开发 / 2026-07-31 |",
            "| Confirmation | `missing` | pending |",
        )
        errors = self.validate_read_only(fixture, "before-release")
        self.assertTrue(any("Confirmation handoff check" in error for error in errors))

        temporary_skip, skipped = self.fixture("before-release")
        self.addCleanup(temporary_skip.cleanup)
        skipped.replace("- Review status：`passed`", "- Review status：`skipped`")
        skipped.replace(
            "| Review | `done` | `passed` report is current |",
            "| Review | `accepted-risk` | Owner accepts handoff without Review / 2026-07-31 |",
        )
        skipped.replace(
            "- Report / mode：`reviews/review.md` / `separate-pass`",
            "- Report / mode：explicit skip / `not-run`",
        )
        self.assertEqual([], self.validate_read_only(skipped, "before-release"))

    def test_before_release_supports_a_prior_release_without_overwrite(self) -> None:
        temporary, fixture = self.fixture("before-release")
        self.addCleanup(temporary.cleanup)
        fixture._write("releases/REL-fixture-v0/MANIFEST.md", "# Prior immutable release\n")
        fixture.replace(
            "- Current Release：`none`",
            "- Current Release：`releases/REL-fixture-v0/`",
        )
        self.assertEqual([], self.validate_read_only(fixture, "before-release"))

        fixture.replace(
            "- Planned Release / snapshot root：`REL-fixture-v1` / `releases/REL-fixture-v1/`",
            "- Planned Release / snapshot root：`REL-fixture-v0` / `releases/REL-fixture-v0/`",
        )
        errors = self.validate_read_only(fixture, "before-release")
        self.assertTrue(any("must not overwrite" in error for error in errors))

    def test_before_release_rejects_any_existing_planned_destination(self) -> None:
        temporary, fixture = self.fixture("before-release")
        self.addCleanup(temporary.cleanup)
        fixture._write("releases/REL-fixture-v1/MANIFEST.md", "# Existing immutable release\n")
        errors = self.validate_read_only(fixture, "before-release")
        self.assertTrue(any("destination already exists" in error for error in errors))

    def test_before_release_rejects_passed_with_open_finding(self) -> None:
        temporary, fixture = self.fixture("before-release")
        self.addCleanup(temporary.cleanup)
        text = fixture.entry.read_text(encoding="utf-8")
        fixture.entry.write_text(
            text
            + "\n| `FND-001` | `reviews/review.md` | `major` | target | locator | pending | `open` | pending |\n",
            encoding="utf-8",
        )
        errors = self.validate_read_only(fixture, "before-release")
        self.assertTrue(any("contradicts pending" in error for error in errors))

    def test_before_receipt_close_pass_and_missing_acknowledgement_fail(self) -> None:
        temporary, fixture = self.fixture("before-receipt-close")
        self.addCleanup(temporary.cleanup)
        self.assertEqual([], self.validate_read_only(fixture, "before-receipt-close"))
        fixture.replace(
            "- Acknowledgement words / date：开发负责人明确回复已收到 REL-fixture-v1 / 2026-07-31",
            "- Acknowledgement words / date：`pending`",
        )
        errors = self.validate_read_only(fixture, "before-receipt-close")
        self.assertTrue(any("development acknowledgement" in error for error in errors))


if __name__ == "__main__":
    unittest.main(verbosity=2)
