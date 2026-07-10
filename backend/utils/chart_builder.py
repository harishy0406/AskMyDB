from typing import Any


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

    return {
        "type": "bar",
        "data": data,
        "x_key": "name",
        "lines": [nc["name"] for nc in numeric_cols],
    }
