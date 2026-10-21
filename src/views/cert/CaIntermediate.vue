<template>
    <div class="issue-page">
        <div class="issue-main">
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
                    <el-input v-model="form.title" placeholder="请输入证书名称" style="max-width: 600px" />
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

                <!-- 签名算法：由父 CA 的密钥类型决定 -->
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

                <!-- 通用名 CN：后面带“更多”按钮 -->
                <el-form-item label="通用名 (CN)" prop="names.CN">
                    <div style="display: flex; gap: 8px; align-items: center; width: 100%; max-width: 600px">
                        <el-input v-model="form.names.CN" placeholder="如 AAA Issuing CA" style="flex: 1" />
                        <el-button type="primary" plain @click="openMore">更多</el-button>
                    </div>
                </el-form-item>

                <!-- 弹窗确认后，在下一行展示拼接好的 Subject -->
                <el-form-item v-if="subjectConfirmed && subjectText" label="主题 (Subject)">
                    <div
                        style="
                            width: 100%;
                            max-width: 600px;
                            padding: 6px 10px;
                            background: #f5f7fa;
                            border-radius: 4px;
                            font-family: Consolas, Monaco, monospace;
                            font-size: 13px;
                            color: #303133;
                            word-break: break-all;
                            box-sizing: border-box;
                        ">
                        {{ subjectText }}
                    </div>
                </el-form-item>

                <!-- 有效期：数值 + 单位 -->
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

                <!-- SKI：按钮组 -->
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
                    <h4>父 CA</h4>
                    <p>
                        选择签发本中间 CA 的上级 CA，仅列出可签发下级 CA 的根 / 中间 CA，支持搜索。下拉项右侧会显示该 CA 的密钥类型（如 ECDSA 256 / RSA 2048）。
                    </p>
                </div>

                <div class="help-section">
                    <h4>名称</h4>
                    <p>证书显示名称，仅用于列表识别，不写入 Subject。</p>
                </div>

                <div class="help-section">
                    <h4>密钥算法与长度</h4>
                    <p>决定本中间 CA 自身的公钥算法与位数，与父 CA 的密钥类型无关，可以自由组合。</p>
                    <p style="margin-top: 6px">
                        <b>RSA 2048</b>：安全强度约 112 位，兼容性最好的底线。<br />
                        <b>RSA 3072</b>：约 128 位，与 ECDSA P-256 相当，但体积大、签名慢。<br />
                        <b>RSA 4096</b>：约 140 位，余量足但握手 / 验签开销明显。<br />
                        <b>ECDSA P-256</b>：约 128 位，公钥 / 签名短、性能优，现代默认首选。<br />
                        <b>ECDSA P-384</b>：约 192 位，高安全场景。<br />
                        <b>ECDSA P-521</b>：约 256 位，最高等级，部分老客户端支持不佳。<br />
                        <b>Ed25519</b>：无长度可选，安全强度约 128 位，密钥 / 签名短、性能高、实现简单。
                    </p>
                    <p style="margin-top: 6px; color: #e6a23c; font-size: 12px">
                        注意：中间 CA 使用 Ed25519 会放大兼容性风险。中间 CA 位于信任链中间，其算法要被链上每一个验证方识别；部分老系统（旧 Windows / 旧 Java /
                        部分嵌入式 TLS 栈 / 部分 HSM）对 Ed25519 中间 CA 支持不全，可能导致整条链验证失败。新系统或受控环境可用，面向多样化客户端时建议中间 CA
                        仍用 ECDSA P-256 或 RSA。
                    </p>
                </div>

                <div class="help-section">
                    <h4>签名算法</h4>
                    <p style="margin-bottom: 6px; color: #909399; font-size: 12px">
                        签名算法由<b>父 CA 的密钥类型</b>决定；本页「密钥算法」决定的是中间 CA 自身公钥，两者相互独立。
                    </p>
                    <p>
                        由父 CA 私钥对证书签名时使用的哈希 / 签名方案（对应证书的 <code>signatureAlgorithm</code> 字段）。
                        <span style="color: #e6a23c"
                            >必须先选择父 CA，选项会按父 CA 的公钥类型自动过滤：父 CA 是 RSA 只能选 RSA 系列，是 ECDSA 只能选 ECDSA 系列，是 Ed25519 则固定
                            ed25519。</span
                        >
                    </p>
                    <p style="margin-top: 6px">
                        <b>RSA · PKCS#1 v1.5</b>：<code>sha256</code> / <code>sha384</code> / <code>sha512</code>，兼容性最好，几乎所有系统都支持。
                    </p>
                    <p style="margin-top: 6px">
                        <b>RSA · PSS</b>：<code>sha256pss</code> / <code>sha384pss</code> / <code>sha512pss</code>，随机化填充、有可证明安全，是 RSA
                        签名的现代推荐；但老系统（旧 Java / OpenSSL / 嵌入式设备）可能不支持或解析异常。<code>sha512pss</code> 要求 RSA ≥ 2048 位。
                    </p>
                    <p style="margin-top: 6px">
                        <b>ECDSA</b>：<code>sha256</code> / <code>sha384</code> / <code>sha512</code>，标准搭配为 P-256→SHA256、P-384→SHA384、P-521→SHA512（选
                        CA 后已按父 CA 曲线自动选默认值，可再手动调整）；错配技术可行但偏离互操作性惯例，无额外收益。
                    </p>
                    <p style="margin-top: 6px"><b>Ed25519</b>：固定 <code>ed25519</code>，哈希内置不可选（仅当父 CA 为 Ed25519 时可选）。</p>
                    <p style="margin-top: 6px; color: #909399; font-size: 12px">
                        提示：PSS 的盐长度需与哈希长度一致（SHA-256 对应 32 字节），否则严格实现（如 Go <code>crypto/x509</code>）可能验签失败。
                    </p>
                </div>

                <div class="help-section">
                    <h4>推荐组合</h4>
                    <p>
                        <b>现代系统</b>：根 ECDSA P-384 + SHA384 · 中间 ECDSA P-256 + SHA256 · 末端 ECDSA P-256 + SHA256。<br />
                        <b>兼容优先</b>：根 RSA 4096 · 中间 RSA 3072 · 末端 RSA 2048，签名统一 <code>sha256</code>（PKCS#1 v1.5）。<br />
                        <b>高安全</b>：根 ECDSA P-521 或 RSA 4096 + SHA512 / <code>sha512pss</code> · 中间 ECDSA P-384 + SHA384 · 末端 ECDSA P-256 + SHA256。<br />
                        <b>全 Ed25519</b>：根 / 中间 / 末端全用 Ed25519，适合全新受控环境；面向老客户端时需谨慎评估。<br />
                        <b>RSA 想用现代填充</b>：用 <code>sha256pss</code> 替代 <code>sha256</code>，前提是确认下游（客户端、CRL/OCSP 校验方、审计系统）均支持
                        PSS。
                    </p>
                    <p style="margin-top: 6px; color: #909399; font-size: 12px">
                        没有兼容性包袱时，优先 ECDSA P-256 + SHA256；有老设备 / IoT 时，退回 RSA + SHA256（PKCS#1 v1.5）最稳。
                    </p>
                </div>

                <div class="help-section">
                    <h4>主题 (Subject)</h4>
                    <p>CN 通用名<span class="req">必填</span>；点击「更多」填写 C / ST / L / O / OU，其中 O、OU<span class="req">必填</span></p>
                </div>

                <div class="help-section">
                    <h4>有效期</h4>
                    <p>默认 5 年，支持天 / 月 / 年；不能超过父 CA 的剩余有效期，否则会被父 CA 策略截断。</p>
                </div>

                <div class="help-section">
                    <h4>主题密钥标识符 (SKI)</h4>
                    <p>Subject Key Identifier 的哈希算法，默认 <code>SHA-1</code>。</p>
                </div>

                <div class="help-section">
                    <h4>PathLen</h4>
                    <p><b>0</b>：只能签发末端证书；<b>N</b>：其下最多再嵌套 N 层中间 CA。</p>
                </div>

                <div class="help-section">
                    <h4>密钥用途</h4>
                    <p>中间 CA 固定 <code>keyCertSign</code> + <code>crlSign</code>，用于签发证书与 CRL，无需手动选择。</p>
                </div>

                <el-alert type="info" :closable="false" show-icon style="margin-top: 4px"> 带 <span class="req">必填</span> 标记的为必填项。 </el-alert>
            </el-card>
        </aside>
    </div>

    <!-- 更多主题信息弹窗 -->
    <el-dialog v-model="moreVisible" title="更多主题信息" width="520px" append-to-body>
        <el-form ref="moreFormRef" :model="form" :rules="moreRules" label-width="120px">
            <el-form-item label="国家 (C)" prop="names.C">
                <el-input v-model="form.names.C" placeholder="如 CN" />
            </el-form-item>
            <el-form-item label="省份 (ST)" prop="names.ST">
                <el-input v-model="form.names.ST" placeholder="如 Guangdong" />
            </el-form-item>
            <el-form-item label="城市 (L)" prop="names.L">
                <el-input v-model="form.names.L" placeholder="如 Shenzhen" />
            </el-form-item>
            <el-form-item label="组织 (O)" prop="names.O">
                <el-input v-model="form.names.O" placeholder="如 PrivateSign" />
            </el-form-item>
            <el-form-item label="部门 (OU)" prop="names.OU">
                <el-input v-model="form.names.OU" placeholder="如 Issuing" />
            </el-form-item>
            <el-form-item label="通用名 (CN)" prop="names.CN">
                <el-input v-model="form.names.CN" placeholder="如 AAA Issuing CA" />
            </el-form-item>
        </el-form>
        <template #footer>
            <el-button @click="moreVisible = false">取消</el-button>
            <el-button type="primary" @click="confirmMore">确定</el-button>
        </template>
    </el-dialog>
</template>

<script>
import { IssueIntermediate, ListCert } from "../../api/cacert.js";
import { msg } from "../../utils/message.ts";

const makeInitialForm = () => ({
    issuer: { id: "" },
    title: "",
    key: { algo: "rsa", size: 2048 },
    signatureAlgorithm: "", // 初始为空，选中 CA 后设置默认值
    names: { C: "", ST: "", L: "", O: "", OU: "", CN: "" },
    expiry: { value: 1, unit: "y" },
    subjectKeyIdentifier: "sha1",
    pathLen: 0,
    keyUsage: ["keyCertSign", "crlSign"],
    extKeyUsage: [],
});

const buildSubject = (names) => {
    const entries = [
        ["C", names.C],
        ["ST", names.ST],
        ["L", names.L],
        ["O", names.O],
        ["OU", names.OU],
        ["CN", names.CN],
    ];
    return entries
        .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "")
        .map(([k, v]) => `/${k}=${String(v).trim()}`)
        .join("");
};

// ECDSA 曲线与推荐签名哈希的映射（用于选 CA 后给默认签名算法）
const ECDSA_SIZE_TO_SIG = { 256: "sha256", 384: "sha384", 521: "sha512" };

// 按 CA 公钥算法返回签名算法选项
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

// 按 CA 公钥算法 + 长度返回默认签名算法
const defaultSigFor = (algo, size) => {
    if (algo === "rsa") return "sha256";
    if (algo === "ecdsa") return ECDSA_SIZE_TO_SIG[size] || "sha256";
    if (algo === "ed25519") return "ed25519";
    return "";
};

export default {
    name: "CaIntermediate",
    data() {
        return {
            submitting: false,
            result: "",
            issuerOptions: [],
            issuerLoading: false,
            moreVisible: false,
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
        // 当前选中的 CA 项
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
                "names.CN": [{ required: true, message: "CN 必填", trigger: "blur" }],
                signatureAlgorithm: [{ required: true, message: "签名算法必填", trigger: "change" }],
                "expiry.value": [
                    { required: true, type: "number", message: "有效期必填", trigger: "blur" },
                    { type: "number", min: 1, message: "有效期必须 ≥ 1", trigger: "blur" },
                ],
            };
        },
        moreRules() {
            return {
                "names.CN": [{ required: true, message: "CN 必填", trigger: "blur" }],
                "names.O": [{ required: true, message: "O 必填", trigger: "blur" }],
                "names.OU": [{ required: true, message: "OU 必填", trigger: "blur" }],
            };
        },
        subjectText() {
            return buildSubject(this.form.names);
        },
    },
    watch: {
        // 选中 CA 变化时，按 CA 的公钥算法重置签名算法
        "form.issuer.id"() {
            this.syncSignatureAlgorithm();
        },
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
                // 列表加载后如果已有选中的 issuer（比如回填），同步一次
                this.syncSignatureAlgorithm();
            } catch (e) {
                msg.error(e.message || "加载父 CA 列表失败");
                this.issuerOptions = [];
            } finally {
                this.issuerLoading = false;
            }
        },
        // 按当前 CA 的公钥算法设置签名算法默认值
        syncSignatureAlgorithm() {
            const algo = this.issuerKeyAlgo;
            if (!algo) {
                this.form.signatureAlgorithm = "";
                return;
            }
            const options = buildSigOptions(algo);
            const def = defaultSigFor(algo, this.issuerKeySize);
            // 如果当前值仍在可选集合中，保留；否则用默认
            const valid = options.some((o) => o.value === this.form.signatureAlgorithm);
            if (!valid) {
                this.form.signatureAlgorithm = def;
            }
        },
        // 新证书自身的密钥算法变化，不影响签名算法（签名算法由 CA 决定）
        onAlgoChange(algo) {
            if (algo === "rsa") {
                this.form.key.size = 2048;
            } else if (algo === "ecdsa") {
                this.form.key.size = 256;
            } else {
                this.form.key.size = 0; // ed25519 无长度
            }
        },
        onUnitChange(unit) {
            if (unit === "d") this.form.expiry.value = 90;
            else if (unit === "m") this.form.expiry.value = 3;
            else if (unit === "y") this.form.expiry.value = 1;
        },
        openMore() {
            this.moreVisible = true;
            this.$nextTick(() => this.$refs.moreFormRef?.clearValidate?.());
        },
        async confirmMore() {
            try {
                await this.$refs.moreFormRef.validate();
            } catch {
                return;
            }
            this.subjectConfirmed = true;
            this.moreVisible = false;
        },
        async submit() {
            try {
                await this.$refs.formRef.validate();
            } catch {
                return;
            }
            if (!this.form.names.O || !this.form.names.OU) {
                msg.warning("请点击“更多”填写组织 (O) 与部门 (OU)");
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
            this.moreVisible = false;
            this.subjectConfirmed = false;
            this.$refs.formRef?.clearValidate?.();
        },
    },
};
</script>
<style scoped>
@import "./root-ca.css";
</style>
