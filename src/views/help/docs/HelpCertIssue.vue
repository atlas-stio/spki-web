<template>
    <el-card shadow="never" class="help-card">
        <template #header>
            <div class="help-header">
                <span class="help-dot" />
                <span>签发证书 · 帮助信息</span>
            </div>
        </template>

        <div class="help-section">
            <h4>签发者 CA</h4>
            <p>选择上级 CA，仅列出可签发终端证书的根 / 中间 CA，支持搜索。</p>
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
                    >必须先选择 CA，选项会按 CA 的公钥类型自动过滤：CA 是 RSA 只能选 RSA 系列，是 ECDSA 只能选 ECDSA 系列，是 Ed25519 则固定 ed25519。</span
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
                <b>ECDSA</b>：<code>sha256</code> / <code>sha384</code> / <code>sha512</code>，标准搭配为 P-256→SHA256、P-384→SHA384、P-521→SHA512（选 CA 后已按
                CA 曲线自动选默认值，可再手动调整）；错配技术可行但偏离互操作性惯例，无额外收益。
            </p>
            <p style="margin-top: 6px"><b>Ed25519</b>：固定 <code>ed25519</code>，哈希内置不可选。</p>
            <p style="margin-top: 6px; color: #909399; font-size: 12px">提示：PSS 的盐长度需与哈希长度一致（SHA-256 对应 32 字节），否则可能验签失败。</p>
        </div>

        <div class="help-section">
            <h4>推荐组合</h4>
            <p>
                <b>现代系统</b>：ECDSA P-256 + SHA256（签发者 CA 为 ECDSA P-256 时）。<br />
                <b>兼容优先</b>：RSA 2048 + <code>sha256</code>（PKCS#1 v1.5），适用于老设备 / IoT。<br />
                <b>高安全</b>：ECDSA P-384 + SHA384，或 RSA 3072 + <code>sha256pss</code>。<br />
                <b>RSA 想用现代填充</b>：用 <code>sha256pss</code> 替代 <code>sha256</code>，前提是确认下游（客户端、CRL/OCSP 校验方、审计系统）均支持 PSS。
            </p>
            <p style="margin-top: 6px; color: #909399; font-size: 12px">
                没有兼容问题时，优先 ECDSA P-256 + SHA256；有老设备 / IoT 时，推荐 RSA 2048 + SHA256（PKCS#1 v1.5）。
            </p>
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
            <h4>DNS / IP（SAN）</h4>
            <p>逗号分隔，如 <code>*.example.com,www.blogs.com</code>、<code>192.168.22.18,172.17.17.99</code>。<br /></p>
        </div>

        <div class="help-section">
            <h4>KeyUsage / ExtKeyUsage</h4>
            <p style="margin-bottom: 6px; color: #e6a23c">可点底部「按用途辅助勾选」，选场景后勾选后再按需微调。</p>
            <p>Web 服务通常保留 <code>serverAuth</code> 即可。</p>

            <p style="margin-top: 6px"><b>常用组合：</b></p>
            <p style="margin-top: 4px">
                <b>HTTPS 服务端</b>（Web / 反向代理）：KU <code>digitalSignature</code> + <code>keyEncipherment</code>，EKU <code>serverAuth</code>。<br />
                <b>HTTPS（ECDSA / Ed25519 密钥）</b>：KU 仅 <code>digitalSignature</code>，EKU <code>serverAuth</code>；这两种算法不做密钥加密，<code
                    >keyEncipherment</code
                >
                无意义。<br />
                <b>OpenVPN 服务端</b>：KU <code>digitalSignature</code> + <code>keyEncipherment</code>，EKU <code>serverAuth</code>（<span
                    style="color: #e6a23c"
                    >必须带，否则客户端报 “Certificate does not have key usage extension”</span
                >）。<br />
                <b>OpenVPN 客户端</b>：KU <code>digitalSignature</code>，EKU <code>clientAuth</code>。<br />
                <b>Kubernetes API Server / etcd 服务端</b>：KU <code>digitalSignature</code> + <code>keyEncipherment</code>，EKU <code>serverAuth</code>。<br />
                <b>Kubernetes 客户端</b>（kubelet / scheduler / controller-manager）：KU <code>digitalSignature</code> + <code>keyEncipherment</code>，EKU
                <code>clientAuth</code>。<br />
                <b>Kubernetes etcd Peer / 通用 mTLS</b>：KU <code>digitalSignature</code> + <code>keyEncipherment</code>，EKU <code>serverAuth</code> +
                <code>clientAuth</code>（节点间互为客户端与服务端）。<br />
                <b>代码签名 / 应用签名</b>：KU <code>digitalSignature</code>，EKU <code>codeSigning</code>。<br />
                <b>根 CA / 中间 CA</b>：KU <code>keyCertSign</code> + <code>crlSign</code>，EKU 留空。
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
</template>

<script>
export default {
    name: "HelpCertIssue",
};
</script>
<!-- template 与 script 不变，仅替换 style 段 -->
<style scoped>
@import "./help-docs.css";
</style>
