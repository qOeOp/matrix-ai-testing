export const VISUAL_ELEMENT_TYPES_CONST = [
    'table',      // 表格
    'line-chart', // 折线图,
    'bar-chart',  // 柱状图
    'heatmap',    // 热力图
    'area-chart', // 面积图,
    'pie-chart',  // 饼图
    'news-list',  // 新闻列表
    'kpi-card',   // KPI指标卡
    'gauge',      // 仪表盘
    'scatter',    // 散点图
    'treemap',    // 树图
] as const;

type VisualElementType = typeof VISUAL_ELEMENT_TYPES_CONST[number];
export interface Layout {
    id: string;           // 组件ID，对应JSON中的标识
    type: VisualElementType;         // 组件类型，如"table", "line-chart"
    bbox: [number, number, number, number];  // [x1, y1, x2, y2] 或 [x, y, width, height]
}