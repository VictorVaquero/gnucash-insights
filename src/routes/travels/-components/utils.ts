import { fullTWConfig } from "@/common/utils";

export const getColor = (d: string):string => ([
    fullTWConfig.theme.colors.rose[500],
    fullTWConfig.theme.colors.rose[500],
    fullTWConfig.theme.colors.rose[500],
    fullTWConfig.theme.colors.blue[500],
    fullTWConfig.theme.colors.amber[700],
    fullTWConfig.theme.colors.yellow[500],
    fullTWConfig.theme.colors.yellow[500],
    fullTWConfig.theme.colors.lime[500],
    fullTWConfig.theme.colors.lime[500],
    fullTWConfig.theme.colors.green[500],
    fullTWConfig.theme.colors.violet[500],
    fullTWConfig.theme.colors.violet[500],
    fullTWConfig.theme.colors.purple[500],
    fullTWConfig.theme.colors.cyan[500],
    fullTWConfig.theme.colors.orange[500],
][d.split('').map((s)=>s.charCodeAt(0)).reduce((p, n)=> p+n, 0) % 15]);