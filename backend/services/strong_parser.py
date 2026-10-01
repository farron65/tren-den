# services/strong_parser.py
import re
from datetime import datetime
from zoneinfo import ZoneInfo

# TODO: make this per-user later
DEFAULT_TZ = ZoneInfo("America/New_York")

# Copied from the frontend. Check what your schema expects (see note below).
EXERCISE_REST_TIME = 180
SET_REST_TIME = 180000

DATE_FORMAT = "%A, %B %d, %Y at %H:%M"
SET_PATTERN = re.compile(r"^Set \d+: ([+-]?\d+(?:\.\d+)?) lb × (\d+)$")


class ImportParseError(ValueError):
    """Raised when the pasted workout text can't be parsed."""


def parse_strong(text: str) -> dict:
    text = text.replace("\r\n", "\n").strip()
    blocks = re.split(r"\n\s*\n", text)

    if len(blocks) < 2:
        raise ImportParseError("Expected a header and at least one exercise.")

    header = blocks[0].split("\n")
    if len(header) < 2:
        raise ImportParseError("Header must have a workout name and a date line.")

    workout_name = header[0].strip()
    date_line = header[1].strip()
    try:
        local_dt = datetime.strptime(date_line, DATE_FORMAT).replace(tzinfo=DEFAULT_TZ)
    except ValueError:
        raise ImportParseError(f"Invalid date line: {date_line!r}")

    exercises = []
    for block in blocks[1:]:
        lines = [l.strip() for l in block.split("\n") if l.strip()]
        lines = [l for l in lines if not l.startswith("http")]
        if not lines:
            continue

        sets = []
        for line in lines[1:]:
            m = SET_PATTERN.match(line)
            if not m:
                raise ImportParseError(f"Invalid set line: {line!r}")
            sets.append({
                "weight": float(m.group(1)),
                "reps": int(m.group(2)),
                "rest_time": SET_REST_TIME,
            })

        exercises.append({
            "exercise_name": lines[0],
            "rest_time": EXERCISE_REST_TIME,
            "sets": sets,
        })

    if not exercises:
        raise ImportParseError("No exercises found.")

    return {
        "workout_name": workout_name,
        "date": local_dt.astimezone(ZoneInfo("UTC")).isoformat(),
        "exercises": exercises,
    }