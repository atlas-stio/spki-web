<template>
    <div class="issue-page">
        <div class="issue-main">
            <el-alert type="info" :closable="false" show-icon style="max-width: 600px; margin: 0 auto 16px">
                <template #title>CRL 由指定 CA 签发，包含其下所有已吊销证书</template>
            </el-alert>

            <el-form ref="formRef" :model="form" :rules="rules" label-width="240px">
                <el-form-item label="签发 CA (IssuerID)" prop="issuerId">
                    <el-select
                        v-model="form.issuerId"
                        filterable
                        clearable
                        placeholder="选择签发该 CRL 的 CA"
                        style="max-width: 600px"
                        :loading="issuerLoading">
                        <el-option v-for="ca in issuerOptions" :key="ca.certId" :label="ca.title || ca.subject || ca.certId" :value="ca.certId" />
                        <template #empty>
                            <el-empty description="暂无可用的 CA" :image-size="60" />
                        </template>
                    </el-select>
                </el-form-item>

                <el-form-item label="有效期" prop="expiry.value">
                    <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap">
                        <el-input-number v-model="form.expiry.value" :min="1" :max="36500" controls-position="right" style="width: 160px" />
                        <el-radio-group v-model="form.expiry.unit" @change="onUnitChange">
                            <el-radio-button value="d">天</el-radio-button>
                            <el-radio-button value="m">月</el-radio-button>
                            <el-radio-button value="y">年</el-radio-button>
                        </el-radio-group>
                    </div>
                </el-form-item>

                <el-form-item>
                    <el-button type="primary" :loading="downloading" @click="download">下载 CRL</el-button>
                </el-form-item>
            </el-form>
        </div>

        <aside class="issue-help">
            <el-card shadow="never" class="help-card">
                <template #header>
                    <div class="help-header">
                        <span class="help-dot" />
                        <span>帮助信息</span>
                    </div>
                </template>

                <div class="help-section">
                    <h4>签发 CA (IssuerID)</h4>
                    <p>选择签发该 CRL 的 CA<span class="req">必填</span>，仅列出可签发 CRL 的根 / 中间 CA。</p>
                </div>

                <div class="help-section">
                    <h4>有效期</h4>
                    <p>CRL 的有效期<span class="req">必填</span>，支持天 / 月 / 年，默认 7 天。实际到期可能受 CA 策略截断。</p>
                </div>

                <div class="help-section">
                    <h4>CRL 内容</h4>
                    <p>由所选 CA 签发，包含其下所有已吊销证书的序列号与吊销时间。</p>
                </div>

                <div class="help-section">
                    <h4>使用说明</h4>
                    <p>文件为 PEM 编码，部署到依赖该 CA 的服务（如 Nginx、OpenSSL）用于校验证书是否已被吊销，建议定期重新下载。</p>
                </div>

                <el-alert type="info" :closable="false" show-icon style="margin-top: 4px"> 带 <span class="req">必填</span> 标记的为必填项。 </el-alert>
            </el-card>
        </aside>
    </div>
</template>

<script>
import { ListCert, DownloadCRL } from "../../api/cacert.js";
import { getFilenameFromResponse } from "../../utils/common.js";
import { msg } from "../../utils/message.ts";

const MIME_MAP = {
    pem: "application/x-pem-file",
};

export default {
    name: "CrlDownload",
    data() {
        return {
            downloading: false,
            issuerOptions: [],
            issuerLoading: false,
            form: {
                issuerId: "",
                expiry: { value: 7, unit: "d" },
            },
            rules: {
                issuerId: [{ required: true, message: "请选择签发该 CRL 的 CA", trigger: "change" }],
                "expiry.value": [
                    { required: true, type: "number", message: "有效期必填", trigger: "blur" },
                    { type: "number", min: 1, message: "有效期必须 ≥ 1", trigger: "blur" },
                ],
            },
        };
    },
    mounted() {
        this.loadIssuers();
    },
    methods: {
        async loadIssuers() {
            this.issuerLoading = true;
            try {
                const res = await ListCert({ genre: [1, 2], hk: 1, offset: 0, limit: 100 });
                this.issuerOptions = res?.payload?.items || [];
            } catch (e) {
                msg.error(e.message || "加载 CA 列表失败");
                this.issuerOptions = [];
            } finally {
                this.issuerLoading = false;
            }
        },
        onUnitChange(unit) {
            if (unit === "d") this.form.expiry.value = 7;
            else if (unit === "m") this.form.expiry.value = 1;
            else if (unit === "y") this.form.expiry.value = 1;
        },
        async download() {
            try {
                await this.$refs.formRef.validate();
            } catch {
                return;
            }
            this.downloading = true;
            try {
                const valid = `${this.form.expiry.value}${this.form.expiry.unit}`;
                const resp = await DownloadCRL({ issuerId: this.form.issuerId, valid });
                const filename = getFilenameFromResponse(resp, `crl_${this.form.issuerId.slice(0, 8)}.pem`);
                const blob = new Blob([resp.data], { type: MIME_MAP.pem });
                const ok = await this.saveBlob(blob, filename, "pem");
                if (ok) msg.success("下载成功");
            } catch (e) {
                msg.error(e.message || "下载失败");
            } finally {
                this.downloading = false;
            }
        },
        async saveBlob(blob, filename, format) {
            const mime = MIME_MAP[format] || "application/octet-stream";
            if (typeof window.showSaveFilePicker === "function") {
                try {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: filename,
                        types: [
                            {
                                description: format === "pem" ? "PEM 文件 (.pem)" : "文件",
                                accept: { [mime]: [`.${format}`] },
                            },
                        ],
                    });
                    const writable = await handle.createWritable();
                    await writable.write(blob);
                    await writable.close();
                    return true;
                } catch (e) {
                    if (e?.name === "AbortError") return false;
                }
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
                return true;
            } catch (e) {
                msg.error(e?.message || "保存失败");
                return false;
            }
        },
    },
};
</script>

<style scoped>
@import "./root-ca.css";
</style>
