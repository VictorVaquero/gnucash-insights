import { twStyles } from "./utils";

export const colorPalette: string[] = [
  twStyles.getPropertyValue("--color-purple-500"),
  twStyles.getPropertyValue("--color-rose-500"),
  twStyles.getPropertyValue("--color-rose-600"),
  twStyles.getPropertyValue("--color-blue-500"),
  twStyles.getPropertyValue("--color-yellow-500"),
  twStyles.getPropertyValue("--color-amber-700"),
  twStyles.getPropertyValue("--color-lime-500"),
  twStyles.getPropertyValue("--color-lime-600"),
  twStyles.getPropertyValue("--color-yellow-400"),
  twStyles.getPropertyValue("--color-violet-500"),
  twStyles.getPropertyValue("--color-green-500"),
  twStyles.getPropertyValue("--color-violet-600"),
  twStyles.getPropertyValue("--color-rose-700"),
  twStyles.getPropertyValue("--color-cyan-500"),
  twStyles.getPropertyValue("--color-orange-500"),
];

export const getRandomColor = (d: string): string => {
  const hash =
    d
      .split("")
      .map((s) => s.charCodeAt(0))
      .reduce((p, n) => p + n, 0) % colorPalette.length;
  return colorPalette[hash];
};
export const getDefaultColor = (): string =>
  twStyles.getPropertyValue("--color-gray-500");
