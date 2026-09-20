/**
 * 생성 파일 — 직접 수정하지 않는다.
 *
 * 원본: apps/mobile/src/shared/api/kto/regionCodeMap.generated.json
 * 출처: https://raw.githubusercontent.com/vuski/admdongkor/7360288277dfd12d74e54b959c59bdd66f852e3a/ver20260701/HangJeongDong_ver20260701.geojson
 *   commit 7360288277dfd12d74e54b959c59bdd66f852e3a
 *   date   2026-07-01
 *   sha256 c01ef44a0eb00978662ba7a6240ccb1da287fb52abd85104a1758969d391132f
 *
 * JSON 이 아니라 .ts 로 두는 이유: apps/api/nest-cli.json 에 assets 설정이 없어
 * swc 빌더가 .json 을 dist 로 복사하지 않고, Dockerfile 런타임 스테이지는 dist 만 담는다.
 * .json 으로 두면 로컬 vitest 는 통과하고 컨테이너에서만 MODULE_NOT_FOUND 로 죽는다.
 */

export interface LegacyRegionCode {
  areaCode: string;
  sigunguCode: string | null;
}

export interface GeneratedRegionCodeMap {
  administrativeCodeToLegacy: Readonly<Record<string, LegacyRegionCode>>;
  legalAreaCodeToLegacy: Readonly<Record<string, string>>;
  legacyAreaCodeToLegal: Readonly<Record<string, string>>;
}

export const generatedRegionCodeMap: GeneratedRegionCodeMap = {
  administrativeCodeToLegacy: {
    "11110": {
      areaCode: "1",
      sigunguCode: "23",
    },
    "11140": {
      areaCode: "1",
      sigunguCode: "24",
    },
    "11170": {
      areaCode: "1",
      sigunguCode: "21",
    },
    "11200": {
      areaCode: "1",
      sigunguCode: "16",
    },
    "11215": {
      areaCode: "1",
      sigunguCode: "6",
    },
    "11230": {
      areaCode: "1",
      sigunguCode: "11",
    },
    "11260": {
      areaCode: "1",
      sigunguCode: "25",
    },
    "11290": {
      areaCode: "1",
      sigunguCode: "17",
    },
    "11305": {
      areaCode: "1",
      sigunguCode: "3",
    },
    "11320": {
      areaCode: "1",
      sigunguCode: "10",
    },
    "11350": {
      areaCode: "1",
      sigunguCode: "9",
    },
    "11380": {
      areaCode: "1",
      sigunguCode: "22",
    },
    "11410": {
      areaCode: "1",
      sigunguCode: "14",
    },
    "11440": {
      areaCode: "1",
      sigunguCode: "13",
    },
    "11470": {
      areaCode: "1",
      sigunguCode: "19",
    },
    "11500": {
      areaCode: "1",
      sigunguCode: "4",
    },
    "11530": {
      areaCode: "1",
      sigunguCode: "7",
    },
    "11545": {
      areaCode: "1",
      sigunguCode: "8",
    },
    "11560": {
      areaCode: "1",
      sigunguCode: "20",
    },
    "11590": {
      areaCode: "1",
      sigunguCode: "12",
    },
    "11620": {
      areaCode: "1",
      sigunguCode: "5",
    },
    "11650": {
      areaCode: "1",
      sigunguCode: "15",
    },
    "11680": {
      areaCode: "1",
      sigunguCode: "1",
    },
    "11710": {
      areaCode: "1",
      sigunguCode: "18",
    },
    "11740": {
      areaCode: "1",
      sigunguCode: "2",
    },
    "12110": {
      areaCode: "38",
      sigunguCode: "8",
    },
    "12130": {
      areaCode: "38",
      sigunguCode: "13",
    },
    "12150": {
      areaCode: "38",
      sigunguCode: "11",
    },
    "12170": {
      areaCode: "38",
      sigunguCode: "6",
    },
    "12190": {
      areaCode: "38",
      sigunguCode: "4",
    },
    "12210": {
      areaCode: "5",
      sigunguCode: "3",
    },
    "12240": {
      areaCode: "5",
      sigunguCode: "5",
    },
    "12270": {
      areaCode: "5",
      sigunguCode: "2",
    },
    "12300": {
      areaCode: "5",
      sigunguCode: "4",
    },
    "12330": {
      areaCode: "5",
      sigunguCode: "1",
    },
    "12710": {
      areaCode: "38",
      sigunguCode: "7",
    },
    "12720": {
      areaCode: "38",
      sigunguCode: "3",
    },
    "12730": {
      areaCode: "38",
      sigunguCode: "5",
    },
    "12740": {
      areaCode: "38",
      sigunguCode: "2",
    },
    "12750": {
      areaCode: "38",
      sigunguCode: "10",
    },
    "12760": {
      areaCode: "38",
      sigunguCode: "24",
    },
    "12770": {
      areaCode: "38",
      sigunguCode: "20",
    },
    "12780": {
      areaCode: "38",
      sigunguCode: "1",
    },
    "12790": {
      areaCode: "38",
      sigunguCode: "23",
    },
    "12800": {
      areaCode: "38",
      sigunguCode: "17",
    },
    "12810": {
      areaCode: "38",
      sigunguCode: "9",
    },
    "12820": {
      areaCode: "38",
      sigunguCode: "22",
    },
    "12830": {
      areaCode: "38",
      sigunguCode: "16",
    },
    "12840": {
      areaCode: "38",
      sigunguCode: "19",
    },
    "12850": {
      areaCode: "38",
      sigunguCode: "18",
    },
    "12860": {
      areaCode: "38",
      sigunguCode: "21",
    },
    "12870": {
      areaCode: "38",
      sigunguCode: "12",
    },
    "26110": {
      areaCode: "6",
      sigunguCode: "15",
    },
    "26140": {
      areaCode: "6",
      sigunguCode: "11",
    },
    "26170": {
      areaCode: "6",
      sigunguCode: "5",
    },
    "26200": {
      areaCode: "6",
      sigunguCode: "14",
    },
    "26230": {
      areaCode: "6",
      sigunguCode: "7",
    },
    "26260": {
      areaCode: "6",
      sigunguCode: "6",
    },
    "26290": {
      areaCode: "6",
      sigunguCode: "4",
    },
    "26320": {
      areaCode: "6",
      sigunguCode: "8",
    },
    "26350": {
      areaCode: "6",
      sigunguCode: "16",
    },
    "26380": {
      areaCode: "6",
      sigunguCode: "10",
    },
    "26410": {
      areaCode: "6",
      sigunguCode: "2",
    },
    "26440": {
      areaCode: "6",
      sigunguCode: "1",
    },
    "26470": {
      areaCode: "6",
      sigunguCode: "13",
    },
    "26500": {
      areaCode: "6",
      sigunguCode: "12",
    },
    "26530": {
      areaCode: "6",
      sigunguCode: "9",
    },
    "26710": {
      areaCode: "6",
      sigunguCode: "3",
    },
    "27110": {
      areaCode: "4",
      sigunguCode: "8",
    },
    "27140": {
      areaCode: "4",
      sigunguCode: "4",
    },
    "27170": {
      areaCode: "4",
      sigunguCode: "6",
    },
    "27200": {
      areaCode: "4",
      sigunguCode: "1",
    },
    "27230": {
      areaCode: "4",
      sigunguCode: "5",
    },
    "27260": {
      areaCode: "4",
      sigunguCode: "7",
    },
    "27290": {
      areaCode: "4",
      sigunguCode: "2",
    },
    "27710": {
      areaCode: "4",
      sigunguCode: "3",
    },
    "27720": {
      areaCode: "4",
      sigunguCode: "9",
    },
    "28125": {
      areaCode: "2",
      sigunguCode: "125",
    },
    "28155": {
      areaCode: "2",
      sigunguCode: "155",
    },
    "28177": {
      areaCode: "2",
      sigunguCode: "3",
    },
    "28185": {
      areaCode: "2",
      sigunguCode: "8",
    },
    "28200": {
      areaCode: "2",
      sigunguCode: "4",
    },
    "28237": {
      areaCode: "2",
      sigunguCode: "6",
    },
    "28245": {
      areaCode: "2",
      sigunguCode: "2",
    },
    "28275": {
      areaCode: "2",
      sigunguCode: "275",
    },
    "28290": {
      areaCode: "2",
      sigunguCode: "290",
    },
    "28710": {
      areaCode: "2",
      sigunguCode: "1",
    },
    "28720": {
      areaCode: "2",
      sigunguCode: "9",
    },
    "30110": {
      areaCode: "3",
      sigunguCode: "2",
    },
    "30140": {
      areaCode: "3",
      sigunguCode: "5",
    },
    "30170": {
      areaCode: "3",
      sigunguCode: "3",
    },
    "30200": {
      areaCode: "3",
      sigunguCode: "4",
    },
    "30230": {
      areaCode: "3",
      sigunguCode: "1",
    },
    "31110": {
      areaCode: "7",
      sigunguCode: "1",
    },
    "31140": {
      areaCode: "7",
      sigunguCode: "2",
    },
    "31170": {
      areaCode: "7",
      sigunguCode: "3",
    },
    "31200": {
      areaCode: "7",
      sigunguCode: "4",
    },
    "31710": {
      areaCode: "7",
      sigunguCode: "5",
    },
    "36110": {
      areaCode: "8",
      sigunguCode: null,
    },
    "41111": {
      areaCode: "31",
      sigunguCode: "13",
    },
    "41113": {
      areaCode: "31",
      sigunguCode: "13",
    },
    "41115": {
      areaCode: "31",
      sigunguCode: "13",
    },
    "41117": {
      areaCode: "31",
      sigunguCode: "13",
    },
    "41131": {
      areaCode: "31",
      sigunguCode: "12",
    },
    "41133": {
      areaCode: "31",
      sigunguCode: "12",
    },
    "41135": {
      areaCode: "31",
      sigunguCode: "12",
    },
    "41150": {
      areaCode: "31",
      sigunguCode: "25",
    },
    "41171": {
      areaCode: "31",
      sigunguCode: "17",
    },
    "41173": {
      areaCode: "31",
      sigunguCode: "17",
    },
    "41192": {
      areaCode: "31",
      sigunguCode: "11",
    },
    "41194": {
      areaCode: "31",
      sigunguCode: "11",
    },
    "41196": {
      areaCode: "31",
      sigunguCode: "11",
    },
    "41210": {
      areaCode: "31",
      sigunguCode: "4",
    },
    "41220": {
      areaCode: "31",
      sigunguCode: "28",
    },
    "41250": {
      areaCode: "31",
      sigunguCode: "10",
    },
    "41271": {
      areaCode: "31",
      sigunguCode: "15",
    },
    "41273": {
      areaCode: "31",
      sigunguCode: "15",
    },
    "41281": {
      areaCode: "31",
      sigunguCode: "2",
    },
    "41285": {
      areaCode: "31",
      sigunguCode: "2",
    },
    "41287": {
      areaCode: "31",
      sigunguCode: "2",
    },
    "41290": {
      areaCode: "31",
      sigunguCode: "3",
    },
    "41310": {
      areaCode: "31",
      sigunguCode: "6",
    },
    "41360": {
      areaCode: "31",
      sigunguCode: "9",
    },
    "41370": {
      areaCode: "31",
      sigunguCode: "22",
    },
    "41390": {
      areaCode: "31",
      sigunguCode: "14",
    },
    "41410": {
      areaCode: "31",
      sigunguCode: "7",
    },
    "41430": {
      areaCode: "31",
      sigunguCode: "24",
    },
    "41450": {
      areaCode: "31",
      sigunguCode: "30",
    },
    "41461": {
      areaCode: "31",
      sigunguCode: "23",
    },
    "41463": {
      areaCode: "31",
      sigunguCode: "23",
    },
    "41465": {
      areaCode: "31",
      sigunguCode: "23",
    },
    "41480": {
      areaCode: "31",
      sigunguCode: "27",
    },
    "41500": {
      areaCode: "31",
      sigunguCode: "26",
    },
    "41550": {
      areaCode: "31",
      sigunguCode: "16",
    },
    "41570": {
      areaCode: "31",
      sigunguCode: "8",
    },
    "41591": {
      areaCode: "31",
      sigunguCode: "31",
    },
    "41593": {
      areaCode: "31",
      sigunguCode: "31",
    },
    "41595": {
      areaCode: "31",
      sigunguCode: "31",
    },
    "41597": {
      areaCode: "31",
      sigunguCode: "31",
    },
    "41610": {
      areaCode: "31",
      sigunguCode: "5",
    },
    "41630": {
      areaCode: "31",
      sigunguCode: "18",
    },
    "41650": {
      areaCode: "31",
      sigunguCode: "29",
    },
    "41670": {
      areaCode: "31",
      sigunguCode: "20",
    },
    "41800": {
      areaCode: "31",
      sigunguCode: "21",
    },
    "41820": {
      areaCode: "31",
      sigunguCode: "1",
    },
    "41830": {
      areaCode: "31",
      sigunguCode: "19",
    },
    "43111": {
      areaCode: "33",
      sigunguCode: "10",
    },
    "43112": {
      areaCode: "33",
      sigunguCode: "10",
    },
    "43113": {
      areaCode: "33",
      sigunguCode: "10",
    },
    "43114": {
      areaCode: "33",
      sigunguCode: "10",
    },
    "43130": {
      areaCode: "33",
      sigunguCode: "11",
    },
    "43150": {
      areaCode: "33",
      sigunguCode: "7",
    },
    "43720": {
      areaCode: "33",
      sigunguCode: "3",
    },
    "43730": {
      areaCode: "33",
      sigunguCode: "5",
    },
    "43740": {
      areaCode: "33",
      sigunguCode: "4",
    },
    "43745": {
      areaCode: "33",
      sigunguCode: "12",
    },
    "43750": {
      areaCode: "33",
      sigunguCode: "8",
    },
    "43760": {
      areaCode: "33",
      sigunguCode: "1",
    },
    "43770": {
      areaCode: "33",
      sigunguCode: "6",
    },
    "43800": {
      areaCode: "33",
      sigunguCode: "2",
    },
    "44131": {
      areaCode: "34",
      sigunguCode: "12",
    },
    "44133": {
      areaCode: "34",
      sigunguCode: "12",
    },
    "44150": {
      areaCode: "34",
      sigunguCode: "1",
    },
    "44180": {
      areaCode: "34",
      sigunguCode: "5",
    },
    "44200": {
      areaCode: "34",
      sigunguCode: "9",
    },
    "44210": {
      areaCode: "34",
      sigunguCode: "7",
    },
    "44230": {
      areaCode: "34",
      sigunguCode: "3",
    },
    "44250": {
      areaCode: "34",
      sigunguCode: "16",
    },
    "44270": {
      areaCode: "34",
      sigunguCode: "4",
    },
    "44710": {
      areaCode: "34",
      sigunguCode: "2",
    },
    "44760": {
      areaCode: "34",
      sigunguCode: "6",
    },
    "44770": {
      areaCode: "34",
      sigunguCode: "8",
    },
    "44790": {
      areaCode: "34",
      sigunguCode: "13",
    },
    "44800": {
      areaCode: "34",
      sigunguCode: "15",
    },
    "44810": {
      areaCode: "34",
      sigunguCode: "11",
    },
    "44825": {
      areaCode: "34",
      sigunguCode: "14",
    },
    "47111": {
      areaCode: "35",
      sigunguCode: "23",
    },
    "47113": {
      areaCode: "35",
      sigunguCode: "23",
    },
    "47130": {
      areaCode: "35",
      sigunguCode: "2",
    },
    "47150": {
      areaCode: "35",
      sigunguCode: "6",
    },
    "47170": {
      areaCode: "35",
      sigunguCode: "11",
    },
    "47190": {
      areaCode: "35",
      sigunguCode: "4",
    },
    "47210": {
      areaCode: "35",
      sigunguCode: "14",
    },
    "47230": {
      areaCode: "35",
      sigunguCode: "15",
    },
    "47250": {
      areaCode: "35",
      sigunguCode: "9",
    },
    "47280": {
      areaCode: "35",
      sigunguCode: "7",
    },
    "47290": {
      areaCode: "35",
      sigunguCode: "1",
    },
    "47730": {
      areaCode: "35",
      sigunguCode: "19",
    },
    "47750": {
      areaCode: "35",
      sigunguCode: "21",
    },
    "47760": {
      areaCode: "35",
      sigunguCode: "13",
    },
    "47770": {
      areaCode: "35",
      sigunguCode: "12",
    },
    "47820": {
      areaCode: "35",
      sigunguCode: "20",
    },
    "47830": {
      areaCode: "35",
      sigunguCode: "3",
    },
    "47840": {
      areaCode: "35",
      sigunguCode: "10",
    },
    "47850": {
      areaCode: "35",
      sigunguCode: "22",
    },
    "47900": {
      areaCode: "35",
      sigunguCode: "16",
    },
    "47920": {
      areaCode: "35",
      sigunguCode: "8",
    },
    "47930": {
      areaCode: "35",
      sigunguCode: "18",
    },
    "47940": {
      areaCode: "35",
      sigunguCode: "17",
    },
    "48121": {
      areaCode: "36",
      sigunguCode: "16",
    },
    "48123": {
      areaCode: "36",
      sigunguCode: "16",
    },
    "48125": {
      areaCode: "36",
      sigunguCode: "16",
    },
    "48127": {
      areaCode: "36",
      sigunguCode: "16",
    },
    "48129": {
      areaCode: "36",
      sigunguCode: "16",
    },
    "48170": {
      areaCode: "36",
      sigunguCode: "13",
    },
    "48220": {
      areaCode: "36",
      sigunguCode: "17",
    },
    "48240": {
      areaCode: "36",
      sigunguCode: "8",
    },
    "48250": {
      areaCode: "36",
      sigunguCode: "4",
    },
    "48270": {
      areaCode: "36",
      sigunguCode: "7",
    },
    "48310": {
      areaCode: "36",
      sigunguCode: "1",
    },
    "48330": {
      areaCode: "36",
      sigunguCode: "10",
    },
    "48720": {
      areaCode: "36",
      sigunguCode: "12",
    },
    "48730": {
      areaCode: "36",
      sigunguCode: "19",
    },
    "48740": {
      areaCode: "36",
      sigunguCode: "15",
    },
    "48820": {
      areaCode: "36",
      sigunguCode: "3",
    },
    "48840": {
      areaCode: "36",
      sigunguCode: "5",
    },
    "48850": {
      areaCode: "36",
      sigunguCode: "18",
    },
    "48860": {
      areaCode: "36",
      sigunguCode: "9",
    },
    "48870": {
      areaCode: "36",
      sigunguCode: "20",
    },
    "48880": {
      areaCode: "36",
      sigunguCode: "2",
    },
    "48890": {
      areaCode: "36",
      sigunguCode: "21",
    },
    "50110": {
      areaCode: "39",
      sigunguCode: "4",
    },
    "50130": {
      areaCode: "39",
      sigunguCode: "3",
    },
    "51110": {
      areaCode: "32",
      sigunguCode: "13",
    },
    "51130": {
      areaCode: "32",
      sigunguCode: "9",
    },
    "51150": {
      areaCode: "32",
      sigunguCode: "1",
    },
    "51170": {
      areaCode: "32",
      sigunguCode: "3",
    },
    "51190": {
      areaCode: "32",
      sigunguCode: "14",
    },
    "51210": {
      areaCode: "32",
      sigunguCode: "5",
    },
    "51230": {
      areaCode: "32",
      sigunguCode: "4",
    },
    "51720": {
      areaCode: "32",
      sigunguCode: "16",
    },
    "51730": {
      areaCode: "32",
      sigunguCode: "18",
    },
    "51750": {
      areaCode: "32",
      sigunguCode: "8",
    },
    "51760": {
      areaCode: "32",
      sigunguCode: "15",
    },
    "51770": {
      areaCode: "32",
      sigunguCode: "11",
    },
    "51780": {
      areaCode: "32",
      sigunguCode: "12",
    },
    "51790": {
      areaCode: "32",
      sigunguCode: "17",
    },
    "51800": {
      areaCode: "32",
      sigunguCode: "6",
    },
    "51810": {
      areaCode: "32",
      sigunguCode: "10",
    },
    "51820": {
      areaCode: "32",
      sigunguCode: "2",
    },
    "51830": {
      areaCode: "32",
      sigunguCode: "7",
    },
    "52111": {
      areaCode: "37",
      sigunguCode: "12",
    },
    "52113": {
      areaCode: "37",
      sigunguCode: "12",
    },
    "52130": {
      areaCode: "37",
      sigunguCode: "2",
    },
    "52140": {
      areaCode: "37",
      sigunguCode: "9",
    },
    "52180": {
      areaCode: "37",
      sigunguCode: "13",
    },
    "52190": {
      areaCode: "37",
      sigunguCode: "4",
    },
    "52210": {
      areaCode: "37",
      sigunguCode: "3",
    },
    "52710": {
      areaCode: "37",
      sigunguCode: "8",
    },
    "52720": {
      areaCode: "37",
      sigunguCode: "14",
    },
    "52730": {
      areaCode: "37",
      sigunguCode: "5",
    },
    "52740": {
      areaCode: "37",
      sigunguCode: "11",
    },
    "52750": {
      areaCode: "37",
      sigunguCode: "10",
    },
    "52770": {
      areaCode: "37",
      sigunguCode: "7",
    },
    "52790": {
      areaCode: "37",
      sigunguCode: "1",
    },
    "52800": {
      areaCode: "37",
      sigunguCode: "6",
    },
  },
  legalAreaCodeToLegacy: {
    "11": "1",
    "26": "6",
    "27": "4",
    "28": "2",
    "30": "3",
    "31": "7",
    "36": "8",
    "41": "31",
    "43": "33",
    "44": "34",
    "47": "35",
    "48": "36",
    "50": "39",
    "51": "32",
    "52": "37",
  },
  legacyAreaCodeToLegal: {
    "1": "11",
    "2": "28",
    "3": "30",
    "31": "41",
    "32": "51",
    "33": "43",
    "34": "44",
    "35": "47",
    "36": "48",
    "37": "52",
    "38": "12",
    "39": "50",
    "4": "27",
    "5": "12",
    "6": "26",
    "7": "31",
    "8": "36",
  },
};
