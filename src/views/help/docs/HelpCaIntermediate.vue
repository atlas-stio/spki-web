<template>
    <el-card shadow="never" class="help-card">
        <template #header>
            <div class="help-header">
                <span class="help-dot" />
                <span>签发中间 CA · 帮助信息</span>
            </div>
        </template>

        <div class="help-section">
            <h4>父 CA</h4>
            <p>选择签发本中间 CA 的上级 CA，仅列出可签发下级 CA 的根 / 中间 CA。</p>
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
                部分嵌入式 TLS 栈 / 部分 HSM）对 Ed25519 中间 CA 支持不全，可能导致整条链验证失败。新系统或受控环境可用，面向多样化客户端时建议中间 CA 仍用
                ECDSA P-256 或 RSA。
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
                <b>ECDSA</b>：<code>sha256</code> / <code>sha384</code> / <code>sha512</code>，标准搭配为 P-256→SHA256、P-384→SHA384、P-521→SHA512（选 CA
                后已按父 CA 曲线自动选默认值，可再手动调整）；错配技术可行但偏离互操作性惯例，无额外收益。
            </p>
            <p style="margin-top: 6px"><b>Ed25519</b>：固定 <code>ed25519</code>，哈希内置不可选（仅当父 CA 为 Ed25519 时可选）。</p>
            <p style="margin-top: 6px; color: #909399; font-size: 12px">提示：PSS 的盐长度需与哈希长度一致（SHA-256 对应 32 字节），否则可能验签失败。</p>
        </div>

        <div class="help-section">
            <h4>推荐组合</h4>
            <p>
                <b>现代系统</b>：根 ECDSA P-384 + SHA384 · 中间 ECDSA P-256 + SHA256 · 末端 ECDSA P-256 + SHA256。<br />
                <b>兼容优先</b>：根 RSA 4096 · 中间 RSA 3072 · 末端 RSA 2048，签名统一 <code>sha256</code>（PKCS#1 v1.5）。<br />
                <b>高安全</b>：根 ECDSA P-521 或 RSA 4096 + SHA512 / <code>sha512pss</code> · 中间 ECDSA P-384 + SHA384 · 末端 ECDSA P-256 + SHA256。<br />
                <b>全 Ed25519</b>：根 / 中间 / 末端全用 Ed25519，适合全新受控环境；面向老客户端时需谨慎评估。<br />
                <b>RSA 想用现代填充</b>：用 <code>sha256pss</code> 替代 <code>sha256</code>，前提是确认下游（客户端、CRL/OCSP 校验方、审计系统）均支持 PSS。
            </p>
            <p style="margin-top: 6px; color: #909399; font-size: 12px">
                没有兼容问题时，优先 ECDSA P-256 + SHA256；有老设备 / IoT 时，建议 RSA + SHA256（PKCS#1 v1.5）。
            </p>
        </div>

        <div class="help-section">
            <h4>主题 (Subject)</h4>
            <p>点击右侧「编辑」打开弹窗填写主题。</p>
        </div>

        <div class="help-section">
            <h4>有效期</h4>
            <p>默认 5 年，支持天 / 月 / 年。</p>
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

        <el-alert type="info" :closable="false" show-icon style="margin-top: 4px"> 带 <span class="req">必填</span> 标记的为必填项。 </el-alert>
    </el-card>
</template>

<script>
export default {
    name: "HelpCaIntermediate",
};
</script>

<!-- template 与 script 不变，仅替换 style 段 -->
<style scoped>
@import "./help-docs.css";
</style>
