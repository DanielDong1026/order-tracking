/**
 * @file 外贸跟单系统常量定义
 * 包含状态节点、贸易术语、状态颜色映射等
 */

/** @type {string[]} 6 个跟单状态节点，按流程顺序排列 */
export const STATUS_NODES = [
  '已接单',
  '生产中',
  '验货',
  '待出货',
  '已出货',
  '已收款',
];

/** @type {string[]} 常用贸易术语选项 */
export const TRADE_TERMS = ['FOB', 'CIF', 'CFR', 'EXW', 'DDP', 'DAP'];

/**
 * 状态 → 颜色映射（用于 StatusBadge、状态筛选等）
 * @type {Record<string, string>}
 */
export const STATUS_COLORS = {
  '已接单': '#1976d2',
  '生产中': '#ed6c02',
  '验货': '#7b1fa2',
  '待出货': '#00838f',
  '已出货': '#2e7d32',
  '已收款': '#1b5e20',
};

/**
 * 状态 → MUI Chip color 映射
 * @type {Record<string, 'info' | 'warning' | 'secondary' | 'success' | 'default'>}
 */
export const STATUS_CHIP_COLORS = {
  '已接单': 'info',
  '生产中': 'warning',
  '验货': 'secondary',
  '待出货': 'info',
  '已出货': 'success',
  '已收款': 'success',
};

/** 订单表单字段默认值 */
export const DEFAULT_ORDER_FORM = {
  customerName: '',
  poNumber: '',
  sku: '',
  productSummary: '',
  quantity: '',
  amount: '',
  tradeTerm: '',
  portOfLoading: '',
  portOfDestination: '',
  estimatedDeliveryDate: '',
  salesperson: '',
  factoryName: '',
  notes: '',
  piAttachment: null,
  productPhoto: null,
  tags: [],
};

/** 客户表单字段默认值 */
export const DEFAULT_CUSTOMER = {
  name: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  notes: '',
};

/** 附件最大大小 5MB */
export const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;

/** 粘贴提示文字 */
export const PASTE_HINT_TEXT = '💡 微信截图可直接 Ctrl+V 粘贴';

/** 粘贴附件名前缀 */
export const PASTE_ATTACHMENT_PREFIX = '粘贴截图';

/* ---- 超期/停滞订单高亮预警 ---- */

/** 红色预警行背景色（超期） */
export const OVERDUE_RED_BG = '#FFF0F0';

/** 黄色预警行背景色（停滞） */
export const STALE_YELLOW_BG = '#FFFDE7';

/** 停滞判定阈值（天）：超过此天数未更新即标黄 */
export const STALE_DAYS_THRESHOLD = 7;

/** 不触发红色预警的状态（已出货/已收款视为完成） */
export const OVERDUE_EXEMPT_STATUSES = ['已出货', '已收款'];

/** 系统名称（页脚、分享页标题等） */
export const APP_NAME = '外贸跟单系统';
