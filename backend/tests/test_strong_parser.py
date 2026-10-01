# tests/test_strong_parser.py
import pytest
from services.strong_parser import parse_strong, ImportParseError

SAMPLE = """LOWER A
Wednesday, September 30, 2026 at 16:07

Seated Leg Curl (Machine)
Set 1: 155 lb × 6

Hack Squat
Set 1: 215 lb × 6
Set 2: 225 lb × 6

Decline Crunch
Set 1: +70 lb × 6

Hip Abductor (Machine)
Set 1: 170 lb × 6
Set 2: 207.5 lb × 6
https://link.strong.app/wggcgdsi"""


def test_sample():
    w = parse_strong(SAMPLE)
    assert w["workout_name"] == "LOWER A"
    assert len(w["exercises"]) == 4
    assert len(w["exercises"][1]["sets"]) == 2
    assert w["exercises"][2]["sets"][0]["weight"] == 70.0
    assert w["exercises"][3]["sets"][1]["weight"] == 207.5
    assert w["date"].startswith("2026-09-30T20:07")  # 16:07 EDT = 20:07 UTC


def test_link_line_ignored():
    w = parse_strong(SAMPLE)
    assert all(s["reps"] > 0 for e in w["exercises"] for s in e["sets"])


def test_bad_date():
    with pytest.raises(ImportParseError):
        parse_strong("LOWER A\nnot a date\n\nHack Squat\nSet 1: 215 lb × 6")


def test_bad_set():
    with pytest.raises(ImportParseError):
        parse_strong(SAMPLE.replace("Set 1: 155 lb × 6", "Set 1: lots"))


def test_empty():
    with pytest.raises(ImportParseError):
        parse_strong("")