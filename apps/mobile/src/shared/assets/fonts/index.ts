import pretendardBold from "./Pretendard-Bold.otf";
import pretendardRegular from "./Pretendard-Regular.otf";
import pretendardSemiBold from "./Pretendard-SemiBold.otf";

export const fontFamilies = {
  bold: "Pretendard-Bold",
  regular: "Pretendard-Regular",
  semiBold: "Pretendard-SemiBold",
} as const;

export const fontAssets = {
  [fontFamilies.bold]: pretendardBold,
  [fontFamilies.regular]: pretendardRegular,
  [fontFamilies.semiBold]: pretendardSemiBold,
};
