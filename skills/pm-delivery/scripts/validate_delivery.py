#!/usr/bin/env python3
"""Read-only mechanical transition checks for a PM Delivery."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


DATE_RE = re.compile(r"\b20\d{2}-\d{2}-\d{2}\b")
PLACEHOLDERS = {
    "",
    "pending",
    "none",
    "no",
    "not-run",
    "not-applicable",
    "待定",
    "待确认",
    "等待确认",
    "无",
    "未形成",
    "未执行",
    "尚未",
}
GATE_CONTRACTS = {
    "before-pen": ("experience", "pen-authoring", "pm-experience"),
    "before-candidate": ("candidate", "candidate-freeze", "pm-experience"),
    "before-review": ("review", "review", "pm-reverse-review"),
    "before-release": ("release", "release", "pm-handoff"),
    "before-receipt-close": ("receipt", "receipt-close", "pm-handoff"),
}


def field_values(text: str, label: str) -> list[str]:
    """Return every exact Markdown scalar field matching one label."""

    return [
        match.group(1).strip()
        for match in re.finditer(
            rf"^(?:-\s*)?{re.escape(label)}[：:]\s*(.+)$",
            text,
            re.MULTILINE | re.IGNORECASE,
        )
    ]


def field(text: str, *labels: str) -> str:
    """Return the first exact Markdown scalar field matching one of labels."""

    for label in labels:
        values = field_values(text, label)
        if values:
            return values[0]
    return ""


def normalized(value: str) -> str:
    value = value.replace("`", "").replace("“", '"').replace("”", '"')
    return re.sub(r"\s+", " ", value).strip(" `；;。.：:").lower()


def meaningful(value: str, *, allow_not_applicable: bool = False) -> bool:
    clean = normalized(value)
    if "{" in value or "}" in value:
        return False
    if allow_not_applicable and clean in {"not-applicable", "不适用"}:
        return True
    return clean not in PLACEHOLDERS


def dated(value: str) -> bool:
    return meaningful(value) and bool(DATE_RE.search(value))


def has_enum(value: str, token: str) -> bool:
    return bool(re.search(rf"(?<![a-z0-9-]){re.escape(token.lower())}(?![a-z0-9-])", value.lower()))


def same_evidence(left: str, right: str) -> bool:
    return bool(left and right) and normalized(left) == normalized(right)


def has_state_card(text: str) -> bool:
    return bool(re.search(r"^## Current state card\s*$", text, re.MULTILINE))


def state_card_blocks(text: str) -> list[str]:
    return [
        match.group(1)
        for match in re.finditer(
            r"^## Current state card\s*$\n(.*?)(?=^##\s|\Z)",
            text,
            re.MULTILINE | re.DOTALL,
        )
    ]


def code_values(value: str) -> list[str]:
    return [item.strip() for item in re.findall(r"`([^`]+)`", value)]


def first_relative_path(value: str, *, containing: str | None = None) -> str:
    for item in code_values(value):
        candidate = item.split("#", 1)[0].strip()
        if containing and containing.lower() not in candidate.lower():
            continue
        if "/" in candidate or candidate.lower().endswith((".md", ".pen", ".png")):
            return candidate
    return ""


def resolve_inside(root: Path, relative: str) -> tuple[Path | None, str | None]:
    if not relative:
        return None, "missing relative path"
    raw = Path(relative)
    if raw.is_absolute():
        return None, f"absolute path is not allowed: {relative}"
    resolved = (root / raw).resolve()
    try:
        resolved.relative_to(root.resolve())
    except ValueError:
        return None, f"path escapes Delivery root: {relative}"
    return resolved, None


def resolve_bundle_reference(
    delivery_root: Path,
    bundle_root: Path,
    relative: str,
) -> tuple[Path | None, str | None]:
    """Resolve a Delivery-relative or bundle-relative artifact path safely."""

    raw = Path(relative)
    if raw.is_absolute():
        return None, f"absolute path is not allowed: {relative}"
    try:
        bundle_relative = bundle_root.resolve().relative_to(delivery_root.resolve())
    except ValueError:
        return None, f"bundle root escapes Delivery root: {bundle_root}"
    if raw.parts[: len(bundle_relative.parts)] == bundle_relative.parts:
        return resolve_inside(delivery_root, relative)
    return resolve_inside(bundle_root, relative)


class Delivery:
    def __init__(self, entry: Path) -> None:
        self.entry = entry.resolve()
        self.root = self.entry.parent.resolve()
        self.text = self.entry.read_text(encoding="utf-8")

    def draft_root(self) -> tuple[Path | None, list[str]]:
        raw = field(self.text, "Current draft bundle root")
        if not meaningful(raw):
            if has_state_card(self.text):
                return None, ["missing current draft bundle root"]
            relative = "draft/"  # Historical entries predate the explicit field.
        else:
            relative = first_relative_path(raw)
            if not relative:
                return None, ["current draft bundle root is not a relative path"]
        resolved, error = resolve_inside(self.root, relative)
        return resolved, [f"invalid current draft bundle root: {error}"] if error else []


def check_state_card(delivery: Delivery, gate: str) -> list[str]:
    if not has_state_card(delivery.text):
        return []  # Historical Delivery compatibility; new templates always have the card.

    errors: list[str] = []
    blocks = state_card_blocks(delivery.text)
    if len(blocks) != 1:
        errors.append("START-HERE must contain exactly one Current state card")
    card = blocks[0] if blocks else ""
    labels = (
        "Phase",
        "Current gate / status",
        "Current blocker",
        "Allowed now",
        "Forbidden now",
        "Pass condition",
        "Next skill",
        "Next action / owner",
    )
    for label in labels:
        if len(field_values(card, label)) != 1:
            errors.append(f"state card must contain exactly one {label} field")
        if len(field_values(delivery.text, label)) > 1:
            errors.append(f"{label} must not be duplicated outside the state card")

    expected_phase, expected_action, expected_skill = GATE_CONTRACTS[gate]
    phase = field(card, "Phase")
    current_gate = field(card, "Current gate / status")
    blocker = field(card, "Current blocker")
    allowed = field(card, "Allowed now")
    forbidden = field(card, "Forbidden now")
    pass_condition = field(card, "Pass condition")
    next_skill = field(card, "Next skill")
    next_action = field(card, "Next action / owner")

    if not has_enum(phase, expected_phase):
        errors.append(f"state card Phase must be {expected_phase} for {gate}")
    if not has_enum(current_gate, gate) or not has_enum(current_gate, "ready"):
        errors.append(f"state card Current gate / status must be {gate} / ready")
    if normalized(blocker) != "none":
        errors.append("state card Current blocker must be none before a gate attempt")
    if not has_enum(allowed, expected_action):
        errors.append(f"state card Allowed now must include {expected_action}")
    if not meaningful(forbidden):
        errors.append("state card Forbidden now is missing")
    if has_enum(forbidden, expected_action):
        errors.append(f"state card Forbidden now contradicts allowed action {expected_action}")
    if not meaningful(pass_condition):
        errors.append("state card Pass condition is missing")
    if not has_enum(next_skill, expected_skill):
        errors.append(f"state card Next skill must be {expected_skill} for {gate}")
    if not meaningful(next_action):
        errors.append("state card Next action / owner is missing")
    return errors


def check_pen_approval(delivery: Delivery) -> list[str]:
    errors: list[str] = []
    draft, draft_errors = delivery.draft_root()
    errors.extend(draft_errors)
    if draft is None:
        return errors

    entry_approval = field(delivery.text, "Scope/fidelity approval")
    if not dated(entry_approval):
        errors.append("START-HERE lacks explicit dated scope/fidelity approval")

    brief = draft / "experience" / "brief.md"
    if not brief.is_file():
        errors.append(f"missing Experience brief: {brief}")
        return errors

    brief_text = brief.read_text(encoding="utf-8")
    brief_approval = field(
        brief_text,
        "Scope/fidelity approval words / date",
        "PM/业务 Owner 接受证据",
    )
    if not dated(brief_approval):
        errors.append("Experience brief lacks explicit dated scope/fidelity approval")
    elif not same_evidence(entry_approval, brief_approval):
        errors.append("scope/fidelity approval differs between START-HERE and Experience brief")

    scope = field(brief_text, "Smallest affected scope", "目标")
    fidelity = field(brief_text, "Fidelity / interaction / surface", "推荐范围（请明确接受后才开始制作）")
    if not meaningful(scope):
        errors.append("Experience brief lacks a concrete smallest affected scope")
    if not meaningful(fidelity):
        # Historical custom briefs can express the recommendation as a section body.
        if not re.search(r"^## 推荐范围", brief_text, re.MULTILINE):
            errors.append("Experience brief lacks a concrete fidelity/interaction recommendation")
    return errors


def load_experience_manifest(delivery: Delivery) -> tuple[Path | None, str, list[str]]:
    draft, draft_errors = delivery.draft_root()
    if draft is None:
        return None, "", draft_errors
    manifest = draft / "experience" / "manifest.md"
    if not manifest.is_file():
        return manifest, "", draft_errors + [f"missing Experience manifest: {manifest}"]
    return manifest, manifest.read_text(encoding="utf-8"), draft_errors


def check_recorded_artifact_paths(
    delivery: Delivery,
    draft: Path,
    *values: str,
) -> list[str]:
    errors: list[str] = []
    seen: set[str] = set()
    for value in values:
        for raw in code_values(value):
            relative = raw.split("#", 1)[0].strip()
            if (
                not relative
                or relative in seen
                or "*" in relative
                or not relative.lower().endswith((".md", ".pen", ".png"))
            ):
                continue
            seen.add(relative)
            resolved, path_error = resolve_bundle_reference(delivery.root, draft, relative)
            if path_error:
                errors.append(f"invalid Candidate reference: {path_error}")
            elif resolved is not None and not resolved.exists():
                errors.append(f"Candidate reference does not exist: {resolved}")
    return errors


def check_candidate_intent(delivery: Delivery) -> list[str]:
    if has_state_card(delivery.text):
        return []  # The current gate/status is checked separately.
    candidate = field(delivery.text, "Candidate status")
    if not has_enum(candidate, "ready"):
        return ["before-candidate requires Candidate status ready in this historical Delivery"]
    return []


def check_candidate_evidence(delivery: Delivery, *, require_intent: bool) -> list[str]:
    errors: list[str] = []
    if require_intent:
        errors.extend(check_candidate_intent(delivery))

    target_line = field(delivery.text, "Target / status / reason")
    preview = field(delivery.text, "Rendered preview shown / date", "Preview shown")
    approval = field(delivery.text, "PM/Owner preview approval words / date")
    unresolved = field(delivery.text, "Unresolved feedback")
    missing_coverage = field(delivery.text, "Missing coverage")

    if not has_enum(preview, "yes") or not dated(preview):
        errors.append("Candidate lacks dated rendered-preview evidence")
    if not dated(approval):
        errors.append("Candidate lacks a later explicit dated PM/Owner preview approval")
    if normalized(unresolved) != "none":
        errors.append("Candidate still has unresolved feedback")
    if normalized(missing_coverage) != "none":
        errors.append("Candidate still has missing Experience coverage")

    draft, draft_errors = delivery.draft_root()
    errors.extend(draft_errors)
    if draft is None:
        return errors

    errors.extend(
        check_recorded_artifact_paths(
            delivery,
            draft,
            field(delivery.text, "Brief / source / previews"),
            field(delivery.text, "Experience manifest"),
            field(delivery.text, "Included behavior / Experience"),
        )
    )

    if has_enum(target_line, "pen"):
        if has_enum(target_line, "completed"):
            errors.extend(check_pen_approval(delivery))
            identities = " ".join(
                [
                    field(delivery.text, "Brief / source / previews"),
                    field(delivery.text, "Experience manifest"),
                    field(delivery.text, "Included behavior / Experience"),
                ]
            )
            for identity, label in (
                ("experience/brief.md", "Brief"),
                ("experience/prototype.pen", "Pen source"),
                (".png", "preview PNG"),
                ("experience/manifest.md", "Experience manifest"),
            ):
                if identity not in identities:
                    errors.append(f"completed Pen target lacks {label} identity")

            prototype = draft / "experience" / "prototype.pen"
            previews = draft / "experience" / "previews"
            if not prototype.is_file():
                errors.append(f"completed Pen target lacks source artifact: {prototype}")
            if not previews.is_dir() or not any(previews.glob("*.png")):
                errors.append(f"completed Pen target lacks preview PNG under: {previews}")

            _, manifest_text, manifest_errors = load_experience_manifest(delivery)
            errors.extend(manifest_errors)
            if manifest_text:
                manifest_status = field(manifest_text, "Experience status", "experience_status")
                manifest_role = field(manifest_text, "Visual role", "visual_role")
                manifest_save = field(manifest_text, "Save status", "save_status")
                manifest_scope_approval = field(
                    manifest_text,
                    "Scope/fidelity approval",
                    "scope/fidelity approval",
                )
                manifest_preview_approval = field(
                    manifest_text,
                    "PM/Owner preview approval words / date",
                )
                if not has_enum(manifest_status, "completed"):
                    errors.append("Experience manifest status is not completed")
                if not has_enum(manifest_role, "implementation-target"):
                    errors.append("Experience manifest visual role is not implementation-target")
                if not has_enum(manifest_save, "saved"):
                    errors.append("Experience manifest save status is not saved")
                if not dated(manifest_scope_approval):
                    errors.append("Experience manifest lacks dated scope/fidelity approval")
                elif not same_evidence(
                    manifest_scope_approval,
                    field(delivery.text, "Scope/fidelity approval"),
                ):
                    errors.append("scope/fidelity approval differs between START-HERE and Experience manifest")
                if not dated(manifest_preview_approval):
                    errors.append("Experience manifest lacks later explicit dated preview approval")
                elif not same_evidence(manifest_preview_approval, approval):
                    errors.append("preview approval differs between START-HERE and Experience manifest")
        elif has_enum(target_line, "skipped-risk"):
            continuation = field(delivery.text, "Skip/unavailable continuation")
            if not dated(continuation):
                errors.append("risk-skipped Pen target lacks explicit dated PM/Owner continuation")

            _, manifest_text, manifest_errors = load_experience_manifest(delivery)
            errors.extend(manifest_errors)
            if manifest_text:
                manifest_status = field(manifest_text, "Experience status", "experience_status")
                manifest_continuation = field(manifest_text, "PM/Owner continuation")
                product_risk = field(manifest_text, "Product risk")
                if not has_enum(manifest_status, "skipped-risk"):
                    errors.append("Experience manifest status is not skipped-risk")
                if not dated(manifest_continuation):
                    errors.append("Experience manifest lacks dated PM/Owner continuation")
                elif not same_evidence(manifest_continuation, continuation):
                    errors.append("risk continuation differs between START-HERE and Experience manifest")
                if not meaningful(product_risk):
                    errors.append("risk-skipped Experience lacks a concrete product risk")

                reason = field(manifest_text, "Experience reason", "experience_reason")
                route = field(manifest_text, "Direct route", "Internal route", "route_identity")
                if has_enum(reason, "tool-unavailable") or has_enum(route, "unavailable"):
                    required = (
                        ("Unavailable limitation", False),
                        ("Route discovery evidence", False),
                        ("Capability check evidence", False),
                        ("Direct-operation attempt", False),
                        ("Retry result", True),
                    )
                    for label, allow_na in required:
                        if not meaningful(field(manifest_text, label), allow_not_applicable=allow_na):
                            errors.append(f"tool-unavailable Experience lacks {label}")
        else:
            errors.append("Pen Experience is neither completed nor explicitly risk-skipped")
    elif has_enum(target_line, "existing-reference"):
        if not has_enum(target_line, "completed"):
            errors.append("existing-reference Experience is not completed")
        identities = field(delivery.text, "Brief / source / previews")
        if not meaningful(identities) or has_enum(identities, "none"):
            errors.append("existing-reference Experience lacks exact reference identity")
    elif has_enum(target_line, "not-needed"):
        if not has_enum(target_line, "completed"):
            errors.append("not-needed Experience is not completed")
        reason = target_line.rsplit("/", 1)[-1]
        if not meaningful(reason):
            errors.append("not-needed Experience lacks a reason")
    else:
        errors.append("Experience target is missing or invalid")
    return errors


def check_candidate_manifest(delivery: Delivery) -> list[str]:
    errors: list[str] = []
    candidate_result = field(delivery.text, "Candidate gate result / date")
    legacy_candidate = field(delivery.text, "Candidate status")
    if has_state_card(delivery.text):
        if not has_enum(candidate_result, "passed") or not dated(candidate_result):
            errors.append("Candidate gate result is not passed with a date")
    elif not has_enum(legacy_candidate, "ready"):
        errors.append("historical Candidate status is not ready")

    manifest = field(delivery.text, "Bundle root / manifest")
    active_scope = field(delivery.text, "Active unit or Slice")
    included_files = field(delivery.text, "Included files / shared dependencies")
    included_experience = field(delivery.text, "Included behavior / Experience")
    if not meaningful(manifest):
        errors.append("Candidate lacks exact bundle manifest or reading order")
    if not meaningful(active_scope):
        errors.append("Candidate lacks exact active scope")
    if not meaningful(included_files):
        errors.append("Candidate lacks included files/shared dependencies")
    if not meaningful(included_experience):
        errors.append("Candidate lacks included Experience identity")

    draft, draft_errors = delivery.draft_root()
    errors.extend(draft_errors)
    if draft is None:
        return errors

    manifest_tokens = [
        raw.split("#", 1)[0].strip()
        for raw in code_values(manifest)
        if raw.split("#", 1)[0].strip()
    ]
    bundle_identity = next(
        (
            token
            for token in manifest_tokens
            if token.endswith("/") or ("/" in token and not Path(token).suffix)
        ),
        "",
    )
    if not bundle_identity:
        errors.append("Candidate manifest field lacks an exact bundle root")
    else:
        resolved_bundle, path_error = resolve_inside(delivery.root, bundle_identity)
        if path_error:
            errors.append(f"invalid Candidate bundle root: {path_error}")
        elif resolved_bundle != draft:
            errors.append("Candidate bundle root differs from Current draft bundle root")

    manifest_path = first_relative_path(manifest, containing="manifest")
    if manifest_path:
        resolved, path_error = resolve_bundle_reference(delivery.root, draft, manifest_path)
        if path_error:
            errors.append(f"invalid Candidate manifest path: {path_error}")
        elif resolved is not None and not resolved.is_file():
            errors.append(f"Candidate manifest does not exist: {resolved}")
    else:
        inline_markdown = re.findall(r"`([^`]+\.md)`", manifest, re.IGNORECASE)
        if len(inline_markdown) < 1:
            errors.append("Candidate manifest field has neither a manifest file nor an exact inline reading order")
        errors.extend(check_recorded_artifact_paths(delivery, draft, manifest))

    errors.extend(
        check_recorded_artifact_paths(
            delivery,
            draft,
            included_files,
            included_experience,
            field(delivery.text, "Brief / source / previews"),
            field(delivery.text, "Experience manifest"),
        )
    )
    return errors


def handoff_row(text: str, name: str) -> tuple[str, str]:
    match = re.search(
        rf"^\|\s*{re.escape(name)}\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|$",
        text,
        re.MULTILINE | re.IGNORECASE,
    )
    return (match.group(1).strip(), match.group(2).strip()) if match else ("", "")


def finding_dispositions(text: str) -> list[str]:
    dispositions: list[str] = []
    pattern = re.compile(
        r"\|\s*`?(open|addressed-awaiting-review|closed|accepted-risk|withdrawn)`?\s*\|\s*[^|]*\|\s*$",
        re.IGNORECASE,
    )
    for line in text.splitlines():
        if not re.match(r"^\|\s*`?FND-", line, re.IGNORECASE):
            continue
        match = pattern.search(line)
        if match:
            dispositions.append(match.group(1).lower())
    return dispositions


def check_review_status_integrity(delivery: Delivery, review_status: str) -> list[str]:
    errors: list[str] = []
    dispositions = finding_dispositions(delivery.text)
    pending = {"open", "addressed-awaiting-review"}
    if has_enum(review_status, "passed") and any(
        item in pending or item == "accepted-risk" for item in dispositions
    ):
        errors.append("passed Review contradicts pending or accepted-risk Findings")
    if has_enum(review_status, "findings-open") and not any(
        item in pending for item in dispositions
    ):
        errors.append("findings-open Review lacks an open or awaiting-review Finding")
    if has_enum(review_status, "accepted-risk"):
        if any(item in pending for item in dispositions) or "accepted-risk" not in dispositions:
            errors.append("accepted-risk Review has inconsistent Finding dispositions")
    if has_enum(review_status, "skipped") and any(item in pending for item in dispositions):
        errors.append("skipped Review cannot hide applicable pending Findings")
    return errors


def check_before_pen(delivery: Delivery) -> list[str]:
    errors = check_state_card(delivery, "before-pen")
    target = field(delivery.text, "Target / status / reason")
    if not has_enum(target, "pen"):
        errors.append("before-pen requires Experience target pen")
    errors.extend(check_pen_approval(delivery))
    return errors


def check_before_candidate(delivery: Delivery) -> list[str]:
    errors = check_state_card(delivery, "before-candidate")
    if has_state_card(delivery.text):
        candidate_result = field(delivery.text, "Candidate gate result / date")
        if not has_enum(candidate_result, "pending"):
            errors.append("Candidate gate result must remain pending until validation passes")
    errors.extend(check_candidate_evidence(delivery, require_intent=True))
    return errors


def check_before_review(delivery: Delivery) -> list[str]:
    errors = check_state_card(delivery, "before-review")
    errors.extend(check_candidate_evidence(delivery, require_intent=False))
    errors.extend(check_candidate_manifest(delivery))
    return errors


def check_before_release(delivery: Delivery) -> list[str]:
    errors = check_state_card(delivery, "before-release")
    errors.extend(check_candidate_evidence(delivery, require_intent=False))
    errors.extend(check_candidate_manifest(delivery))

    review_status = field(delivery.text, "Review status")
    review_check, review_evidence = handoff_row(delivery.text, "Review")
    errors.extend(check_review_status_integrity(delivery, review_status))
    review_binding = field(delivery.text, "Candidate bundle root / scope / included Experience")
    if not meaningful(review_binding):
        errors.append("Review choice lacks current Candidate/scope/Experience binding")

    reviewed = any(
        has_enum(review_status, item)
        for item in ("passed", "findings-open", "accepted-risk")
    )
    if reviewed:
        validity = field(delivery.text, "Review validity / historical reports")
        if not has_enum(validity, "current"):
            errors.append("reviewed status requires a current Review binding")
        report = field(delivery.text, "Report / mode")
        report_path = first_relative_path(report, containing="review")
        if not report_path:
            errors.append("reviewed status lacks a report path")
        else:
            resolved, path_error = resolve_inside(delivery.root, report_path)
            if path_error:
                errors.append(f"invalid Review report path: {path_error}")
            elif resolved is not None and not resolved.is_file():
                errors.append(f"Review report does not exist: {resolved}")

    if has_enum(review_status, "passed"):
        if not has_enum(review_check, "done"):
            errors.append("passed Review requires the Review handoff check to be done")
    elif any(has_enum(review_status, item) for item in ("skipped", "findings-open", "accepted-risk")):
        if not has_enum(review_check, "accepted-risk") or not dated(review_evidence):
            errors.append("non-passed Review requires explicit dated risk-handoff evidence")
    else:
        errors.append("Review is neither passed nor explicitly skipped/risk-accepted")

    for name in ("Behavior", "Experience"):
        status, evidence = handoff_row(delivery.text, name)
        if not any(has_enum(status, item) for item in ("done", "accepted-risk")):
            errors.append(f"{name} handoff check is incomplete")
        elif has_enum(status, "accepted-risk") and not dated(evidence):
            errors.append(f"{name} accepted-risk check lacks dated Owner evidence")
        elif has_enum(status, "done") and not meaningful(evidence):
            errors.append(f"{name} completed handoff check lacks evidence")

    confirmation, confirmation_evidence = handoff_row(delivery.text, "Confirmation")
    if not has_enum(confirmation, "done") or not dated(confirmation_evidence):
        errors.append("Confirmation handoff check lacks explicit dated handoff approval")

    current_release = field(delivery.text, "Current Release")
    lifecycle = field(delivery.text, "Lifecycle")
    planned_release = field(delivery.text, "Planned Release / snapshot root")
    planned_manifest = field(delivery.text, "Planned Release manifest / reading order")
    sent = field(delivery.text, "Release sent / date", "Release sent")
    receipt = field(delivery.text, "Receipt status")
    acknowledgement = field(delivery.text, "Acknowledgement words / date", "Acknowledgement")

    current_release_path: Path | None = None
    if normalized(current_release) != "none":
        current_release_identity = first_relative_path(current_release, containing="releases/")
        if not current_release_identity:
            errors.append("existing Current Release lacks a relative snapshot path")
        else:
            current_release_path, path_error = resolve_inside(
                delivery.root,
                current_release_identity,
            )
            if path_error:
                errors.append(f"invalid Current Release path: {path_error}")
            elif current_release_path is not None:
                if not current_release_path.is_dir():
                    errors.append(f"Current Release snapshot does not exist: {current_release_path}")
                elif not (current_release_path / "MANIFEST.md").is_file():
                    errors.append(
                        f"Current Release MANIFEST.md does not exist: {current_release_path / 'MANIFEST.md'}"
                    )
    if not has_enum(lifecycle, "draft"):
        errors.append("before-release requires lifecycle draft")
    planned_root = first_relative_path(planned_release, containing="releases/")
    if not planned_root:
        errors.append("planned Release ID/snapshot root is missing")
    else:
        planned_path, path_error = resolve_inside(delivery.root, planned_root)
        if path_error:
            errors.append(f"invalid planned Release root: {path_error}")
        elif current_release_path is not None and planned_path == current_release_path:
            errors.append("planned Release must not overwrite the current immutable snapshot")
        elif planned_path is not None and planned_path.exists():
            errors.append("planned Release destination already exists; immutable snapshot paths must be new")
    if not meaningful(planned_manifest):
        errors.append("planned Release manifest/reading order is missing")
    if not has_enum(sent, "no"):
        errors.append("before-release requires Release sent to remain no")
    if not has_enum(receipt, "pending"):
        errors.append("before-release requires receipt status pending")
    if meaningful(acknowledgement):
        errors.append("before-release must not contain development acknowledgement")
    return errors


def check_before_receipt_close(delivery: Delivery) -> list[str]:
    errors = check_state_card(delivery, "before-receipt-close")
    lifecycle = field(delivery.text, "Lifecycle")
    intended_use = field(delivery.text, "Intended use")
    current_release = field(delivery.text, "Current Release")
    sent = field(delivery.text, "Release sent / date", "Release sent")
    receipt = field(delivery.text, "Receipt status")
    acknowledgement = field(delivery.text, "Acknowledgement words / date", "Acknowledgement")
    gate_result = field(delivery.text, "Receipt-close gate result / date")

    if not has_enum(lifecycle, "released"):
        errors.append("receipt close requires lifecycle released")
    if not has_enum(intended_use, "implementation"):
        errors.append("released snapshot intended use must be implementation")

    release_path = first_relative_path(current_release, containing="releases/")
    if not release_path:
        errors.append("receipt close lacks Current Release path")
    else:
        resolved, path_error = resolve_inside(delivery.root, release_path)
        if path_error:
            errors.append(f"invalid Current Release path: {path_error}")
        elif resolved is not None:
            if not resolved.is_dir():
                errors.append(f"Current Release snapshot does not exist: {resolved}")
            elif not (resolved / "MANIFEST.md").is_file():
                errors.append(f"Current Release MANIFEST.md does not exist: {resolved / 'MANIFEST.md'}")

    if not has_enum(sent, "yes") or not dated(sent):
        errors.append("receipt close requires dated Release-sent evidence")
    if not has_enum(receipt, "pending"):
        errors.append("receipt must remain pending until this gate passes")
    if not dated(acknowledgement):
        errors.append("receipt close lacks explicit dated development acknowledgement")
    if not has_enum(gate_result, "pending"):
        errors.append("Receipt-close gate result must remain pending until validation passes")
    return errors


CHECKS = {
    "before-pen": check_before_pen,
    "before-candidate": check_before_candidate,
    "before-review": check_before_review,
    "before-release": check_before_release,
    "before-receipt-close": check_before_receipt_close,
}


def validate(entry: Path, gate: str) -> list[str]:
    if gate not in CHECKS:
        return [f"unknown gate: {gate}"]
    if not entry.is_file():
        return [f"missing START-HERE: {entry}"]
    try:
        delivery = Delivery(entry)
        return CHECKS[gate](delivery)
    except (OSError, UnicodeError) as error:
        return [f"cannot read Delivery evidence: {error}"]


def self_test() -> int:
    assert field("- Phase：`candidate`", "Phase") == "`candidate`"
    assert dated("Owner replied 2026-07-30")
    assert not dated("pending")
    assert has_enum("`before-review` / `ready`", "before-review")
    assert has_enum("`pm-reverse-review`", "pm-reverse-review")
    assert not meaningful("{placeholder}")
    assert same_evidence("批准 / 2026-07-30", "批准 / 2026-07-30")
    print("PASS: validate_delivery self-test")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_mutually_exclusive_group(required=True)
    for gate in CHECKS:
        modes.add_argument(f"--{gate}", action="store_true")
    modes.add_argument("--self-test", action="store_true")
    parser.add_argument("entry", nargs="?", type=Path)
    args = parser.parse_args()

    if args.self_test:
        return self_test()
    if args.entry is None:
        parser.error("START-HERE path is required")

    gate = next(name for name in CHECKS if getattr(args, name.replace("-", "_")))
    errors = validate(args.entry, gate)
    if errors:
        print(f"FAIL: {gate}", file=sys.stderr)
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    print(f"PASS: {gate}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
