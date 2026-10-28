<template>
    <div class="issue-page">
        <!-- 左侧：表单 -->
        <div class="issue-main">
            <div class="page-title">
                <h2>签发证书</h2>
                <p>选择签发者 CA，填写主题与用途，为终端实体签发证书。</p>
            </div>
            <el-form ref="formRef" :model="form" :rules="rules" label-width="240px">
                <el-form-item label="CA" prop="issuer.id">
                    <el-select v-model="form.issuer.id" filterable clearable placeholder="选择签发者 CA" style="max-width: 600px" :loading="issuerLoading">
                        <el-option v-for="ca in issuerOptions" :key="ca.certId" :label="ca.title || ca.subject || ca.certId" :value="ca.certId">
                            <span>{{ ca.title || ca.subject || ca.certId }}</span>
                            <span v-if="ca.key" style="float: right; color: #909399; font-size: 12px; margin-left: 8px">
                                {{ (ca.key.algo || "").toUpperCase() }}{{ ca.key.size ? " " + ca.key.size : "" }}
                            </span>
                        </el-option>
                        <template #empty>
                            <el-empty description="暂无可签发的 CA" :image-size="60" />
                        </template>
                    </el-select>
                </el-form-item>

                <el-form-item label="名称" prop="title">
                    <el-input v-model="form.title" placeholder="请输入证书名称" style="max-width: 600px" @input="clearFieldValidate('title')" />
                </el-form-item>

                <el-form-item label="使用 CSR">
                    <el-switch v-model="useCsr" />
                    <span v-if="useCsr" style="margin-left: 8px; color: #e6a23c; font-size: 12px"> CSR 只提供公钥和密钥算法，subject 仍需在下方填写 </span>
                </el-form-item>

                <el-form-item v-if="useCsr" ref="csrItem" label="CSR PEM" prop="csrpem">
                    <el-input
                        v-model="form.csrpem"
                        type="textarea"
                        :rows="8"
                        placeholder="-----BEGIN CERTIFICATE REQUEST-----"
                        @input="clearFieldValidate('csrpem')" />
                </el-form-item>

                <el-form-item v-if="!useCsr" label="密钥算法" required>
                    <div style="display: flex; gap: 24px; align-items: center; flex-wrap: wrap">
                        <el-radio-group v-model="form.key.algo" @change="onAlgoChange">
                            <el-radio-button v-for="a in algoOptions" :key="a.value" :value="a.value">
                                {{ a.label }}
                            </el-radio-button>
                        </el-radio-group>

                        <div v-if="form.key.algo !== 'ed25519'" style="display: flex; gap: 8px; align-items: center">
                            <span style="font-size: 14px; color: #606266"><el-text>长度</el-text></span>
                            <el-radio-group v-model="form.key.size">
                                <el-radio-button v-for="s in sizeOptions" :key="s" :value="s">
                                    {{ s }}
                                </el-radio-button>
                            </el-radio-group>
                        </div>
                    </div>
                </el-form-item>

                <el-form-item label="签名算法" prop="signatureAlgorithm">
                    <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap">
                        <el-radio-group v-model="form.signatureAlgorithm" :disabled="!issuerKeyAlgo">
                            <el-radio-button v-for="s in signatureAlgorithmOptions" :key="s.value" :value="s.value">
                                {{ s.label }}
                            </el-radio-button>
                        </el-radio-group>
                        <span v-if="!issuerKeyAlgo" style="color: #909399; font-size: 12px"> 请先选择签发者 CA，签名算法由 CA 密钥类型决定 </span>
                    </div>
                </el-form-item>

                <el-form-item label="主题 (Subject)" required>
                    <div style="display: flex; gap: 8px; align-items: center; width: 100%; max-width: 600px">
                        <div
                            style="
                                flex: 1;
                                min-height: 32px;
                                padding: 0 10px;
                                display: flex;
                                align-items: center;
                                background: #f5f7fa;
                                border-radius: 4px;
                                font-family: Consolas, Monaco, monospace;
                                font-size: 13px;
                                color: #303133;
                                word-break: break-all;
                                box-sizing: border-box;
                            ">
                            {{ subjectText || "\u00A0" }}
                        </div>
                        <el-button type="primary" plain @click="openMore">编辑</el-button>
                    </div>
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

                <el-form-item label="主题密钥标识符 (SKI)">
                    <el-radio-group v-model="form.subjectKeyIdentifier">
                        <el-radio-button value="sha1">SHA-1</el-radio-button>
                        <el-radio-button value="sha256">SHA-256</el-radio-button>
                    </el-radio-group>
                </el-form-item>

                <!-- DNS 与 IP 分两行 -->
                <el-form-item label="DNS">
                    <div style="display: flex; gap: 8px; align-items: center; width: 100%; max-width: 600px">
                        <el-input v-model="dnsStr" placeholder="逗号分隔，如 *.example.com,www.blogs.com" style="flex: 1" />
                        <el-button :icon="FullScreen" title="放大编辑" @click="openExpand('dns')" />
                    </div>
                </el-form-item>

                <el-form-item label="IP">
                    <div style="display: flex; gap: 8px; align-items: center; width: 100%; max-width: 600px">
                        <el-input v-model="ipStr" placeholder="逗号分隔，如 192.168.22.18,172.17.17.99" style="flex: 1" />
                        <el-button :icon="FullScreen" title="放大编辑" @click="openExpand('ip')" />
                    </div>
                </el-form-item>

                <el-form-item label="更多设置">
                    <div style="display: flex; gap: 8px; align-items: center; width: 100%; max-width: 600px">
                        <div
                            style="
                                flex: 1;
                                min-height: 32px;
                                padding: 0 10px;
                                display: flex;
                                align-items: center;
                                background: #f5f7fa;
                                border-radius: 4px;
                                font-size: 13px;
                                color: #606266;
                                box-sizing: border-box;
                            ">
                            <span v-if="!moreSummary">Email / URI / CRL / OCSP / 签发者证书 URL</span>
                            <span v-else>{{ moreSummary }}</span>
                        </div>
                        <el-button type="primary" plain @click="openMoreSettings">编辑</el-button>
                    </div>
                </el-form-item>

                <el-form-item label="密钥用途（KeyUsage）">
                    <el-checkbox-group v-model="form.keyUsage">
                        <el-checkbox-button v-for="u in keyUsageOptions" :key="u.value" :value="u.value" :title="u.value">
                            {{ u.label }}
                        </el-checkbox-button>
                    </el-checkbox-group>
                </el-form-item>

                <el-form-item label="扩展密钥用途（ExtKeyUsage）">
                    <el-checkbox-group v-model="form.extKeyUsage">
                        <el-checkbox-button v-for="u in extKeyUsageOptions" :key="u.value" :value="u.value" :title="u.value">
                            {{ u.label }}
                        </el-checkbox-button>
                    </el-checkbox-group>
                </el-form-item>

                <el-form-item>
                    <el-button type="primary" :loading="submitting" @click="submit">签发</el-button>
                    <el-button :disabled="submitting" @click="reset">重置</el-button>
                    <el-button type="success" plain @click="openPreset">按用途辅助勾选</el-button>
                </el-form-item>
            </el-form>

            <el-alert v-if="result" type="success" :closable="false" style="margin-top: 12px; max-width: 840px">
                <template #title>
                    签发成功：{{ result }}
                    <el-button link type="primary" @click="$router.push(`/cert/detail/${result}`)">查看详情</el-button>
                </template>
            </el-alert>
        </div>

        <!-- 右侧：帮助信息 -->
        <aside class="issue-help">
            <el-card shadow="never" class="help-card">
                <template #header>
                    <div class="help-header">
                        <span class="help-dot" />
                        <span>帮助信息</span>
                    </div>
                </template>

                <div class="help-section">
                    <h4>签发者 CA</h4>
                    <p>选择上级 CA，仅列出可签发终端证书的根 / 中间 CA，。</p>
                </div>

                <div class="help-section">
                    <h4>使用 CSR</h4>
                    <p>勾选后由 CSR 提供公钥，密钥算法 / 长度不生效（对应表单项已隐藏）；subject 仍需在本页填写。签名算法仍由签发者 CA 决定。</p>
                </div>

                <div class="help-section">
                    <h4>密钥算法与长度</h4>
                    <p>决定新证书自身的公钥算法与位数，与签发者 CA 的密钥类型无关，可以自由组合。勾选「使用 CSR」时此项隐藏，公钥由 CSR 决定。</p>
                    <p style="margin-top: 6px">
                        <b>RSA 2048</b>：安全强度约 112 位，兼容性最好的底线。<br />
                        <b>RSA 3072</b>：约 128 位，与 ECDSA P-256 相当，但体积大、签名慢。<br />
                        <b>RSA 4096</b>：约 140 位，余量足但握手 / 验签开销明显。<br />
                        <b>ECDSA P-256</b>：约 128 位，公钥 / 签名短、性能优，现代默认首选。<br />
                        <b>ECDSA P-384</b>：约 192 位，高安全场景。<br />
                        <b>ECDSA P-521</b>：约 256 位，最高等级，部分老客户端支持不佳。<br />
                        <b>Ed25519</b>：无长度可选，安全强度约 128 位，现代、高效，兼容性略差。
                    </p>
                </div>

                <div class="help-section">
                    <h4>签名算法</h4>
                    <p>由签发者 CA 私钥对证书签名时使用的哈希 。</p>
                    <p style="margin-top: 6px">
                        <b>RSA · PKCS#1 v1.5</b>：<code>sha256</code> / <code>sha384</code> / <code>sha512</code>，兼容性最好，几乎所有系统都支持。
                    </p>
                    <p style="margin-top: 6px">
                        <b>RSA · PSS</b>：<code>sha256pss</code> / <code>sha384pss</code> / <code>sha512pss</code>，随机化填充、有可证明安全，是 RSA
                        签名的现代推荐；但老系统（旧 Java / OpenSSL / 嵌入式设备）可能不支持或解析异常。<code>sha512pss</code> 要求 RSA ≥ 2048 位。
                    </p>
                    <p style="margin-top: 6px"><b>ECDSA</b>：<code>sha256</code> / <code>sha384</code> / <code>sha512</code></p>
                    <p style="margin-top: 6px"><b>Ed25519</b>：固定 <code>ed25519</code>，哈希内置不可选。</p>
                </div>

                <div class="help-section">
                    <h4>推荐组合</h4>
                    <p>在左侧帮助信息中查看更多</p>
                </div>

                <div class="help-section">
                    <h4>主题 (Subject)</h4>
                    <p>点击右侧「编辑」打开弹窗填写主题。</p>
                </div>

                <div class="help-section">
                    <h4>有效期</h4>
                    <p>支持天 / 月 / 年。</p>
                </div>

                <div class="help-section">
                    <h4>主题密钥标识符 (SKI)</h4>
                    <p>Subject Key Identifier 的哈希算法。</p>
                </div>

                <div class="help-section">
                    <h4>DNS（SAN）</h4>
                    <p>逗号分隔，如 <code>*.example.com,www.blogs.com</code>。点击右侧放大按钮可在弹窗中编辑。</p>
                </div>

                <div class="help-section">
                    <h4>IP（SAN）</h4>
                    <p>逗号分隔，如 <code>192.168.22.18,172.17.17.99</code>。点击右侧放大按钮可在弹窗中编辑。</p>
                </div>

                <div class="help-section">
                    <h4>更多设置</h4>
                    <p>Email / URI（SAN）、CRL 分发点、OCSP URL、签发者证书 URL 均在「更多设置」弹窗内填写，均支持逗号分隔多个。</p>
                </div>

                <div class="help-section">
                    <h4>KeyUsage / ExtKeyUsage</h4>
                    <p style="margin-bottom: 6px; color: #e6a23c">可点底部「按用途辅助勾选」，选场景后勾选后再按需微调。</p>
                </div>
            </el-card>
        </aside>
    </div>

    <CertMoreSubjectDialog ref="moreDialogRef" :form="form" @confirm="onMoreConfirm" />
    <CertUsagePresetDialog ref="presetDialogRef" @apply="onPresetApply" />
    <CertMoreSettingsDialog ref="moreSettingsRef" v-model="moreSettings" @confirm="onMoreSettingsConfirm" />

    <!-- DNS / IP 放大编辑弹窗 -->
    <el-dialog v-model="expandVisible" :title="expandField === 'dns' ? '编辑 DNS' : '编辑 IP'" width="640px" append-to-body>
        <el-input
            v-model="expandValue"
            type="textarea"
            :rows="10"
            :placeholder="expandField === 'dns' ? '逗号或换行分隔，如 *.example.com,www.blogs.com' : '逗号或换行分隔，如 192.168.22.18,172.17.17.99'" />
        <template #footer>
            <el-button @click="expandVisible = false">取消</el-button>
            <el-button type="primary" @click="confirmExpand">确定</el-button>
        </template>
    </el-dialog>
</template>

<script>
import { markRaw } from "vue";
import { FullScreen } from "@element-plus/icons-vue";
import { IssueEndEntity, ListCert } from "../../api/cacert.js";
import { msg } from "../../utils/message.ts";
import CertMoreSubjectDialog from "./components/CertMoreSubjectDialog.vue";
import CertUsagePresetDialog from "./components/CertUsagePresetDialog.vue";
import CertMoreSettingsDialog from "./components/CertMoreSettingsDialog.vue";

const makeInitialForm = () => ({
    issuer: { id: "" },
    title: "",
    key: { algo: "rsa", size: 2048 },
    signatureAlgorithm: "",
    names: { C: undefined, ST: undefined, L: undefined, O: undefined, OU: undefined, CN: "" },
    expiry: { value: 3, unit: "m" },
    subjectKeyIdentifier: "sha1",
    keyUsage: [],
    extKeyUsage: [],
    alt_names: { dns: [], ip: [], email: [], uri: [] },
    csrpem: "",
});

const makeInitialMoreSettings = () => ({
    email: "",
    uri: "",
    crl: "",
    ocsp: "",
    issuingCertUrl: "",
});

const buildSubject = (names) => {
    const entries = [
        ["CN", names.CN],
        ["C", names.C],
        ["ST", names.ST],
        ["L", names.L],
        ["O", names.O],
        ["OU", names.OU],
    ];
    return entries
        .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "")
        .map(([k, v]) => `/${k}=${String(v).trim()}`)
        .join("");
};

const ECDSA_SIZE_TO_SIG = { 256: "sha256", 384: "sha384", 521: "sha512" };

const buildSigOptions = (algo) => {
    if (algo === "rsa") {
        return [
            { label: "SHA256", value: "sha256" },
            { label: "SHA384", value: "sha384" },
            { label: "SHA512", value: "sha512" },
            { label: "SHA256 PSS", value: "sha256pss" },
            { label: "SHA384 PSS", value: "sha384pss" },
            { label: "SHA512 PSS", value: "sha512pss" },
        ];
    }
    if (algo === "ecdsa") {
        return [
            { label: "SHA256", value: "sha256" },
            { label: "SHA384", value: "sha384" },
            { label: "SHA512", value: "sha512" },
        ];
    }
    if (algo === "ed25519") {
        return [{ label: "Ed25519", value: "ed25519" }];
    }
    return [];
};

const defaultSigFor = (algo, size) => {
    if (algo === "rsa") return "sha256";
    if (algo === "ecdsa") return ECDSA_SIZE_TO_SIG[size] || "sha256";
    if (algo === "ed25519") return "ed25519";
    return "";
};

export default {
    name: "CertIssue",
    components: { CertMoreSubjectDialog, CertUsagePresetDialog, CertMoreSettingsDialog },
    data() {
        return {
            useCsr: false,
            submitting: false,
            result: "",
            dnsStr: "",
            ipStr: "",
            // 更多设置（Email / URI / CRL / OCSP / 签发者证书 URL）
            moreSettings: makeInitialMoreSettings(),
            issuerOptions: [],
            issuerLoading: false,
            subjectConfirmed: false,
            // DNS / IP 放大编辑弹窗状态
            expandVisible: false,
            expandField: "", // 'dns' | 'ip'
            expandValue: "",
            // 图标组件，供模板 :icon 使用（markRaw 避免被响应式代理）
            FullScreen: markRaw(FullScreen),
            algoOptions: [
                { label: "ECDSA", value: "ecdsa" },
                { label: "RSA", value: "rsa" },
                { label: "Ed25519", value: "ed25519" },
            ],
            keyUsageOptions: [
                { label: "数字签名", value: "digitalSignature" },
                { label: "密钥加密", value: "keyEncipherment" },
                { label: "内容承诺", value: "contentCommitment" },
                { label: "数据加密", value: "dataEncipherment" },
                { label: "密钥协商", value: "keyAgreement" },
                { label: "仅加密", value: "encipherOnly" },
                { label: "仅解密", value: "decipherOnly" },
            ],
            extKeyUsageOptions: [
                { label: "服务端认证", value: "serverAuth" },
                { label: "客户端认证", value: "clientAuth" },
                { label: "代码签名", value: "codeSigning" },
                { label: "邮件保护", value: "emailProtection" },
                { label: "时间戳", value: "timeStamping" },
                { label: "OCSP 签名", value: "ocspSigning" },
            ],
            form: makeInitialForm(),
        };
    },
    computed: {
        sizeOptions() {
            if (this.form.key.algo === "rsa") return [2048, 3072, 4096];
            if (this.form.key.algo === "ecdsa") return [256, 384, 521];
            return [];
        },
        selectedIssuer() {
            if (!this.form.issuer.id) return null;
            return this.issuerOptions.find((ca) => ca.certId === this.form.issuer.id) || null;
        },
        issuerKeyAlgo() {
            return this.selectedIssuer?.key?.algo || "";
        },
        issuerKeySize() {
            return this.selectedIssuer?.key?.size || 0;
        },
        signatureAlgorithmOptions() {
            return buildSigOptions(this.issuerKeyAlgo);
        },
        rules() {
            return {
                "issuer.id": [{ required: true, message: "选择签发者 CA", trigger: "change" }],
                title: [{ required: true, message: "名称必填", trigger: "blur" }],
                signatureAlgorithm: [{ required: true, message: "签名算法必填", trigger: "change" }],
                "expiry.value": [
                    { required: true, type: "number", message: "有效期必填", trigger: "blur" },
                    { type: "number", min: 1, message: "有效期必须 ≥ 1", trigger: "blur" },
                ],
                csrpem: [{ required: true, message: "CSR PEM 必填", trigger: "blur" }],
            };
        },
        subjectText() {
            return buildSubject(this.form.names);
        },
        moreSummary() {
            const parts = [];
            if (this.moreSettings.email.trim()) parts.push("Email");
            if (this.moreSettings.uri.trim()) parts.push("URI");
            if (this.moreSettings.crl.trim()) parts.push("CRL");
            if (this.moreSettings.ocsp.trim()) parts.push("OCSP");
            if (this.moreSettings.issuingCertUrl.trim()) parts.push("签发者证书 URL");
            return parts.length ? `已填写：${parts.join(" / ")}` : "";
        },
    },
    watch: {
        "form.issuer.id"() {
            this.syncSignatureAlgorithm();
        },
        useCsr(val) {
            if (val) {
                this.form.csrpem = "";
                this.$nextTick(() => {
                    this.$refs.csrItem?.clearValidate?.();
                });
                setTimeout(() => {
                    this.$refs.csrItem?.clearValidate?.();
                }, 0);
            } else {
                this.form.csrpem = "";
                this.$nextTick(() => {
                    this.$refs.csrItem?.clearValidate?.();
                });
            }
        },
    },
    mounted() {
        this.loadIssuers();
    },
    methods: {
        clearFieldValidate(field) {
            this.$refs.formRef?.clearValidate?.(field);
        },
        async loadIssuers() {
            this.issuerLoading = true;
            try {
                const res = await ListCert({ genre: [1, 2], hk: 1, offset: 0, limit: 100 });
                this.issuerOptions = res?.payload?.items || [];
                this.syncSignatureAlgorithm();
            } catch (e) {
                msg.error(e.message || "加载签发者 CA 列表失败");
                this.issuerOptions = [];
            } finally {
                this.issuerLoading = false;
            }
        },
        syncSignatureAlgorithm() {
            const algo = this.issuerKeyAlgo;
            if (!algo) {
                this.form.signatureAlgorithm = "";
                return;
            }
            const options = buildSigOptions(algo);
            const def = defaultSigFor(algo, this.issuerKeySize);
            const valid = options.some((o) => o.value === this.form.signatureAlgorithm);
            if (!valid) {
                this.form.signatureAlgorithm = def;
            }
        },
        onAlgoChange(algo) {
            if (algo === "rsa") {
                this.form.key.size = 2048;
            } else if (algo === "ecdsa") {
                this.form.key.size = 256;
            } else {
                this.form.key.size = 0;
            }
        },
        onUnitChange(unit) {
            if (unit === "d") this.form.expiry.value = 90;
            else if (unit === "m") this.form.expiry.value = 3;
            else if (unit === "y") this.form.expiry.value = 1;
        },
        openMore() {
            this.$refs.moreDialogRef?.open();
        },
        onMoreConfirm(names) {
            Object.assign(this.form.names, names);
            this.subjectConfirmed = true;
        },
        openPreset() {
            this.$refs.presetDialogRef?.open();
        },
        onPresetApply({ keyUsage, extKeyUsage, label }) {
            this.form.keyUsage = [...keyUsage];
            this.form.extKeyUsage = [...extKeyUsage];
            msg.success(`已应用：${label}`);
        },
        openMoreSettings() {
            this.$refs.moreSettingsRef?.open();
        },
        onMoreSettingsConfirm(val) {
            this.moreSettings = { ...val };
        },
        splitComma(s) {
            return String(s || "")
                .split(",")
                .map((x) => x.trim())
                .filter(Boolean);
        },
        // 打开 DNS / IP 放大编辑弹窗
        openExpand(field) {
            this.expandField = field;
            this.expandValue = field === "dns" ? this.dnsStr : this.ipStr;
            this.expandVisible = true;
        },
        // 确认回写：换行 / 中文逗号统一成英文逗号，兼容 splitComma
        confirmExpand() {
            const normalized = String(this.expandValue || "")
                .replace(/\r?\n/g, ",")
                .replace(/，/g, ",");
            if (this.expandField === "dns") {
                this.dnsStr = normalized;
            } else {
                this.ipStr = normalized;
            }
            this.expandVisible = false;
        },
        async submit() {
            try {
                await this.$refs.formRef.validate();
            } catch {
                return;
            }
            if (!String(this.form.names.CN || "").trim()) {
                msg.warning("请填写「主题 (Subject)」");
                this.openMore();
                return;
            }
            if (this.useCsr && !String(this.form.csrpem || "").trim()) {
                msg.warning("请填写 CSR PEM");
                return;
            }
            const body = {
                ...this.form,
                issuer: { ...this.form.issuer },
                names: { ...this.form.names },
                key: { ...this.form.key },
                expiry: `${this.form.expiry.value}${this.form.expiry.unit}`,
                alt_names: {
                    dns: this.splitComma(this.dnsStr),
                    ip: this.splitComma(this.ipStr),
                    email: this.splitComma(this.moreSettings.email),
                    uri: this.splitComma(this.moreSettings.uri),
                },
                crlDistributionPoints: this.splitComma(this.moreSettings.crl),
                ocspServer: this.splitComma(this.moreSettings.ocsp),
                issuingCertificateURL: this.splitComma(this.moreSettings.issuingCertUrl),
            };
            if (!this.useCsr) {
                body.csrpem = "";
            } else {
                delete body.key;
            }
            this.submitting = true;
            try {
                const res = await IssueEndEntity(body);
                this.result = res?.payload?.certId || "";
                if (this.result) msg.success("签发成功");
                else msg.warning("签发返回但未拿到 certId");
            } catch (e) {
                msg.error(e.message || "签发失败");
            } finally {
                this.submitting = false;
            }
        },
        reset() {
            Object.assign(this.form, makeInitialForm());
            this.useCsr = false;
            this.dnsStr = "";
            this.ipStr = "";
            this.moreSettings = makeInitialMoreSettings();
            this.result = "";
            this.subjectConfirmed = false;
            this.expandVisible = false;
            this.expandField = "";
            this.expandValue = "";
            this.$refs.formRef?.clearValidate?.();
            this.$nextTick(() => this.$refs.csrItem?.clearValidate?.());
        },
    },
};
</script>

<style scoped>
@import "./root-ca.css";
</style>
