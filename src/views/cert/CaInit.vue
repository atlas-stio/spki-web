<template>
    <div class="issue-page">
        <!-- 左侧：表单 -->
        <div class="issue-main">
            <el-form ref="formRef" :model="form" :rules="rules" label-width="240px">
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
                            <el-radio-group v-model="form.key.size" @change="onSizeChange">
                                <el-radio-button v-for="s in sizeOptions" :key="s" :value="s">
                                    {{ s }}
                                </el-radio-button>
                            </el-radio-group>
                        </div>
                    </div>
                </el-form-item>

                <!-- 签名算法 -->
                <el-form-item label="签名算法" prop="signatureAlgorithm">
                    <el-radio-group v-model="form.signatureAlgorithm">
                        <el-radio-button v-for="s in signatureAlgorithmOptions" :key="s.value" :value="s.value">
                            {{ s.label }}
                        </el-radio-button>
                    </el-radio-group>
                </el-form-item>

                <!-- 通用名 CN：后面带“更多”按钮 -->
                <el-form-item label="通用名 (CN)" prop="names.CN">
                    <div style="display: flex; gap: 8px; align-items: center; width: 100%; max-width: 600px">
                        <el-input v-model="form.names.CN" placeholder="如 AAA PrivateSign Root CA" style="flex: 1" />
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

                <el-form-item>
                    <el-button type="primary" :loading="submitting" @click="submit">提交</el-button>
                </el-form-item>
            </el-form>

            <el-alert v-if="result" type="success" :closable="false" style="margin-top: 12px; max-width: 840px">
                <template #title>
                    根 CA 创建成功：{{ result }}
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
                    <h4>名称</h4>
                    <p>证书显示名称<span class="req">必填</span>，仅用于列表识别，不写入 Subject。</p>
                </div>

                <div class="help-section">
                    <h4>密钥算法与长度</h4>
                    <p>决定根 CA 自身的公钥算法与位数。</p>
                    <p style="margin-top: 6px">
                        <b>RSA 2048</b>：安全强度约 112 位，兼容性最好的底线。<br />
                        <b>RSA 3072</b>：约 128 位，与 ECDSA P-256 相当，但体积大、签名慢。<br />
                        <b>RSA 4096</b>：约 140 位，余量足但握手 / 验签开销明显。<br />
                        <b>ECDSA P-256</b>：约 128 位，公钥 / 签名短、性能优，现代默认首选。<br />
                        <b>ECDSA P-384</b>：约 192 位，高安全场景。<br />
                        <b>ECDSA P-521</b>：约 256 位，最高等级，部分老客户端支持不佳。<br />
                        <b>Ed25519</b>：无长度可选，安全强度约 128 位，现代、高效，但老系统（部分 Windows / Java）兼容性不如 ECDSA。
                    </p>
                    <p style="margin-top: 6px; color: #909399; font-size: 12px">
                        根 CA 是信任链起点，通常选较长密钥（如 RSA 4096 或 ECDSA P-384）留更高安全余量。
                    </p>
                </div>

                <div class="help-section">
                    <h4>签名算法</h4>
                    <p>根 CA 为自签名证书，签名算法由自身私钥类型决定（对应证书的 <code>signatureAlgorithm</code> 字段），不存在父 CA 约束。</p>
                    <p style="margin-top: 6px">
                        <b>RSA · PKCS#1 v1.5</b>：<code>sha256</code> / <code>sha384</code> / <code>sha512</code>，兼容性最好，几乎所有系统都支持。
                    </p>
                    <p style="margin-top: 6px">
                        <b>RSA · PSS</b>：<code>sha256pss</code> / <code>sha384pss</code> / <code>sha512pss</code>，随机化填充、有可证明安全，是 RSA
                        签名的现代推荐；但老系统（旧 Java / OpenSSL / 嵌入式设备）可能不支持或解析异常。<code>sha512pss</code> 要求 RSA ≥ 2048 位。
                    </p>
                    <p style="margin-top: 6px">
                        <b>ECDSA</b>：<code>sha256</code> / <code>sha384</code> / <code>sha512</code>，标准搭配为
                        P-256→SHA256、P-384→SHA384、P-521→SHA512（切换曲线时已自动匹配，可再手动调整）；错配技术可行但偏离互操作性惯例，无额外收益。
                    </p>
                    <p style="margin-top: 6px"><b>Ed25519</b>：固定 <code>ed25519</code>，哈希内置不可选。</p>
                    <p style="margin-top: 6px; color: #909399; font-size: 12px">
                        提示：PSS 的盐长度需与哈希长度一致（SHA-256 对应 32 字节），否则严格实现（如 Go <code>crypto/x509</code>）可能验签失败。
                    </p>
                </div>

                <div class="help-section">
                    <h4>推荐组合</h4>
                    <p>
                        <b>现代系统</b>：ECDSA P-384 + SHA384（根 CA 留更高余量）。<br />
                        <b>兼容优先</b>：RSA 4096 + <code>sha256</code>（PKCS#1 v1.5），适用于老设备 / IoT。<br />
                        <b>高安全</b>：ECDSA P-521 + SHA512，或 RSA 4096 + <code>sha512pss</code>。<br />
                        <b>RSA 想用现代填充</b>：用 <code>sha256pss</code> 替代 <code>sha256</code>，前提是确认下游（客户端、CRL/OCSP 校验方、审计系统）均支持
                        PSS。
                    </p>
                    <p style="margin-top: 6px; color: #909399; font-size: 12px">
                        根 CA 有效期长、私钥离线保管，选型时优先考虑长期兼容性与安全余量，不宜过度追求性能。
                    </p>
                </div>

                <div class="help-section">
                    <h4>主题 (Subject)</h4>
                    <p>CN 通用名<span class="req">必填</span>；点击「更多」填写 C / ST / L / O / OU，其中 O、OU<span class="req">必填</span></p>
                </div>

                <div class="help-section">
                    <h4>有效期</h4>
                    <p>
                        支持天 / 月 / 年，切换单位时默认：天 <b>360</b> · 月 <b>3</b> · 年 <b>1</b>。根 CA 通常设置较长有效期（如 10~20
                        年），避免频繁轮换；轮换根 CA 需同步更新所有信任存储。
                    </p>
                </div>

                <div class="help-section">
                    <h4>主题密钥标识符 (SKI)</h4>
                    <p>Subject Key Identifier 的哈希算法，默认 <code>SHA-1</code>。</p>
                </div>

                <div class="help-section">
                    <h4>密钥用途</h4>
                    <p>根 CA 固定 <code>keyCertSign</code> + <code>crlSign</code>，用于签发下级 CA / 末端证书与 CRL，无需手动选择。</p>
                </div>

                <div class="help-section">
                    <h4>根 CA 说明</h4>
                    <p>根 CA 为自签名证书，是信任链的起点。请妥善保管其私钥，建议离线存储，避免泄露；一旦私钥泄露，整个信任链失效，需重新签发并分发新根。</p>
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
                <el-input v-model="form.names.OU" placeholder="如 PrivateSign" />
            </el-form-item>
            <el-form-item label="通用名 (CN)" prop="names.CN">
                <el-input v-model="form.names.CN" placeholder="如 AAA PrivateSign Root CA" />
            </el-form-item>
        </el-form>
        <template #footer>
            <el-button @click="moreVisible = false">取消</el-button>
            <el-button type="primary" @click="confirmMore">确定</el-button>
        </template>
    </el-dialog>
</template>

<script>
import { InitCa } from "../../api/cacert.js";
import { msg } from "../../utils/message.ts";

// 拼接 RFC2253 风格的 subject
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

// ECDSA 曲线与推荐签名哈希的映射
const ECDSA_SIZE_TO_SIG = { 256: "sha256", 384: "sha384", 521: "sha512" };

export default {
    name: "CaRoot",
    data() {
        return {
            submitting: false,
            result: "",

            moreVisible: false,
            subjectConfirmed: false,

            form: {
                title: "",
                key: { algo: "rsa", size: 2048 },
                signatureAlgorithm: "sha256",
                names: { C: "", ST: "", L: "", O: "", OU: "", CN: "" },
                expiry: { value: 3, unit: "y" },
                subjectKeyIdentifier: "sha1",
                keyUsage: ["keyCertSign", "crlSign"],
                extKeyUsage: [],
            },

            rules: {
                title: [{ required: true, message: "名称必填", trigger: "blur" }],
                "names.CN": [{ required: true, message: "CN 必填", trigger: "blur" }],
                signatureAlgorithm: [{ required: true, message: "签名算法必填", trigger: "change" }],
                "expiry.value": [
                    { required: true, type: "number", message: "有效期必填", trigger: "blur" },
                    { type: "number", min: 1, message: "有效期必须 ≥ 1", trigger: "blur" },
                ],
            },

            moreRules: {
                // 弹窗里也校验 CN，与主表单保持一致
                "names.CN": [{ required: true, message: "CN 必填", trigger: "blur" }],
                "names.O": [{ required: true, message: "O 必填", trigger: "blur" }],
                "names.OU": [{ required: true, message: "OU 必填", trigger: "blur" }],
            },
        };
    },
    computed: {
        sizeOptions() {
            if (this.form.key.algo === "rsa") return [2048, 3072, 4096];
            if (this.form.key.algo === "ecdsa") return [256, 384, 521];
            return [];
        },
        signatureAlgorithmOptions() {
            if (this.form.key.algo === "rsa") {
                return [
                    { label: "SHA256", value: "sha256" },
                    { label: "SHA384", value: "sha384" },
                    { label: "SHA512", value: "sha512" },
                    { label: "SHA256 PSS", value: "sha256pss" },
                    { label: "SHA384 PSS", value: "sha384pss" },
                    { label: "SHA512 PSS", value: "sha512pss" },
                ];
            }
            if (this.form.key.algo === "ecdsa") {
                return [
                    { label: "SHA256", value: "sha256" },
                    { label: "SHA384", value: "sha384" },
                    { label: "SHA512", value: "sha512" },
                ];
            }
            // ed25519
            return [{ label: "Ed25519", value: "ed25519" }];
        },
        subjectText() {
            return buildSubject(this.form.names);
        },
    },
    methods: {
        onAlgoChange(algo) {
            if (algo === "rsa") {
                this.form.key.size = 2048;
                this.form.signatureAlgorithm = "sha256";
            } else if (algo === "ecdsa") {
                this.form.key.size = 256;
                this.form.signatureAlgorithm = ECDSA_SIZE_TO_SIG[256];
            } else {
                this.form.key.size = 0;
                this.form.signatureAlgorithm = "ed25519";
            }
        },
        // ECDSA 曲线联动签名哈希：P-256→SHA256、P-384→SHA384、P-521→SHA512
        onSizeChange(size) {
            if (this.form.key.algo === "ecdsa") {
                const sig = ECDSA_SIZE_TO_SIG[size];
                if (sig) this.form.signatureAlgorithm = sig;
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
                const data = await InitCa({
                    ...this.form,
                    names: { ...this.form.names },
                    key: { ...this.form.key },
                    expiry: `${this.form.expiry.value}${this.form.expiry.unit}`,
                });
                this.result = data?.certId || "";
                msg.success("创建成功");
            } catch (e) {
                msg.error(e.message || "创建失败");
            } finally {
                this.submitting = false;
            }
        },
    },
};
</script>

<style scoped>
@import "./root-ca.css";
</style>
