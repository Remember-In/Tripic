#!/usr/bin/env python3
"""Generate compact SVG path data for the Tripic travel map.

Input is the pinned 2026-07-01 admdongkor administrative-dong GeoJSON. The
script dissolves administrative districts that TourAPI exposes as one city
(for example Suwon's four gu), projects each province to a local SVG viewBox,
and writes the runtime JSON consumed by the React Native map.

The product keeps the Figma-defined 17 province cards. The 2026-07 source
combines Gwangju and Jeonnam under one legal-area prefix, so those source
features are deliberately split back into the two product areas here.

The script intentionally runs at development time only. The mobile app does
not parse GeoJSON or depend on Shapely at runtime.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
from typing import Any, Iterable

from shapely import affinity
from shapely.geometry import GeometryCollection, MultiPolygon, Polygon, shape
from shapely.ops import polylabel, unary_union


SOURCE_COMMIT = "7360288277dfd12d74e54b959c59bdd66f852e3a"
SOURCE_DATE = "2026-07-01"
SOURCE_SHA256 = "c01ef44a0eb00978662ba7a6240ccb1da287fb52abd85104a1758969d391132f"
SOURCE_URL = (
    "https://raw.githubusercontent.com/vuski/admdongkor/"
    f"{SOURCE_COMMIT}/ver20260701/HangJeongDong_ver20260701.geojson"
)


def districts(spec: str) -> list[tuple[str, str]]:
    return [tuple(value.split("=", 1)) for value in spec.split("|")]  # type: ignore[misc]


AREA_CONFIG: list[tuple[str, str, list[tuple[str | None, str]]]] = [
    (
        "1",
        "서울특별시",
        districts(
            "1=강남구|2=강동구|3=강북구|4=강서구|5=관악구|6=광진구|7=구로구|"
            "8=금천구|9=노원구|10=도봉구|11=동대문구|12=동작구|13=마포구|"
            "14=서대문구|15=서초구|16=성동구|17=성북구|18=송파구|19=양천구|"
            "20=영등포구|21=용산구|22=은평구|23=종로구|24=중구|25=중랑구"
        ),
    ),
    (
        "2",
        "인천광역시",
        districts(
            "1=강화군|2=계양구|3=미추홀구|4=남동구|6=부평구|8=연수구|"
            "9=옹진군|125=제물포구|155=영종구|275=서해구|290=검단구"
        ),
    ),
    ("3", "대전광역시", districts("1=대덕구|2=동구|3=서구|4=유성구|5=중구")),
    (
        "4",
        "대구광역시",
        districts(
            "1=남구|2=달서구|3=달성군|4=동구|5=북구|6=서구|7=수성구|8=중구|9=군위군"
        ),
    ),
    (
        "5",
        "전남광주통합특별시",
        districts("1=광산구|2=남구|3=동구|4=북구|5=서구"),
    ),
    (
        "6",
        "부산광역시",
        districts(
            "1=강서구|2=금정구|3=기장군|4=남구|5=동구|6=동래구|7=부산진구|"
            "8=북구|9=사상구|10=사하구|11=서구|12=수영구|13=연제구|14=영도구|"
            "15=중구|16=해운대구"
        ),
    ),
    ("7", "울산광역시", districts("1=중구|2=남구|3=동구|4=북구|5=울주군")),
    ("8", "세종특별자치시", [(None, "세종시")]),
    (
        "31",
        "경기도",
        districts(
            "1=가평군|2=고양시|3=과천시|4=광명시|5=광주시|6=구리시|7=군포시|"
            "8=김포시|9=남양주시|10=동두천시|11=부천시|12=성남시|13=수원시|"
            "14=시흥시|15=안산시|16=안성시|17=안양시|18=양주시|19=양평군|"
            "20=여주시|21=연천군|22=오산시|23=용인시|24=의왕시|25=의정부시|"
            "26=이천시|27=파주시|28=평택시|29=포천시|30=하남시|31=화성시"
        ),
    ),
    (
        "32",
        "강원특별자치도",
        districts(
            "1=강릉시|2=고성군|3=동해시|4=삼척시|5=속초시|6=양구군|7=양양군|"
            "8=영월군|9=원주시|10=인제군|11=정선군|12=철원군|13=춘천시|"
            "14=태백시|15=평창군|16=홍천군|17=화천군|18=횡성군"
        ),
    ),
    (
        "33",
        "충청북도",
        districts(
            "1=괴산군|2=단양군|3=보은군|4=영동군|5=옥천군|6=음성군|7=제천시|"
            "8=진천군|10=청주시|11=충주시|12=증평군"
        ),
    ),
    (
        "34",
        "충청남도",
        districts(
            "1=공주시|2=금산군|3=논산시|4=당진시|5=보령시|6=부여군|7=서산시|"
            "8=서천군|9=아산시|11=예산군|12=천안시|13=청양군|14=태안군|"
            "15=홍성군|16=계룡시"
        ),
    ),
    (
        "35",
        "경상북도",
        districts(
            "1=경산시|2=경주시|3=고령군|4=구미시|6=김천시|7=문경시|8=봉화군|"
            "9=상주시|10=성주군|11=안동시|12=영덕군|13=영양군|14=영주시|"
            "15=영천시|16=예천군|17=울릉군|18=울진군|19=의성군|20=청도군|"
            "21=청송군|22=칠곡군|23=포항시"
        ),
    ),
    (
        "36",
        "경상남도",
        districts(
            "1=거제시|2=거창군|3=고성군|4=김해시|5=남해군|7=밀양시|8=사천시|"
            "9=산청군|10=양산시|12=의령군|13=진주시|15=창녕군|16=창원시|"
            "17=통영시|18=하동군|19=함안군|20=함양군|21=합천군"
        ),
    ),
    (
        "37",
        "전북특별자치도",
        districts(
            "1=고창군|2=군산시|3=김제시|4=남원시|5=무주군|6=부안군|7=순창군|"
            "8=완주군|9=익산시|10=임실군|11=장수군|12=전주시|13=정읍시|14=진안군"
        ),
    ),
    (
        "38",
        "전남광주통합특별시",
        districts(
            "1=강진군|2=고흥군|3=곡성군|4=광양시|5=구례군|6=나주시|7=담양군|"
            "8=목포시|9=무안군|10=보성군|11=순천시|12=신안군|13=여수시|"
            "16=영광군|17=영암군|18=완도군|19=장성군|20=장흥군|21=진도군|"
            "22=함평군|23=해남군|24=화순군"
        ),
    ),
    ("39", "제주특별자치도", districts("3=서귀포시|4=제주시")),
]

# 두 제품 영역이 동일한 최신 법정동 시·도 원본을 나눠 사용한다. 따라서 다른
# 쪽 지역이 할당되지 않았다는 이유로 생성에 실패하면 안 된다.
PARTIAL_SOURCE_AREA_CODES = {"5", "38"}

INSET_TARGETS = {
    ("2", "옹진군"): ("left", 0.3, 0.65),
    ("35", "울릉군"): ("right", 0.18, 0.15),
    ("38", "신안군"): ("left", 0.34, 0.58),
}

LABEL_FONT_SIZE_OVERRIDES = {
    "2": 20,
    "4": 26,
    "6": 20,
    "31": 16,
    "35": 22,
    "36": 20,
    "38": 18,
}


def iter_polygons(geometry: Any) -> Iterable[Polygon]:
    if isinstance(geometry, Polygon):
        yield geometry
    elif isinstance(geometry, MultiPolygon):
        yield from geometry.geoms
    elif isinstance(geometry, GeometryCollection):
        for child in geometry.geoms:
            yield from iter_polygons(child)


def format_number(value: float) -> str:
    rounded = round(value, 1)
    if rounded == -0.0:
        rounded = 0.0
    return f"{rounded:g}"


def ring_path(coordinates: Iterable[tuple[float, float]]) -> str:
    points = [(round(x, 1), round(y, 1)) for x, y in coordinates]
    if points and points[0] == points[-1]:
        points.pop()

    compact_points: list[tuple[float, float]] = []
    for point in points:
        if not compact_points or compact_points[-1] != point:
            compact_points.append(point)

    if len(set(compact_points)) < 3:
        return ""

    signed_double_area = sum(
        left[0] * right[1] - right[0] * left[1]
        for left, right in zip(
            compact_points, compact_points[1:] + compact_points[:1]
        )
    )
    if abs(signed_double_area) < 0.02:
        return ""

    rounded_polygon = Polygon(compact_points)
    if not rounded_polygon.is_valid or rounded_polygon.area < 0.01:
        return ""

    commands = [
        f"M {format_number(compact_points[0][0])} "
        f"{format_number(compact_points[0][1])}"
    ]
    commands.extend(
        f"L {format_number(x)} {format_number(y)}" for x, y in compact_points[1:]
    )
    commands.append("Z")
    return " ".join(commands)


def geometry_path(geometry: Any) -> str:
    paths: list[str] = []
    for polygon in sorted(iter_polygons(geometry), key=lambda item: item.area, reverse=True):
        if polygon.area < 0.02:
            continue
        exterior_path = ring_path(polygon.exterior.coords)
        if exterior_path:
            paths.append(exterior_path)
        for interior in polygon.interiors:
            interior_path = ring_path(interior.coords)
            if interior_path:
                paths.append(interior_path)
    return " ".join(paths)


def transformed_geometry(geometry: Any, transform_point: Any) -> Any:
    from shapely.ops import transform

    return transform(transform_point, geometry)


def focus_view_box(geometry: Any, map_width: float, map_height: float) -> str:
    min_x, min_y, max_x, max_y = geometry.bounds
    width = max_x - min_x
    height = max_y - min_y
    map_aspect_ratio = map_width / map_height
    padded_width = max(width * 1.28, map_width * 0.2)
    padded_height = max(height * 1.28, map_height * 0.2)

    if padded_width / padded_height > map_aspect_ratio:
        target_width = padded_width
        target_height = padded_width / map_aspect_ratio
    else:
        target_height = padded_height
        target_width = padded_height * map_aspect_ratio

    # 넓은 군·도서 지역도 선택 시 최소 약 1.28배 확대가 체감되도록 한다.
    maximum_focus_ratio = 0.78
    scale = min(
        1.0,
        map_width * maximum_focus_ratio / target_width,
        map_height * maximum_focus_ratio / target_height,
    )
    target_width *= scale
    target_height *= scale

    center_x, center_y = label_point(geometry)
    left = max(0.0, min(center_x - target_width / 2, map_width - target_width))
    top = max(0.0, min(center_y - target_height / 2, map_height - target_height))
    return " ".join(
        format_number(value) for value in (left, top, target_width, target_height)
    )


def label_point(geometry: Any) -> tuple[float, float]:
    polygons = list(iter_polygons(geometry))
    largest = max(polygons, key=lambda item: item.area)
    try:
        point = polylabel(largest, tolerance=1.5)
    except Exception:
        point = largest.representative_point()
    return point.x, point.y


def arrange_remote_district_inset(
    projected: list[tuple[str | None, str, list[str], Any]],
    area_code: str,
) -> list[tuple[str | None, str, list[str], Any]]:
    output = list(projected)
    for index, (sigungu_code, name, administrative_codes, geometry) in enumerate(
        output
    ):
        inset = INSET_TARGETS.get((area_code, name))
        if not inset:
            continue

        base = unary_union(
            [item[3] for item_index, item in enumerate(output) if item_index != index]
        )
        base_min_x, base_min_y, base_max_x, base_max_y = base.bounds
        base_width = base_max_x - base_min_x
        base_height = base_max_y - base_min_y
        min_x, min_y, max_x, max_y = geometry.bounds
        width = max_x - min_x
        height = max_y - min_y
        side, width_ratio, vertical_ratio = inset
        factor = min(base_width * width_ratio / width, base_height * 0.55 / height)
        compact = affinity.scale(geometry, xfact=factor, yfact=factor, origin="center")
        compact_min_x, compact_min_y, compact_max_x, compact_max_y = compact.bounds
        compact_width = compact_max_x - compact_min_x
        compact_height = compact_max_y - compact_min_y
        gap = base_width * 0.06
        target_min_x = (
            base_min_x - gap - compact_width
            if side == "left"
            else base_max_x + gap
        )
        target_center_y = base_min_y + base_height * vertical_ratio
        compact = affinity.translate(
            compact,
            xoff=target_min_x - compact_min_x,
            yoff=target_center_y - compact_height / 2 - compact_min_y,
        )
        output[index] = (sigungu_code, name, administrative_codes, compact)

    return output


def normalized_districts(
    feature_collection: dict[str, Any],
    area_code: str,
    sido_name: str,
    target_districts: list[tuple[str | None, str]],
) -> dict[str, Any]:
    features = [
        feature
        for feature in feature_collection["features"]
        if feature["properties"]["sidonm"] == sido_name
    ]
    source_names = {feature["properties"]["sggnm"] for feature in features}
    assignment: dict[str, tuple[str | None, str]] = {}

    for sigungu_code, target_name in target_districts:
        for source_name in source_names:
            if source_name == target_name or source_name.startswith(target_name):
                if source_name in assignment:
                    raise ValueError(f"{sido_name} {source_name} matched more than once")
                assignment[source_name] = (sigungu_code, target_name)

    unassigned = sorted(source_names - assignment.keys())
    if unassigned and area_code not in PARTIAL_SOURCE_AREA_CODES:
        raise ValueError(f"Unassigned districts in {sido_name}: {unassigned}")

    dissolved: list[tuple[str | None, str, list[str], Any]] = []
    for sigungu_code, target_name in target_districts:
        matching = [
            shape(feature["geometry"])
            for feature in features
            if assignment.get(feature["properties"]["sggnm"])
            == (sigungu_code, target_name)
        ]
        if not matching:
            raise ValueError(f"Missing geometry for {sido_name} {target_name}")
        administrative_codes = sorted(
            {
                feature["properties"]["sgg"]
                for feature in features
                if assignment.get(feature["properties"]["sggnm"])
                == (sigungu_code, target_name)
            }
        )
        dissolved.append(
            (sigungu_code, target_name, administrative_codes, unary_union(matching))
        )

    area_geometry = unary_union([geometry for _, _, _, geometry in dissolved])
    min_lon, min_lat, max_lon, max_lat = area_geometry.bounds
    cosine = math.cos(math.radians((min_lat + max_lat) / 2))

    def project(x: Any, y: Any, z: Any = None) -> tuple[Any, Any]:
        return x * cosine, -y

    projected = [
        (
            sigungu_code,
            name,
            administrative_codes,
            transformed_geometry(geometry, project),
        )
        for sigungu_code, name, administrative_codes, geometry in dissolved
    ]
    projected = arrange_remote_district_inset(projected, area_code)
    area_projected = unary_union([geometry for _, _, _, geometry in projected])
    min_x, min_y, max_x, max_y = area_projected.bounds
    projected_width = max_x - min_x
    projected_height = max_y - min_y
    padding = projected_width * 0.035
    scale = 800.0 / (projected_width + padding * 2)
    map_height = (projected_height + padding * 2) * scale

    def normalize(x: Any, y: Any, z: Any = None) -> tuple[Any, Any]:
        return (x - min_x + padding) * scale, (y - min_y + padding) * scale

    simplify_tolerance = max(projected_width, projected_height) / 850
    output_districts: list[dict[str, Any]] = []
    for sigungu_code, name, administrative_codes, geometry in projected:
        geometry = geometry.simplify(simplify_tolerance, preserve_topology=True)
        geometry = transformed_geometry(geometry, normalize)
        if (area_code, name) in INSET_TARGETS:
            inset_min_x, inset_min_y, inset_max_x, inset_max_y = geometry.bounds
            label_x, label_y = (
                (inset_min_x + inset_max_x) / 2,
                (inset_min_y + inset_max_y) / 2,
            )
        else:
            label_x, label_y = label_point(geometry)
        output_districts.append(
            {
                "administrativeCodes": administrative_codes,
                "sigunguCode": sigungu_code,
                "name": name,
                "path": geometry_path(geometry),
                "focusViewBox": focus_view_box(geometry, 800.0, map_height),
                "labelX": round(label_x, 1),
                "labelY": round(label_y, 1),
            }
        )

    district_count = len(output_districts)
    label_font_size = 38 if district_count <= 5 else 32 if district_count <= 12 else 26
    if district_count > 22:
        label_font_size = 20
    label_font_size = LABEL_FONT_SIZE_OVERRIDES.get(area_code, label_font_size)

    return {
        "areaCode": area_code,
        "viewBox": f"0 0 800 {format_number(map_height)}",
        "labelFontSize": label_font_size,
        "districts": output_districts,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path, help="Pinned admdongkor GeoJSON")
    parser.add_argument("output", type=Path, help="Generated runtime JSON")
    parser.add_argument(
        "--region-code-output",
        type=Path,
        help="Optional generated legal-to-legacy TourAPI code map JSON",
    )
    args = parser.parse_args()

    source_bytes = args.source.read_bytes()
    actual_sha = hashlib.sha256(source_bytes).hexdigest()
    if actual_sha != SOURCE_SHA256:
        raise ValueError(
            f"Unexpected source SHA-256: {actual_sha}; expected {SOURCE_SHA256}"
        )

    feature_collection = json.loads(source_bytes)
    maps = [
        normalized_districts(feature_collection, area_code, sido_name, district_list)
        for area_code, sido_name, district_list in AREA_CONFIG
    ]
    source = {
        "commit": SOURCE_COMMIT,
        "date": SOURCE_DATE,
        "url": SOURCE_URL,
        "sha256": SOURCE_SHA256,
    }
    payload = {"source": source, "maps": maps}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )

    if args.region_code_output:
        legal_area_code_candidates: dict[str, set[str]] = {}
        legacy_area_code_to_legal: dict[str, str] = {}
        administrative_code_to_legacy: dict[str, dict[str, str | None]] = {}
        for district_map in maps:
            area_code = district_map["areaCode"]
            for district in district_map["districts"]:
                for administrative_code in district["administrativeCodes"]:
                    legal_area_code = administrative_code[:2]
                    legal_area_code_candidates.setdefault(
                        legal_area_code, set()
                    ).add(area_code)
                    existing_legal_area_code = legacy_area_code_to_legal.setdefault(
                        area_code, legal_area_code
                    )
                    if existing_legal_area_code != legal_area_code:
                        raise ValueError(
                            f"Legacy area {area_code} maps to multiple legal areas"
                        )
                    if administrative_code in administrative_code_to_legacy:
                        raise ValueError(
                            f"Duplicate administrative code: {administrative_code}"
                        )
                    administrative_code_to_legacy[administrative_code] = {
                        "areaCode": area_code,
                        "sigunguCode": district["sigunguCode"],
                    }

        # 법정동 시·도 코드 12는 광주(5)와 전남(38) 양쪽을 나타내므로 역방향
        # 단일 매핑에서 제외한다. 5자리 시·군·구 코드는 위 표로 정확히 해석한다.
        legal_area_code_to_legacy = {
            legal_area_code: next(iter(area_codes))
            for legal_area_code, area_codes in legal_area_code_candidates.items()
            if len(area_codes) == 1
        }
        code_payload = {
            "source": source,
            "legalAreaCodeToLegacy": legal_area_code_to_legacy,
            "legacyAreaCodeToLegal": legacy_area_code_to_legal,
            "administrativeCodeToLegacy": administrative_code_to_legacy,
        }
        args.region_code_output.parent.mkdir(parents=True, exist_ok=True)
        args.region_code_output.write_text(
            json.dumps(
                code_payload, ensure_ascii=False, separators=(",", ":")
            )
            + "\n",
            encoding="utf-8",
        )
    print(
        f"Generated {len(maps)} maps / "
        f"{sum(len(item['districts']) for item in maps)} displayed districts"
    )


if __name__ == "__main__":
    main()
