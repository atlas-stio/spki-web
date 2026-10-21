<template>
    <div>
        <el-space wrap style="margin-bottom: 12px">
            <el-button :icon="Refresh" @click="load" :loading="loading">刷新</el-button>
        </el-space>

        <el-table :data="items" border v-loading="loading">
            <el-table-column type="index" label="#" width="60" />
            <el-table-column prop="title" label="标题" show-overflow-tooltip />
            <el-table-column prop="subject" label="Subject" show-overflow-tooltip />
            <el-table-column label="状态" width="100">
                <template #default="{ row }">
                    <div class="status-cell">
                        <span class="status-dot" :class="getStatusClass(row.state)"></span>
                        <span>{{ STATE_MAP[row.state] || row.state || "-" }}</span>
                    </div>
                </template>
            </el-table-column>
            <el-table-column label="生效时间" width="170">
                <template #default="{ row }">{{ fmt(row.notBefore) }}</template>
            </el-table-column>
            <el-table-column label="到期时间" width="170">
                <template #default="{ row }">{{ fmt(row.notAfter) }}</template>
            </el-table-column>
            <el-table-column label="剩余时间" width="120">
                <template #default="{ row }">
                    <span :class="remainInfo(row.notAfter).className">{{ remainInfo(row.notAfter).text }}</span>
                </template>
            </el-table-column>
            <el-table-column label="操作" width="240" fixed="right">
                <template #default="{ row }">
                    <el-button link type="primary" @click="$router.push(`/cert/detail/${row.certId}`)">详情</el-button>
                    <el-button link type="primary" @click="onViewRoot(row)">查看CA</el-button>
                    <el-button link type="primary" @click="onDownloadBundle(row)">下载证书</el-button>
                </template>
            </el-table-column>
        </el-table>

        <div class="pagination">
            <pagination
                ref="pageRef"
                :pageTotal="pageTotal"
                :pageSize="pageSize"
                :autoSync="true"
                @syncsize="onSyncsize"
                @CurrentChange="onCurrentChange"
                @SizeChange="onSizeChange" />
        </div>

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
import { Refresh } from "@element-plus/icons-vue";
import dayjs from "dayjs";
import { ListCert, ExportCertChain, ExportCertBundle } from "../../api/cacert.js";
import { withDelay, convertToLimitOffset, getFilenameFromResponse } from "../../utils/common.js";
import { msg } from "../../utils/message.ts";

const PAGE_SIZE_KEY = "turtle_def_page_size";

const MIME_MAP = {
    crt: "application/x-x509-ca-cert",
    pem: "application/x-pem-file",
    zip: "application/zip",
};

const DATETIME_FORMAT = "YYYY-MM-DD HH:mm:ss";
const REMAIN_WARNING_DAYS = 30;

export default {
    name: "CertList",
    setup() {
        return { Refresh };
    },
    data() {
        return {
            STATE_MAP: { V: "有效", R: "已吊销", E: "已过期" },
            genres: [3],
            items: [],
            loading: false,
            pageTotal: 0,
            pageSize: 10,
            page: 1,
            viewVisible: false,
            viewLoading: false,
            viewTitle: "",
            viewContent: "",
            viewFileName: "",
        };
    },
    watch: {
        pageSize(v) {
            localStorage.setItem(PAGE_SIZE_KEY, v);
        },
    },
    mounted() {
        this.initPageSize();
        this.load();
    },
    methods: {
        initPageSize() {
            const saved = localStorage.getItem(PAGE_SIZE_KEY);
            if (saved) this.pageSize = Number(saved);
        },
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
        async load() {
            this.loading = true;
            try {
                const params = convertToLimitOffset(this.page, this.pageSize);
                params.genre = this.genres;
                const res = await withDelay(() => ListCert(params));
                this.items = res?.payload?.items || [];
                this.pageTotal = res?.payload?.page_info?.total || 0;
            } catch (e) {
                msg.error(e.message || "查询失败");
                this.items = [];
                this.pageTotal = 0;
            } finally {
                this.loading = false;
            }
        },
        onSyncsize(s, p) {
            this.pageSize = s;
            this.page = p;
        },
        onCurrentChange(p) {
            this.page = p;
            this.load();
        },
        onSizeChange(s) {
            this.pageSize = s;
            this.page = 1;
            this.load();
        },
        async onViewRoot(row) {
            this.viewTitle = `${row.title || row.certId} · 根 CA`;
            this.viewFileName = `${this.sanitizeName(row.title || row.certId)}_root`;
            this.viewContent = "";
            this.viewVisible = true;
            this.viewLoading = true;
            try {
                const text = await withDelay(() => ExportCertChain(row.certId, { onlyRoot: true }));
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
        async onDownloadBundle(row) {
            try {
                const resp = await ExportCertBundle(row.certId);
                const filename = getFilenameFromResponse(resp, `${this.sanitizeName(row.title || row.certId)}_bundle.zip`);
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
                        msg.error(e?.message || "保存失败");
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
                msg.error(e?.message || "保存失败");
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
