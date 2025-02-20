import { fullTWConfig } from "./utils";

const colorPalette: string[] = [
    fullTWConfig.theme.colors.rose[500],
    fullTWConfig.theme.colors.rose[600],
    fullTWConfig.theme.colors.blue[500],
    fullTWConfig.theme.colors.amber[700],
    fullTWConfig.theme.colors.yellow[500],
    fullTWConfig.theme.colors.lime[500],
    fullTWConfig.theme.colors.rose[700],
    fullTWConfig.theme.colors.yellow[400],
    fullTWConfig.theme.colors.lime[600],
    fullTWConfig.theme.colors.green[500],
    fullTWConfig.theme.colors.violet[500],
    fullTWConfig.theme.colors.violet[600],
    fullTWConfig.theme.colors.purple[500],
    fullTWConfig.theme.colors.cyan[500],
    fullTWConfig.theme.colors.orange[500],
]

export const getRandomColor = (d: string): string => {
    const hash = d.split('').map((s) => s.charCodeAt(0)).reduce((p, n) => p + n, 0) % colorPalette.length;
    return colorPalette[hash]
};
export const getDefaultColor = (): string => fullTWConfig.theme.colors.gray[500]