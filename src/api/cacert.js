import ajax from "./ajax.js";

const url = "/api/spki";

// ==================== CA 管理 ====================

export const InitCa = (data) => ajax(url + "/v1/spki/ca/init", "POST", null, data);
export const IssueIntermediate = (data) => ajax(url + "/v1/spki/ca/intermediate", "POST", null, data);
export const ImportCA = (data) => ajax(url + "/v1/spki/ca/import", "POST", null, data);

// ==================== 证书签发 ====================

export const IssueEndEntity = (data) => ajax(url + "/v1/spki/cert/endentity", "POST", null, data);

// ==================== 证书查询 ====================

export const ListCert = (params) => ajax(url + "/v1/spki/cert/list", "GET", params, null);
export const FindRootCA = (id) => ajax(`${url}/v1/spki/cert/${id}/root`, "GET", null, null);
export const ListCertVersions = (id) => ajax(`${url}/v1/spki/cert/${id}/versions`, "GET", null, null);
export const GetCertIssueCfg = (id) => ajax(`${url}/v1/spki/cert/${id}/issuecfg`, "GET", null, null);
export const GetCert = (id) => ajax(`${url}/v1/spki/cert/${id}`, "GET", null, null);

// ==================== 证书操作 ====================

export const RenewCert = (id, data) => ajax(`${url}/v1/spki/cert/${id}/renew`, "POST", null, data);

// 吊销（body: { reason }）
export const RevokeCert = (id, data) => ajax(`${url}/v1/spki/cert/${id}/revoke`, "POST", null, data);
export const DeleteCert = (id) => ajax(`${url}/v1/spki/cert/${id}`, "DELETE", null, null);

// ==================== 下载类（返回二进制 / PEM） ====================

// 导出证书链（PEM 文本），仅取文本
export const ExportCertChain = (id, params) => ajax(`${url}/v1/spki/cert/${id}/chain`, "GET", params, null, { responseType: "text" });

// 导出证书链（带响应头，用于解析文件名）
export const ExportCertChainWithMeta = (id, params) =>
    ajax(`${url}/v1/spki/cert/${id}/chain`, "GET", params, null, { responseType: "text", returnResponse: true });

// 下载证书 bundle（zip），带响应头
export const ExportCertBundle = (id) => ajax(`${url}/v1/spki/cert/${id}/bundle`, "GET", null, null, { responseType: "blob", returnResponse: true });

// 下载 CRL（PEM 文本），带响应头
export const DownloadCRL = (params) => ajax(url + "/v1/spki/crl", "GET", params, null, { responseType: "text", returnResponse: true });
