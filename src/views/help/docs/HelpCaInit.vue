<template>
    <el-card shadow="never" class="help-card">
        <template #header>
            <div class="help-header">
                <span class="help-dot" />
                <span>初始化根 CA · 帮助信息</span>
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
            <p style="margin-top: 6px; color: #909399; font-size: 12px">根 CA 是信任链起点，通常选较长密钥（如 RSA 4096 或 ECDSA P-384）留更高安全余量。</p>
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
            <p style="margin-top: 6px; color: #909399; font-size: 12px">提示：PSS 的盐长度需与哈希长度一致（SHA-256 对应 32 字节），可能验签失败。</p>
        </div>

        <div class="help-section">
            <h4>推荐组合</h4>
            <p>
                <b>现代系统</b>：ECDSA P-384 + SHA384（根 CA 留更高余量）。<br />
                <b>兼容优先</b>：RSA 4096 + <code>sha256</code>（PKCS#1 v1.5），适用于老设备 / IoT。<br />
                <b>高安全</b>：ECDSA P-521 + SHA512，或 RSA 4096 + <code>sha512pss</code>。<br />
                <b>RSA 想用现代填充</b>：用 <code>sha256pss</code> 替代 <code>sha256</code>，前提是确认下游（客户端、CRL/OCSP 校验方、审计系统）均支持 PSS。
            </p>
            <p style="margin-top: 6px; color: #909399; font-size: 12px">根 CA 有效期长、私钥离线保管，选型时优先考虑长期兼容性与安全余量，不宜过度追求性能。</p>
        </div>

        <div class="help-section">
            <h4>主题 (Subject)</h4>
            <p>点击右侧「编辑」打开弹窗填写主题。</p>
        </div>

        <div class="help-section">
            <h4>有效期</h4>
            <p>支持天 / 月 / 年。根 CA 通常设置较长有效期（如 10~20 年），避免频繁轮换；轮换根 CA 需同步更新所有信任存储。</p>
        </div>

        <div class="help-section">
            <h4>主题密钥标识符 (SKI)</h4>
            <p>Subject Key Identifier 的哈希算法。</p>
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
</template>

<script>
export default {
    name: "HelpCaInit",
};
</script>

<!-- template 与 script 不变，仅替换 style 段 -->
<style scoped>
@import "./help-docs.css";
</style>
