// src/utils/ecode.js
export const ECODE_MESSAGE_MAP = {
    "SPKI.0000": "操作成功",
    "SPKI.0101": "结果错误",
    "SPKI.0102": "请求参数校验失败",
    "SPKI.0103": "请求体错误",
    "SPKI.0104": "不支持的算法、曲线、类型或用途",
    "SPKI.0105": "有效期格式或取值非法",
    "SPKI.0106": "CSR 签名校验失败",
    "SPKI.0107": "证书 PEM 解析失败或类型不符",
    "SPKI.0108": "私钥 PEM 解析失败或类型不符",
    "SPKI.0109": "私钥与证书不匹配",
    "SPKI.0110": "目标证书不是 CA，不能签发或作为父 CA",
    "SPKI.0111": "CA 无私钥或无法签发（如 CSR 导入模式）",
    "SPKI.0112": "吊销原因码非法",
    "SPKI.0401": "实例不存在",
    "SPKI.0175": "无效或错误的 token",
    "SPKI.0177": "action 不存在",
    "SPKI.0178": "策略未授权此操作",
    "SPKI.0179": "CA 私钥不允许下载",
    "SPKI.0180": "向上找不到根 CA",
    "SPKI.0404": "资源不存在",
    "SPKI.0405": "证书不存在",
    "SPKI.0406": "证书版本不存在",
    "SPKI.0407": "私钥不存在",
    "SPKI.0408": "签发者（父 CA）不存在",
    "SPKI.0409": "父 CA 不存在（按 subject 匹配失败）",
    "SPKI.0196": "资源已存在（证书或私钥重复导入）",
    "SPKI.0197": "资源冲突（状态不允许当前操作）",
    "SPKI.0198": "删除资源时冲突（有子证书或被引用）",
    "SPKI.0199": "证书已吊销（重复吊销或续签已吊销证书）",
};

export function resolveEcodeMessage(meta) {
    if (!meta) return "请求失败";
    return ECODE_MESSAGE_MAP[meta.ecode] || meta.message || "请求失败";
}
