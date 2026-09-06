# Third-party notices

Tripic 모바일 앱의 지도 화면은 아래 오픈 데이터와 소프트웨어를 사용합니다.

대한민국 17개 시·도 개략도는 Tripic 디자인을 위해 직접 작성했으며,
행정 경계 판정에는 사용하지 않습니다.

## Nationwide city, county, and district boundaries

- Data source: Statistics Korea Statistical Geographic Information Service (SGIS)
- Processing and historical corrections: `vuski/admdongkor`
- Source snapshot: 2026-07-01, commit `7360288277dfd12d74e54b959c59bdd66f852e3a`
- Source: <https://github.com/vuski/admdongkor>
- Data license: CC BY 4.0 and Korea Open Government License Type 1 attribution requirements
- License notice: <https://github.com/vuski/admdongkor/blob/master/LICENSE-DATA>
- Changes: 행정동 경계를 시군구 단위로 결합하고, 일반구가 있는 도시는 TourAPI가 제공하는 상위 시 단위로 다시 결합했습니다. 화면용 SVG 좌표로 투영·단순화하고 라벨과 확대 범위를 계산했으며 TourAPI 법정동 시군구 코드에 연결했습니다. 작은 화면에서 본토와 도서를 함께 선택할 수 있도록 일부 원격 도서 지역은 지도 안의 인셋으로 재배치했습니다.
- Compatibility scope: 화면은 디자인의 17개 시·도를 유지합니다. 2026-07-01부터 하나의 법정동 시·도 코드를 공유하는 광주와 전남은 5자리 시군구 코드로 분리하고, 인천은 제물포구·영종구·서해구·검단구를 포함한 현재 11개 구·군으로 표시합니다.

본 데이터는 통계청 통계지리정보서비스(SGIS, <https://sgis.kostat.go.kr>)에서
공공누리 제1유형으로 개방한 행정동 경계를 가공한 것이며
(가공: vuski/admdongkor, <https://github.com/vuski/admdongkor>),
CC BY 4.0으로 배포됩니다.

## Rebuilding the embedded map data

지도 데이터 생성기는 런타임 의존성이 아니며, 아래처럼 고정된 개발 의존성과
원본 파일을 사용해 두 산출물을 함께 갱신합니다.

```sh
python3 -m pip install -r scripts/requirements-travel-map.txt
python3 scripts/generate-travel-map-geometry.py \
  HangJeongDong_ver20260701.geojson \
  src/widgets/travel-map/model/districtGeometry.generated.json \
  --region-code-output src/shared/api/kto/regionCodeMap.generated.json
```

생성기는 원본의 SHA-256을 검증하며, 다른 스냅샷을 실수로 섞으면 중단됩니다.
