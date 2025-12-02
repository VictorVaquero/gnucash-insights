import { colorPalette } from "@/common/getColors";

export const getColor = (d: string): string =>
  colorPalette[
    d
      .split("")
      .map((s) => s.charCodeAt(0))
      .reduce((p, n) => p + n, 0) % 15
  ];
