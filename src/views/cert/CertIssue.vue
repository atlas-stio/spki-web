<template>
    <div class="issue-page">
        <!-- 左侧：表单 -->
        <div class="issue-main">
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
                    <el-input v-model="form.title" placeholder="请输入证书名称" style="max-width: 600px" />
                </el-form-item>

                <el-form-item label="使用 CSR">
                    <el-switch v-model="useCsr" />
                    <span v-if="useCsr" style="margin-left: 8px; color: #e6a23c; font-size: 12px"> CSR 只提供公钥和密钥算法，subject 仍需在下方填写 </span>
                </el-form-item>

                <el-form-item v-if="useCsr" ref="csrItem" label="CSR PEM" prop="csrpem">
                    <el-input v-model="form.csrpem" type="textarea" :rows="8" placeholder="-----BEGIN CERTIFICATE REQUEST-----" />
                </el-form-item>

                <!-- 使用 CSR 时隐藏密钥算法，公钥由 CSR 提供 -->
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

                <!-- 签名算法：由所选 CA 的密钥类型决定 -->
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

                <!-- 通用名 CN：后面带“更多”按钮 -->
                <el-form-item label="通用名 (CN)" prop="names.CN">
                    <div style="display: flex; gap: 8px; align-items: center; width: 100%; max-width: 600px">
                        <el-input v-model="form.names.CN" placeholder="如 www.example.com" style="flex: 1" />
                        <el-button type="primary" plain @click="openMore">更多</el-button>
                    </div>
                </el-form-item>

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

                <el-form-item label="DNS">
                    <el-input v-model="dnsStr" placeholder="逗号分隔，如 a.com,b.com" style="max-width: 600px" />
                </el-form-item>
                <el-form-item label="IP">
                    <el-input v-model="ipStr" placeholder="逗号分隔，如 1.1.1.1,2.2.2.2" style="max-width: 600px" />
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
                    <p>选择上级 CA，仅列出可签发终端证书的根 / 中间 CA，支持搜索。下拉项右侧会显示该 CA 的密钥类型（如 ECDSA 256 / RSA 2048）。</p>
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
                        <b>Ed25519</b>：无长度可选，安全强度约 128 位，现代、高效，但老系统（部分 Windows / Java）兼容性不如 ECDSA。
                    </p>
                </div>

                <div class="help-section">
                    <h4>签名算法</h4>
                    <p>
                        由签发者 CA 私钥对证书签名时使用的哈希 / 签名方案（对应证书的 <code>signatureAlgorithm</code> 字段）。
                        <span style="color: #e6a23c"
                            >必须先选择 CA，选项会按 CA 的公钥类型自动过滤：CA 是 RSA 只能选 RSA 系列，是 ECDSA 只能选 ECDSA 系列，是 Ed25519 则固定
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
                        CA 后已按 CA 曲线自动选默认值，可再手动调整）；错配技术可行但偏离互操作性惯例，无额外收益。
                    </p>
                    <p style="margin-top: 6px"><b>Ed25519</b>：固定 <code>ed25519</code>，哈希内置不可选。</p>
                    <p style="margin-top: 6px; color: #909399; font-size: 12px">
                        提示：PSS 的盐长度需与哈希长度一致（SHA-256 对应 32 字节），否则严格实现（如 Go <code>crypto/x509</code>）可能验签失败。
                    </p>
                </div>

                <div class="help-section">
                    <h4>推荐组合</h4>
                    <p>
                        <b>现代系统</b>：ECDSA P-256 + SHA256（签发者 CA 为 ECDSA P-256 时）。<br />
                        <b>兼容优先</b>：RSA 2048 + <code>sha256</code>（PKCS#1 v1.5），适用于老设备 / IoT。<br />
                        <b>高安全</b>：ECDSA P-384 + SHA384，或 RSA 3072 + <code>sha256pss</code>。<br />
                        <b>RSA 想用现代填充</b>：用 <code>sha256pss</code> 替代 <code>sha256</code>，前提是确认下游（客户端、CRL/OCSP 校验方、审计系统）均支持
                        PSS。
                    </p>
                    <p style="margin-top: 6px; color: #909399; font-size: 12px">
                        没有兼容性包袱时，优先 ECDSA P-256 + SHA256；有老设备 / IoT 时，推荐 RSA 2048 + SHA256（PKCS#1 v1.5）。
                    </p>
                </div>

                <div class="help-section">
                    <h4>主题 (Subject)</h4>
                    <p>CN 通用名<span class="req">必填</span>；点击「更多」填写 C / ST / L / O / OU，其中 O、OU<span class="req">必填</span></p>
                </div>

                <div class="help-section">
                    <h4>有效期</h4>
                    <p>支持天 / 月 / 年，实际到期可能受 CA 策略截断。终端证书通常设置较短有效期（如 90 天 ~ 1 年），配合自动续期。</p>
                </div>

                <div class="help-section">
                    <h4>主题密钥标识符 (SKI)</h4>
                    <p>Subject Key Identifier 的哈希算法，默认 <code>SHA-1</code>。</p>
                </div>

                <div class="help-section">
                    <h4>DNS / IP（SAN）</h4>
                    <p>逗号分隔，如 <code>a.com,b.com</code>、<code>1.1.1.1</code>。<br /></p>
                </div>

                <div class="help-section">
                    <h4>KeyUsage / ExtKeyUsage</h4>
                    <p>默认「数字签名 + 密钥加密」；扩展默认「服务端 + 客户端认证」，Web 服务保留 <code>serverAuth</code> 即可。</p>

                    <p style="margin-top: 6px"><b>常用组合：</b></p>
                    <p style="margin-top: 4px">
                        <b>HTTPS 服务端</b>（Web / 反向代理）：KU <code>digitalSignature</code> + <code>keyEncipherment</code>，EKU
                        <code>serverAuth</code>。<br />
                        <b>HTTPS（ECDSA / Ed25519 密钥）</b>：KU 仅 <code>digitalSignature</code>，EKU <code>serverAuth</code>；这两种算法不做密钥加密，<code
                            >keyEncipherment</code
                        >
                        无意义。<br />
                        <b>OpenVPN 服务端</b>：KU <code>digitalSignature</code> + <code>keyEncipherment</code>，EKU <code>serverAuth</code>（<span
                            style="color: #e6a23c"
                            >必须带，否则客户端报 “Certificate does not have key usage extension”</span
                        >）。<br />
                        <b>OpenVPN 客户端</b>：KU <code>digitalSignature</code>，EKU <code>clientAuth</code>。<br />
                        <b>Kubernetes API Server / etcd 服务端</b>：KU <code>digitalSignature</code> + <code>keyEncipherment</code>，EKU
                        <code>serverAuth</code>。<br />
                        <b>Kubernetes 客户端</b>（kubelet / scheduler / controller-manager）：KU <code>digitalSignature</code> +
                        <code>keyEncipherment</code>，EKU <code>clientAuth</code>。<br />
                        <b>Kubernetes etcd Peer / 通用 mTLS</b>：KU <code>digitalSignature</code> + <code>keyEncipherment</code>，EKU <code>serverAuth</code> +
                        <code>clientAuth</code>（节点间互为客户端与服务端）。<br />
                        <b>根 CA / 中间 CA</b>：KU <code>keyCertSign</code> + <code>crlSign</code>，EKU 留空（<span style="color: #e6a23c"
                            >这两项只能用在 CA 证书上，末端证书勿勾选</span
                        >）。
                    </p>

                    <p style="margin-top: 8px"><b>中英文对照：</b></p>
                    <div class="ku-map">
                        <div>
                            <div class="ku-map-title">KeyUsage</div>
                            <div><code>digitalSignature</code> 数字签名</div>
                            <div><code>keyEncipherment</code> 密钥加密</div>
                            <div><code>contentCommitment</code> 内容承诺</div>
                            <div><code>dataEncipherment</code> 数据加密</div>
                            <div><code>keyAgreement</code> 密钥协商</div>
                            <div><code>encipherOnly</code> 仅加密</div>
                            <div><code>decipherOnly</code> 仅解密</div>
                            <div><code>keyCertSign</code> 证书签名</div>
                            <div><code>crlSign</code> CRL 签名</div>
                        </div>
                        <div>
                            <div class="ku-map-title">ExtKeyUsage</div>
                            <div><code>serverAuth</code> 服务端认证</div>
                            <div><code>clientAuth</code> 客户端认证</div>
                            <div><code>codeSigning</code> 代码签名</div>
                            <div><code>emailProtection</code> 邮件保护</div>
                            <div><code>timeStamping</code> 时间戳</div>
                            <div><code>ocspSigning</code> OCSP 签名</div>
                        </div>
                    </div>

                    <p style="margin-top: 8px; color: #909399; font-size: 12px">
                        提示：<code>digitalSignature</code> 是现代 TLS 的必选项（TLS 1.3、ECDSA / Ed25519 均依赖它）；<code>keyEncipherment</code> 仅对 RSA
                        密钥交换（TLS 1.2 及以下）有意义。
                    </p>
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
                <el-input v-model="form.names.ST" placeholder="如 Zhejiang" />
            </el-form-item>
            <el-form-item label="城市 (L)" prop="names.L">
                <el-input v-model="form.names.L" placeholder="如 Hangzhou" />
            </el-form-item>
            <el-form-item label="组织 (O)" prop="names.O">
                <el-input v-model="form.names.O" placeholder="如 PrivateSign" />
            </el-form-item>
            <el-form-item label="部门 (OU)" prop="names.OU">
                <el-input v-model="form.names.OU" placeholder="如 Web" />
            </el-form-item>
            <el-form-item label="通用名 (CN)" prop="names.CN">
                <el-input v-model="form.names.CN" placeholder="如 www.example.com" />
            </el-form-item>
        </el-form>
        <template #footer>
            <el-button @click="moreVisible = false">取消</el-button>
            <el-button type="primary" @click="confirmMore">确定</el-button>
        </template>
    </el-dialog>
</template>

<script>
import { IssueEndEntity, ListCert } from "../../api/cacert.js";
import { msg } from "../../utils/message.ts";

const makeInitialForm = () => ({
    issuer: { id: "" },
    title: "",
    key: { algo: "rsa", size: 2048 },
    signatureAlgorithm: "", // 初始为空，选中 CA 后设置默认值
    names: { C: "", ST: "", L: "", O: "", OU: "", CN: "" },
    expiry: { value: 3, unit: "m" },
    subjectKeyIdentifier: "sha1",
    keyUsage: ["digitalSignature", "keyEncipherment"],
    extKeyUsage: ["serverAuth", "clientAuth"],
    alt_names: { dns: [], ip: [] },
    csrpem: "",
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
    name: "CertIssue",
    data() {
        return {
            useCsr: false,
            submitting: false,
            result: "",
            dnsStr: "",
            ipStr: "",
            issuerOptions: [],
            issuerLoading: false,
            moreVisible: false,
            subjectConfirmed: false,
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
            // csrpem 规则常驻，不随 useCsr 动态增删，避免 rules 重算导致 Element 立即校验。
            // 是否必填在 submit() 中手动兜底判断。
            return {
                "issuer.id": [{ required: true, message: "选择签发者 CA", trigger: "change" }],
                title: [{ required: true, message: "名称必填", trigger: "blur" }],
                "names.CN": [{ required: true, message: "CN 必填", trigger: "blur" }],
                signatureAlgorithm: [{ required: true, message: "签名算法必填", trigger: "change" }],
                "expiry.value": [
                    { required: true, type: "number", message: "有效期必填", trigger: "blur" },
                    { type: "number", min: 1, message: "有效期必须 ≥ 1", trigger: "blur" },
                ],
                csrpem: [{ required: true, message: "CSR PEM 必填", trigger: "blur" }],
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
        // 使用 CSR 开关：不立即触发校验，等输入框渲染后清掉 Element 自动跑的首次校验
        useCsr(val) {
            if (val) {
                // 打开时先清空历史值，防止上次残留
                this.form.csrpem = "";
                this.$nextTick(() => {
                    this.$refs.csrItem?.clearValidate?.();
                });
                // 兜底：部分 Element 版本会在渲染后异步校验
                setTimeout(() => {
                    this.$refs.csrItem?.clearValidate?.();
                }, 0);
            } else {
                // 关闭时清空值与校验，避免残留
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
        async loadIssuers() {
            this.issuerLoading = true;
            try {
                const res = await ListCert({ genre: [1, 2], hk: 1, offset: 0, limit: 100 });
                this.issuerOptions = res?.payload?.items || [];
                // 列表加载后如果已有选中的 issuer（比如回填），同步一次
                this.syncSignatureAlgorithm();
            } catch (e) {
                msg.error(e.message || "加载签发者 CA 列表失败");
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
                this.form.key.size = 0;
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
        splitComma(s) {
            return String(s || "")
                .split(",")
                .map((x) => x.trim())
                .filter(Boolean);
        },
        async submit() {
            try {
                await this.$refs.formRef.validate();
            } catch {
                return;
            }
            // 使用 CSR 时手动兜底校验 CSR PEM（规则常驻但字段 v-if 隐藏时不会被校验）
            if (this.useCsr && !String(this.form.csrpem || "").trim()) {
                msg.warning("请填写 CSR PEM");
                return;
            }
            if (!this.form.names.O || !this.form.names.OU) {
                msg.warning("请点击“更多”填写组织 (O) 与部门 (OU)");
                this.openMore();
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
                },
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
            this.result = "";
            this.moreVisible = false;
            this.subjectConfirmed = false;
            this.$refs.formRef?.clearValidate?.();
            this.$nextTick(() => this.$refs.csrItem?.clearValidate?.());
        },
    },
};
</script>

<style scoped>
@import "./root-ca.css";
.ku-map {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px 20px;
    margin-top: 6px;
    font-size: 13px;
    color: #606266;
    line-height: 1.9;
}

.ku-map-title {
    font-weight: 600;
    color: #303133;
    margin-bottom: 4px;
}

.ku-map code {
    display: inline-block;
    min-width: 130px;
}
</style>
