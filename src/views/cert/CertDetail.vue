<template>
    <div>
        <div v-loading="loading" class="cert-detail-page">
            <template v-if="info">
                <el-descriptions :column="2" border>
                    <el-descriptions-item label="证书ID">
                        <div class="id-cell">
                            <span>{{ info.certId }}</span>
                            <el-button link class="copy-btn" :icon="DocumentCopy" title="复制" @click="copyCertId" />
                        </div>
                    </el-descriptions-item>
                    <el-descriptions-item label="标题">{{ info.title || "-" }}</el-descriptions-item>
                    <el-descriptions-item label="Subject" :span="2">{{ info.subject || "-" }}</el-descriptions-item>
                    <el-descriptions-item label="类型">{{ GENRE_MAP[info.genre] || info.genre }}</el-descriptions-item>
                    <el-descriptions-item label="证书链">{{ info.chain }}</el-descriptions-item>
                    <el-descriptions-item label="状态">
                        <div class="status-cell">
                            <span class="status-dot" :class="getStatusClass(info.state)"></span>
                            <span>{{ STATE_MAP[info.state] || info.state || "-" }}</span>
                        </div>
                    </el-descriptions-item>
                    <el-descriptions-item label="序列号">{{ info.serial || "-" }}</el-descriptions-item>
                    <el-descriptions-item label="生效时间">{{ fmt(info.notBefore) }}</el-descriptions-item>
                    <el-descriptions-item label="当前版本">{{ info.revision ?? "-" }}</el-descriptions-item>
                    <el-descriptions-item label="到期时间">{{ fmt(info.notAfter) }}</el-descriptions-item>
                </el-descriptions>

                <div style="margin-top: 16px">
                    <el-button type="danger" @click="openRevoke">吊销</el-button>
                    <el-button type="warning" @click="remove">删除</el-button>
                    <el-button type="warning" @click="openRenew">续签</el-button>
                    <el-button v-if="isEndEntity" type="primary" @click="onNewIssue">新签</el-button>
                    <el-button type="info" @click="onViewChain">查看链</el-button>
                    <el-button type="info" @click="onViewRoot">根 CA</el-button>
                    <el-button type="success" @click="onDownloadChain">下载链</el-button>
                    <el-button v-if="isEndEntity" type="success" @click="onDownloadBundle">下载 ZIP</el-button>
                    <el-button type="primary" @click="load">刷新</el-button>
                </div>

                <h3 style="margin-top: 24px">版本列表</h3>
                <el-table :data="versions" border>
                    <el-table-column prop="revision" label="版本" width="80" />
                    <el-table-column prop="serial" label="序列号" />
                    <el-table-column label="状态" width="100">
                        <template #default="{ row }">
                            <div class="status-cell">
                                <span class="status-dot" :class="getStatusClass(row.state)"></span>
                                <span>{{ STATE_MAP[row.state] || row.state || "-" }}</span>
                            </div>
                        </template>
                    </el-table-column>
                    <el-table-column label="生效时间" width="170">
                        <template #default="{ row }">{{ fmt(row.effectiveTime) }}</template>
                    </el-table-column>
                    <el-table-column label="到期时间" width="170">
                        <template #default="{ row }">{{ fmt(row.expirationTime) }}</template>
                    </el-table-column>
                    <el-table-column label="剩余时间" width="120">
                        <template #default="{ row }">
                            <span :class="remainInfo(row.expirationTime).className">{{ remainInfo(row.expirationTime).text }}</span>
                        </template>
                    </el-table-column>
                    <el-table-column label="吊销时间" width="170">
                        <template #default="{ row }">{{ fmt(row.revocationTime) }}</template>
                    </el-table-column>
                </el-table>
            </template>
            <el-empty v-else-if="!loading" description="证书不存在" />
        </div>

        <el-dialog v-model="renewVisible" title="续签" width="480px" append-to-body>
            <el-form label-width="100px">
                <el-form-item label="新的有效期" required>
                    <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap">
                        <el-input-number v-model="renewValue" :min="1" :max="36500" controls-position="right" style="width: 160px" />
                        <el-radio-group v-model="renewUnit" @change="onRenewUnitChange">
                            <el-radio-button value="d">天</el-radio-button>
                            <el-radio-button value="m">月</el-radio-button>
                            <el-radio-button value="y">年</el-radio-button>
                        </el-radio-group>
                    </div>
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="renewVisible = false">取消</el-button>
                <el-button type="primary" :loading="renewing" @click="confirmRenew">确定</el-button>
            </template>
        </el-dialog>

        <el-dialog v-model="revokeVisible" title="吊销证书" width="480px" append-to-body>
            <el-form label-width="100px">
                <el-form-item label="吊销原因" required>
                    <el-select v-model="revokeReason" placeholder="请选择吊销原因" clearable style="width: 100%">
                        <el-option v-for="r in REVOKE_REASONS" :key="r.value" :label="r.label" :value="r.value" />
                    </el-select>
                </el-form-item>
                <el-alert type="warning" :closable="false" show-icon title="吊销操作不可逆，请谨慎操作。" />
            </el-form>
            <template #footer>
                <el-button @click="revokeVisible = false">取消</el-button>
                <el-button type="danger" :loading="revoking" :disabled="!revokeReason" @click="confirmRevoke">确认吊销</el-button>
            </template>
        </el-dialog>

        <el-drawer v-model="viewVisible" :title="viewTitle" direction="rtl" size="560px" append-to-body>
            <div v-loading="viewLoading" class="pem-wrap">
                <pre v-if="viewContent" class="pem-text">{{ viewContent }}</pre>
                <el-empty v-else-if="!viewLoading" description="暂无内容" :image-size="60" />
            </div>
            <template #footer>
                <div style="display: flex; justify-content: flex-end; gap: 8px">
                    <el-button @click="viewVisible = false">关闭</el-button>
                    <el-button type="primary" plain :disabled="!viewContent" @click="onCopyPem">复制</el-button>
                    <el-dropdown :disabled="!viewContent" trigger="click" @command="onSavePem">
                        <el-button type="primary" :disabled="!viewContent">保存</el-button>
                        <template #dropdown>
                            <el-dropdown-menu>
                                <el-dropdown-item command="crt">保存为 .crt</el-dropdown-item>
                                <el-dropdown-item command="pem">保存为 .pem</el-dropdown-item>
                            </el-dropdown-menu>
                        </template>
                    </el-dropdown>
                </div>
            </template>
        </el-drawer>
    </div>
</template>

<script>
import { ElMessageBox } from "element-plus";
import { DocumentCopy } from "@element-plus/icons-vue";
import dayjs from "dayjs";
import { GetCert, ListCertVersions, RenewCert, RevokeCert, DeleteCert, ExportCertChain, ExportCertChainWithMeta, ExportCertBundle } from "../../api/cacert.js";
import { withDelay, getFilenameFromResponse } from "../../utils/common.js";
import { msg } from "../../utils/message.ts";

const MIME_MAP = {
    crt: "application/x-x509-ca-cert",
    pem: "application/x-pem-file",
    zip: "application/zip",
};

const DATETIME_FORMAT = "YYYY-MM-DD HH:mm:ss";
const REMAIN_WARNING_DAYS = 30;

const unwrap = (res) => {
    if (res && typeof res === "object" && "payload" in res) {
        return res.payload;
    }
    return res;
};

export default {
    name: "CertDetail",
    setup() {
        return { DocumentCopy };
    },
    data() {
        return {
            GENRE_MAP: { 1: "根 CA", 2: "中间 CA", 3: "末端证书" },
            STATE_MAP: { V: "有效", R: "已吊销", E: "已过期" },
            REVOKE_REASONS: [
                { value: "unspecified", label: "未指定 (unspecified)" },
                { value: "keyCompromise", label: "密钥泄露 (keyCompromise)" },
                { value: "cACompromise", label: "CA 泄露 (cACompromise)" },
                { value: "affiliationChanged", label: "隶属关系变更 (affiliationChanged)" },
                { value: "superseded", label: "已被取代 (superseded)" },
                { value: "cessationOfOperation", label: "停止运营 (cessationOfOperation)" },
                { value: "certificateHold", label: "证书挂起 (certificateHold)" },
                { value: "removeFromCRL", label: "从 CRL 移除 (removeFromCRL)" },
                { value: "privilegeWithdrawn", label: "权限撤销 (privilegeWithdrawn)" },
                { value: "aACompromise", label: "属性权威泄露 (aACompromise)" },
            ],
            info: null,
            versions: [],
            loading: false,
            renewVisible: false,
            renewing: false,
            renewValue: 1,
            renewUnit: "y",
            revokeVisible: false,
            revoking: false,
            revokeReason: "",
            viewVisible: false,
            viewLoading: false,
            viewTitle: "",
            viewContent: "",
            viewFileName: "",
        };
    },
    computed: {
        // 仅末端证书（genre === 3）允许「新签」「下载 ZIP」
        isEndEntity() {
            return Number(this.info?.genre) === 3;
        },
    },
    watch: {
        "$route.params.id"(n, o) {
            if (n && n !== o) this.load();
        },
    },
    mounted() {
        this.load();
    },
    methods: {
        fmt(t) {
            if (!t) return "-";
            const d = dayjs(t);
            return d.isValid() ? d.format(DATETIME_FORMAT) : "-";
        },
        remainInfo(t) {
            if (!t) return { text: "-", className: "" };
            const exp = dayjs(t);
            if (!exp.isValid()) return { text: "-", className: "" };
            const diffMs = exp.diff(dayjs());
            if (diffMs <= 0) return { text: "已过期", className: "remain-expired" };
            const diffDays = diffMs / (1000 * 60 * 60 * 24);
            if (diffDays < 1) {
                const hours = Math.ceil(diffMs / (1000 * 60 * 60));
                const text = hours <= 1 ? "不足 1 小时" : `${hours} 小时`;
                return { text, className: "remain-expired" };
            }
            const text = `${Math.floor(diffDays)} 天`;
            if (diffDays <= REMAIN_WARNING_DAYS) return { text, className: "remain-warning" };
            return { text, className: "" };
        },
        getStatusClass(state) {
            if (state === "V") return "dot-success";
            if (state === "R") return "dot-danger";
            if (state === "E") return "dot-info";
            return "dot-warning";
        },
        sanitizeName(name, fallback = "cert") {
            const raw = name || fallback;
            return String(raw).replace(/[\\/:*?"<>|\s]+/g, "_");
        },
        async copyCertId() {
            const id = this.info?.certId || "";
            if (!id) return;
            try {
                await navigator.clipboard.writeText(id);
                msg.success("已复制");
            } catch {
                msg.error("复制失败，请手动复制");
            }
        },
        async load() {
            const id = this.$route.params.id;
            if (!id) {
                msg.error("页面参数错误，未获取到证书ID");
                return;
            }
            this.loading = true;
            try {
                // 按 id 精确获取证书详情，不再依赖 list 全量返回
                let cur = null;
                try {
                    const raw = await withDelay(() => GetCert(id));
                    cur = unwrap(raw);
                } catch {
                    cur = null;
                }
                this.info = cur || null;
                if (cur) {
                    const rawV = await withDelay(() => ListCertVersions(id));
                    const v = unwrap(rawV);
                    this.versions = v?.items || [];
                } else {
                    this.versions = [];
                }
            } catch (e) {
                msg.error(e.message || "加载失败");
            } finally {
                this.loading = false;
            }
        },
        openRenew() {
            this.renewValue = 3;
            this.renewUnit = "m";
            this.renewVisible = true;
        },
        onRenewUnitChange(unit) {
            if (unit === "d") this.renewValue = 90;
            else if (unit === "m") this.renewValue = 3;
            else if (unit === "y") this.renewValue = 1;
        },
        async confirmRenew() {
            if (!this.renewValue || this.renewValue < 1) {
                msg.warning("请输入有效的有效期");
                return;
            }
            const expiry = `${this.renewValue}${this.renewUnit}`;
            this.renewing = true;
            try {
                const raw = await withDelay(() => RenewCert(this.$route.params.id, { expiry }));
                const data = unwrap(raw);
                msg.success(`已续签，新版本：${data?.revision ?? "-"}`);
                this.renewVisible = false;
                await this.load();
            } catch (e) {
                msg.error(e.message || "续签失败");
            } finally {
                this.renewing = false;
            }
        },
        // 新签：跳转到签发页，携带来源证书 id，由签发页拉 issuecfg 回填
        onNewIssue() {
            const id = this.$route.params.id;
            if (!id) return;
            this.$router.push({ path: "/cert/issue", query: { fromCertId: id } });
        },
        async onViewChain() {
            const id = this.$route.params.id;
            this.viewTitle = `${this.info?.title || id} · 证书链`;
            this.viewFileName = this.sanitizeName(this.info?.title || id);
            this.viewContent = "";
            this.viewVisible = true;
            this.viewLoading = true;
            try {
                const text = await withDelay(() => ExportCertChain(id, { includeRoot: true }));
                this.viewContent = typeof text === "string" ? text : "";
            } catch (e) {
                msg.error(e.message || "获取失败");
                this.viewVisible = false;
            } finally {
                this.viewLoading = false;
            }
        },
        async onViewRoot() {
            const id = this.$route.params.id;
            this.viewTitle = `${this.info?.title || id} · 根 CA`;
            this.viewFileName = `${this.sanitizeName(this.info?.title || id)}_root`;
            this.viewContent = "";
            this.viewVisible = true;
            this.viewLoading = true;
            try {
                const text = await withDelay(() => ExportCertChain(id, { onlyRoot: true }));
                this.viewContent = typeof text === "string" ? text : "";
            } catch (e) {
                msg.error(e.message || "获取失败");
                this.viewVisible = false;
            } finally {
                this.viewLoading = false;
            }
        },
        async onCopyPem() {
            try {
                await navigator.clipboard.writeText(this.viewContent);
                msg.success("已复制");
            } catch {
                msg.error("复制失败，请手动选中复制");
            }
        },
        async onSavePem(format) {
            if (!this.viewContent) return;
            const filename = `${this.viewFileName || "cert"}.${format}`;
            const blob = new Blob([this.viewContent], { type: MIME_MAP[format] });
            await this.saveBlob(blob, filename, format);
        },
        openRevoke() {
            this.revokeReason = "";
            this.revokeVisible = true;
        },
        async confirmRevoke() {
            if (!this.revokeReason) {
                msg.warning("请选择吊销原因");
                return;
            }
            this.revoking = true;
            try {
                await withDelay(() => RevokeCert(this.$route.params.id, { reason: this.revokeReason }));
                msg.success("已吊销");
                this.revokeVisible = false;
                await this.load();
            } catch (e) {
                msg.error(e.message || "吊销失败");
            } finally {
                this.revoking = false;
            }
        },
        async remove() {
            try {
                await ElMessageBox.confirm("确认删除该证书及其所有版本和私钥？此操作不可逆。", "警告", {
                    type: "error",
                    confirmButtonText: "确认删除",
                });
            } catch {
                return;
            }
            try {
                await withDelay(() => DeleteCert(this.$route.params.id));
                msg.success("已删除");
                this.$router.back();
            } catch (e) {
                msg.error(e.message || "删除失败");
            }
        },
        async onDownloadChain() {
            const id = this.$route.params.id;
            try {
                const resp = await withDelay(() => ExportCertChainWithMeta(id, { includeRoot: true }));
                const filename = getFilenameFromResponse(resp, `${this.sanitizeName(this.info?.title || id)}_chain.pem`);
                const blob = new Blob([resp.data], { type: MIME_MAP.pem });
                await this.saveBlob(blob, filename, "pem");
            } catch (e) {
                msg.error(e.message || "下载失败");
            }
        },
        async onDownloadBundle() {
            const id = this.$route.params.id;
            try {
                const resp = await withDelay(() => ExportCertBundle(id));
                const filename = getFilenameFromResponse(resp, `${this.sanitizeName(this.info?.title || id)}_bundle.zip`);
                await this.saveBlob(resp.data, filename, "zip");
            } catch (e) {
                msg.error(e.message || "下载失败");
            }
        },
        async saveBlob(blob, filename, format) {
            const mime = MIME_MAP[format] || "application/octet-stream";
            if (window.showSaveFilePicker) {
                try {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: filename,
                        types: [
                            {
                                description: this.formatDesc(format),
                                accept: { [mime]: [`.${format}`] },
                            },
                        ],
                    });
                    const writable = await handle.createWritable();
                    await writable.write(blob);
                    await writable.close();
                    msg.success("已保存");
                } catch (e) {
                    if (e?.name !== "AbortError") {
                        msg.error(e.message || "保存失败");
                    }
                }
                return;
            }
            try {
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                msg.success("已保存到浏览器默认下载目录");
            } catch (e) {
                msg.error(e.message || "保存失败");
            }
        },
        formatDesc(format) {
            if (format === "crt") return "证书文件 (.crt)";
            if (format === "pem") return "PEM 文件 (.pem)";
            if (format === "zip") return "ZIP 压缩包 (.zip)";
            return `${format.toUpperCase()} 文件`;
        },
    },
};
</script>
<style scoped>
.cert-detail-page {
    min-height: 200px;
}
.id-cell {
    display: inline-flex;
    align-items: center;
    gap: 6px;
}
.copy-btn {
    color: #909399;
}
.copy-btn:hover {
    color: #606266;
}
.status-cell {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
}
.status-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
}
.dot-success {
    background-color: #67c23a;
    box-shadow: 0 0 4px rgba(103, 194, 58, 0.6);
}
.dot-danger {
    background-color: #f56c6c;
    box-shadow: 0 0 4px rgba(245, 108, 108, 0.6);
}
.dot-info {
    background-color: #909399;
}
.dot-warning {
    background-color: #e6a23c;
}
.remain-expired {
    color: #f56c6c;
    font-weight: 500;
}
.remain-warning {
    color: #e6a23c;
    font-weight: 500;
}
.pem-wrap {
    min-height: 200px;
}
.pem-text {
    margin: 0;
    padding: 12px;
    background: #f5f7fa;
    border-radius: 4px;
    font-family: Consolas, Monaco, monospace;
    font-size: 12px;
    line-height: 1.6;
    color: #303133;
    white-space: pre-wrap;
    word-break: break-all;
}
</style>
