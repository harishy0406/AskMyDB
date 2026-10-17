import re
from typing import Any

DATE_KEYWORDS = {
    "date", "time", "day", "month", "year", "quarter", "period", "week",
    "created_at", "updated_at", "timestamp", "datetime"
}

DATE_PATTERNS = [
    re.compile(r"^\d{4}-\d{2}-\d{2}"),  # YYYY-MM-DD
    re.compile(r"^\d{4}/\d{2}/\d{2}"),  # YYYY/MM/DD
    re.compile(r"^\d{4}-\d{2}"),        # YYYY-MM
    re.compile(r"^(19|20)\d{2}$"),      # Year 1900-2099
    re.compile(r"^[A-Za-z]{3,9}\s+\d{4}$"),  # Jan 2024, January 2024
]


def _is_temporal(col_name: str, sample_vals: list[Any]) -> bool:
    low = col_name.lower()
    if any(k in low for k in DATE_KEYWORDS):
        return True

    matches = 0
    checked = 0
    for v in sample_vals[:5]:
        if v is None:
            continue
        s = str(v).strip()
        checked += 1
        if any(pat.match(s) for pat in DATE_PATTERNS):
            matches += 1
    return checked > 0 and (matches / checked >= 0.6)


def build_chart_data(columns: list[str], rows: list[list[Any]]) -> dict | None:
    if not columns or not rows or len(columns) < 2:
        return None

    numeric_cols = []
    for i, col in enumerate(columns):
        vals = [row[i] for row in rows if row[i] is not None]
        if vals:
            try:
                float(vals[0])
                numeric_cols.append({"index": i, "name": col})
            except (ValueError, TypeError):
                pass

    if len(numeric_cols) < 1:
        return None

    label_col = columns[0]
    label_index = 0

    data = []
    for row in rows:
        point = {"name": str(row[label_index])}
        for nc in numeric_cols:
            try:
                point[nc["name"]] = float(row[nc["index"]]) if row[nc["index"]] is not None else 0
            except (ValueError, TypeError):
                point[nc["name"]] = 0
        data.append(point)

    # Check temporal suggestion
    sample_labels = [row[label_index] for row in rows[:10]]
    is_time_series = _is_temporal(label_col, sample_labels)
    suggested_type = "line" if is_time_series else "bar"

    # Check pie chart suitability
    can_pie = False
    if len(numeric_cols) == 1 and 2 <= len(rows) <= 10:
        metric_name = numeric_cols[0]["name"]
        metric_vals = [p[metric_name] for p in data]
        if all(v >= 0 for v in metric_vals) and sum(metric_vals) > 0:
            can_pie = True

    supported_types = ["bar", "line", "area"]
    if can_pie:
        supported_types.append("pie")

    return {
        "type": suggested_type,
        "suggested_type": suggested_type,
        "supported_types": supported_types,
        "can_pie": can_pie,
        "data": data,
        "x_key": "name",
        "lines": [nc["name"] for nc in numeric_cols],
    }

