<template>
    <el-dialog v-model="visible" title="按用途辅助勾选" width="720px" append-to-body>
        <div style="margin-bottom: 8px; font-size: 12px; color: #909399">选择场景后点击「应用」将自动勾选 KU / EKU，应用后可修改。</div>
        <el-radio-group
            v-model="selectedKey"
            style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; align-items: stretch; width: 100%">
            <el-radio v-for="p in presets" :key="p.key" :value="p.key" border style="height: auto; padding: 10px 12px; margin-right: 0">
                <div style="white-space: normal; text-align: left">
                    <div style="font-weight: 600; color: #303133">{{ p.label }}</div>
                    <div style="font-size: 12px; color: #909399; line-height: 1.6; margin-top: 2px">{{ p.desc }}</div>
                </div>
            </el-radio>
        </el-radio-group>
        <template #footer>
            <el-button @click="visible = false">取消</el-button>
            <el-button type="primary" @click="apply">应用</el-button>
        </template>
    </el-dialog>
</template>

<script>
// 预设场景表：每个场景声明 KU / EKU
const PRESETS = [
    {
        key: "https-server",
        label: "HTTPS 服务端（RSA）",
        desc: "KU 数字签名 + 密钥加密；EKU 服务端认证。",
        keyUsage: ["digitalSignature", "keyEncipherment"],
        extKeyUsage: ["serverAuth"],
    },
    {
        key: "https-server-ec",
        label: "HTTPS 服务端（ECDSA / Ed25519）",
        desc: "KU 仅数字签名；EKU 服务端认证。",
        keyUsage: ["digitalSignature"],
        extKeyUsage: ["serverAuth"],
    },
    {
        key: "openvpn-server",
        label: "OpenVPN 服务端",
        desc: "KU 数字签名 + 密钥加密；EKU 服务端认证（必须带，否则客户端报错）。",
        keyUsage: ["digitalSignature", "keyEncipherment"],
        extKeyUsage: ["serverAuth"],
    },
    {
        key: "openvpn-client",
        label: "OpenVPN 客户端",
        desc: "KU 数字签名；EKU 客户端认证。",
        keyUsage: ["digitalSignature"],
        extKeyUsage: ["clientAuth"],
    },
    {
        key: "k8s-apiserver",
        label: "Kubernetes API Server / etcd 服务端",
        desc: "KU 数字签名 + 密钥加密；EKU 服务端认证。",
        keyUsage: ["digitalSignature", "keyEncipherment"],
        extKeyUsage: ["serverAuth"],
    },
    {
        key: "k8s-client",
        label: "Kubernetes 客户端（kubelet / scheduler 等）",
        desc: "KU 数字签名 + 密钥加密；EKU 客户端认证。",
        keyUsage: ["digitalSignature", "keyEncipherment"],
        extKeyUsage: ["clientAuth"],
    },
    {
        key: "mtls",
        label: "通用 mTLS / etcd Peer",
        desc: "KU 数字签名 + 密钥加密；EKU 服务端认证 + 客户端认证。",
        keyUsage: ["digitalSignature", "keyEncipherment"],
        extKeyUsage: ["serverAuth", "clientAuth"],
    },
    {
        key: "code-signing",
        label: "代码签名",
        desc: "KU 数字签名；EKU 代码签名。",
        keyUsage: ["digitalSignature"],
        extKeyUsage: ["codeSigning"],
    },
    {
        key: "email",
        label: "邮件保护",
        desc: "KU 数字签名 + 密钥加密；EKU 邮件保护。",
        keyUsage: ["digitalSignature", "keyEncipherment"],
        extKeyUsage: ["emailProtection"],
    },
    {
        key: "timestamp",
        label: "时间戳",
        desc: "KU 数字签名 + 内容承诺；EKU 时间戳。",
        keyUsage: ["digitalSignature", "contentCommitment"],
        extKeyUsage: ["timeStamping"],
    },
    {
        key: "ocsp",
        label: "OCSP 响应签名",
        desc: "KU 数字签名；EKU OCSP 签名。",
        keyUsage: ["digitalSignature"],
        extKeyUsage: ["ocspSigning"],
    },
    {
        key: "ca",
        label: "根 CA / 中间 CA",
        desc: "KU 证书签名 + CRL 签名；EKU 留空（末端证书勿用）。",
        keyUsage: ["keyCertSign", "crlSign"],
        extKeyUsage: [],
    },
];

export default {
    name: "CertUsagePresetDialog",
    emits: ["apply"],
    data() {
        return {
            visible: false,
            selectedKey: PRESETS[0].key,
            presets: PRESETS,
        };
    },
    methods: {
        // 父组件通过 ref 调用：打开弹窗
        open() {
            this.visible = true;
        },
        apply() {
            const p = this.presets.find((x) => x.key === this.selectedKey);
            if (!p) return;
            this.$emit("apply", {
                keyUsage: [...p.keyUsage],
                extKeyUsage: [...p.extKeyUsage],
                label: p.label,
            });
            this.visible = false;
        },
    },
};
</script>
