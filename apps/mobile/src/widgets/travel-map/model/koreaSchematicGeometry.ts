import type { KtoAreaCode } from "@/entities/region";

export const KOREA_MAP_VIEW_BOX = "0 0 300 420";

export type RegionGeometry = Readonly<{
  areaCode: KtoAreaCode;
  labelX: number;
  labelY: number;
  path: string;
}>;

/**
 * 외부 경계 데이터를 복제하지 않고 Tripic에서 직접 작성한, 대체 가능한 17개 시·도 개략도다.
 * 행정 경계나 위치 판정에는 사용하지 않으며, TourAPI areaCode별 상태를 보여 주기만 한다.
 * 추후 출처와 라이선스가 확인된 공식 경계 데이터로 이 파일만 교체할 수 있다.
 */
export const KOREA_SCHEMATIC_GEOMETRY = [
  {
    areaCode: "31",
    labelX: 111,
    labelY: 76,
    path: "M72 42 L123 28 L162 49 L169 92 L145 123 L101 119 L73 96 L61 66 Z",
  },
  {
    areaCode: "32",
    labelX: 203,
    labelY: 75,
    path: "M123 28 L208 17 L249 42 L259 99 L234 130 L181 117 L169 92 L162 49 Z",
  },
  {
    areaCode: "2",
    labelX: 67,
    labelY: 92,
    path: "M48 72 L69 65 L82 78 L78 102 L57 108 L45 91 Z M37 92 L43 88 L47 95 L42 101 Z",
  },
  {
    areaCode: "1",
    labelX: 99,
    labelY: 80,
    path: "M86 68 L105 64 L115 75 L107 92 L88 91 L80 79 Z",
  },
  {
    areaCode: "34",
    labelX: 85,
    labelY: 157,
    path: "M61 111 L101 119 L126 133 L130 175 L111 202 L65 194 L43 161 Z",
  },
  {
    areaCode: "33",
    labelX: 151,
    labelY: 149,
    path: "M101 119 L145 123 L181 117 L190 151 L169 189 L130 175 L126 133 Z",
  },
  {
    areaCode: "8",
    labelX: 118,
    labelY: 155,
    path: "M108 141 L125 139 L131 153 L121 168 L106 158 Z",
  },
  {
    areaCode: "3",
    labelX: 126,
    labelY: 187,
    path: "M115 174 L132 170 L142 184 L133 199 L115 197 L107 186 Z",
  },
  {
    areaCode: "35",
    labelX: 216,
    labelY: 168,
    path: "M181 117 L234 130 L263 157 L254 215 L229 239 L185 226 L169 189 L190 151 Z",
  },
  {
    areaCode: "4",
    labelX: 207,
    labelY: 207,
    path: "M194 192 L213 187 L224 201 L217 218 L197 220 L187 207 Z",
  },
  {
    areaCode: "37",
    labelX: 111,
    labelY: 234,
    path: "M65 194 L111 202 L133 199 L169 189 L185 226 L158 257 L104 263 L68 241 Z",
  },
  {
    areaCode: "38",
    labelX: 91,
    labelY: 309,
    path: "M68 241 L104 263 L158 257 L165 299 L143 338 L94 351 L49 326 L39 283 Z",
  },
  {
    areaCode: "5",
    labelX: 94,
    labelY: 289,
    path: "M80 275 L101 270 L113 285 L104 302 L82 302 L72 288 Z",
  },
  {
    areaCode: "36",
    labelX: 185,
    labelY: 274,
    path: "M158 257 L185 226 L229 239 L243 274 L219 311 L165 299 Z",
  },
  {
    areaCode: "7",
    labelX: 246,
    labelY: 254,
    path: "M229 239 L253 230 L265 245 L258 264 L239 269 L226 256 Z",
  },
  {
    areaCode: "6",
    labelX: 230,
    labelY: 297,
    path: "M219 278 L243 274 L255 289 L246 306 L225 314 L213 299 Z",
  },
  {
    areaCode: "39",
    labelX: 132,
    labelY: 387,
    path: "M82 382 C100 368 143 365 169 376 C177 380 176 390 165 395 C140 406 99 404 81 393 C75 389 76 386 82 382 Z",
  },
] as const satisfies readonly RegionGeometry[];
