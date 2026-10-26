<template>
    <div class="issue-page">
        <div class="issue-main">
            <div class="page-title">
                <h2>签发中间 CA</h2>
                <p>选择父 CA 签发下级 CA，用于隔离根 CA 私钥。</p>
            </div>
            <el-form ref="formRef" :model="form" :rules="rules" label-width="240px">
                <el-form-item label="根 CA" prop="issuer.id">
                    <el-select v-model="form.issuer.id" filterable clearable placeholder="选择根 CA" style="max-width: 600px" :loading="issuerLoading">
                        <el-option v-for="ca in issuerOptions" :key="ca.certId" :label="ca.title || ca.subject || ca.certId" :value="ca.certId">
                            <span>{{ ca.title || ca.subject || ca.certId }}</span>
                            <span v-if="ca.key" style="float: right; color: #909399; font-size: 12px; margin-left: 8px">
                                {{ (ca.key.algo || "").toUpperCase() }}{{ ca.key.size ? " " + ca.key.size : "" }}
                            </span>
                        </el-option>
                        <template #empty>
                            <el-empty description="暂无可用的父 CA" :image-size="60" />
                        </template>
                    </el-select>
                </el-form-item>

                <el-form-item label="名称" prop="title">
                    <el-input v-model="form.title" placeholder="请输入证书名称" style="max-width: 600px" @input="clearFieldValidate('title')" />
                </el-form-item>

                <el-form-item label="密钥算法" required>
                    <div style="display: flex; gap: 24px; align-items: center; flex-wrap: wrap">
                        <el-radio-group v-model="form.key.algo" @change="onAlgoChange">
                            <el-radio-button value="ecdsa">ECDSA</el-radio-button>
                            <el-radio-button value="rsa">RSA</el-radio-button>
                            <el-radio-button value="ed25519">Ed25519</el-radio-button>
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
                        <span v-if="!issuerKeyAlgo" style="color: #909399; font-size: 12px"> 请先选择父 CA，签名算法由 CA 密钥类型决定 </span>
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

                <el-form-item label="PathLen">
                    <el-input-number v-model="form.pathLen" :min="0" :max="0" />
                    <span style="margin-left: 8px; color: #909399; font-size: 12px"> 0 : 只能签发末端证书 </span>
                </el-form-item>

                <el-form-item>
                    <el-button type="primary" :loading="submitting" @click="submit">提交</el-button>
                    <el-button :disabled="submitting" @click="reset">重置</el-button>
                </el-form-item>
            </el-form>

            <el-alert v-if="result" type="success" :closable="false" style="margin-top: 12px; max-width: 840px">
                <template #title>
                    中间 CA 创建成功：{{ result }}
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
                    <h4>签名 CA</h4>
                    <p>选择签发本中间 CA 的上级 CA，仅列出可签发下级 CA 的根 / 中间 CA。</p>
                </div>

                <div class="help-section">
                    <h4>名称</h4>
                    <p>证书显示名称，仅用于识别证书。</p>
                </div>

                <div class="help-section">
                    <h4>密钥算法与长度</h4>
                    <p>决定本中间 CA 自身的公钥算法与位数，可以按需选择。</p>
                    <p style="margin-top: 6px">
                        <b>RSA 2048</b>：安全强度约 112 位，兼容性最好的底线。<br />
                        <b>RSA 3072</b>：约 128 位，与 ECDSA P-256 相当，但体积大、签名慢。<br />
                        <b>RSA 4096</b>：约 140 位，余量足但握手 / 验签开销明显。<br />
                        <b>ECDSA P-256</b>：约 128 位，公钥 / 签名短、性能优，现代默认首选。<br />
                        <b>ECDSA P-384</b>：约 192 位，高安全场景。<br />
                        <b>ECDSA P-521</b>：约 256 位，最高等级，部分老客户端支持不佳。<br />
                        <b>Ed25519</b>：无长度可选，安全强度约 128 位，密钥 / 签名短、性能高、实现简单。
                    </p>
                </div>

                <div class="help-section">
                    <h4>签名算法</h4>
                    <p style="margin-bottom: 6px; color: #909399; font-size: 12px">
                        签名算法由<b>父 CA 的密钥类型</b>决定；本页「密钥算法」决定的是中间 CA 自身公钥，两者相互独立。
                    </p>
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
                    <h4>PathLen</h4>
                    <p><b>0</b>：只能签发末端证书；<b>N</b>：其下最多再嵌套 N 层中间 CA。</p>
                </div>

                <div class="help-section">
                    <h4>密钥用途</h4>
                    <p>中间 CA 固定 <code>keyCertSign</code> + <code>crlSign</code>，用于签发证书与 CRL，无需手动选择。</p>
                </div>
            </el-card>
        </aside>
    </div>

    <CertMoreSubjectDialog ref="moreDialogRef" :form="form" @confirm="onMoreConfirm" />
</template>

<script>
import { IssueIntermediate, ListCert } from "../../api/cacert.js";
import { msg } from "../../utils/message.ts";
import CertMoreSubjectDialog from "./components/CertMoreSubjectDialog.vue";

const makeInitialForm = () => ({
    issuer: { id: "" },
    title: "",
    key: { algo: "rsa", size: 2048 },
    signatureAlgorithm: "",
    names: { C: undefined, ST: undefined, L: undefined, O: undefined, OU: undefined, CN: "" },
    expiry: { value: 1, unit: "y" },
    subjectKeyIdentifier: "sha1",
    pathLen: 0,
    keyUsage: ["keyCertSign", "crlSign"],
    extKeyUsage: [],
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
    name: "CaIntermediate",
    components: { CertMoreSubjectDialog },
    data() {
        return {
            submitting: false,
            result: "",
            issuerOptions: [],
            issuerLoading: false,
            subjectConfirmed: false,
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
                "issuer.id": [{ required: true, message: "请选择父 CA", trigger: "change" }],
                title: [{ required: true, message: "名称必填", trigger: "blur" }],
                signatureAlgorithm: [{ required: true, message: "签名算法必填", trigger: "change" }],
                "expiry.value": [
                    { required: true, type: "number", message: "有效期必填", trigger: "blur" },
                    { type: "number", min: 1, message: "有效期必须 ≥ 1", trigger: "blur" },
                ],
            };
        },
        subjectText() {
            return buildSubject(this.form.names);
        },
    },
    watch: {
        "form.issuer.id"() {
            this.syncSignatureAlgorithm();
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
                msg.error(e.message || "加载父 CA 列表失败");
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
            this.submitting = true;
            try {
                const body = {
                    ...this.form,
                    issuer: { ...this.form.issuer },
                    names: { ...this.form.names },
                    key: { ...this.form.key },
                    expiry: `${this.form.expiry.value}${this.form.expiry.unit}`,
                };
                const res = await IssueIntermediate(body);
                this.result = res?.payload?.certId || "";
                if (this.result) {
                    msg.success("创建成功");
                } else {
                    msg.warning("创建返回但未拿到 certId");
                }
            } catch (e) {
                msg.error(e.message || "创建失败");
            } finally {
                this.submitting = false;
            }
        },
        reset() {
            Object.assign(this.form, makeInitialForm());
            this.result = "";
            this.subjectConfirmed = false;
            this.$refs.formRef?.clearValidate?.();
        },
    },
};
</script>
<style scoped>
@import "./root-ca.css";
</style>
