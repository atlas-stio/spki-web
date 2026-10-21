<template>
    <div class="issue-page">
        <!-- 左侧：表单 -->
        <div class="issue-main">
            <el-form ref="formRef" :model="form" :rules="rules" label-width="240px" :validate-on-rule-change="false">
                <el-form-item label="名称" prop="title">
                    <el-input v-model="form.title" placeholder="请输入证书名称" style="max-width: 600px" />
                </el-form-item>

                <el-form-item label="CA 类型">
                    <el-radio-group v-model="form.caType" @change="onCaTypeChange">
                        <el-radio-button value="root">根 CA</el-radio-button>
                        <el-radio-button value="intermediate">中间 CA</el-radio-button>
                    </el-radio-group>
                </el-form-item>

                <!-- 中间 CA 时才显示，且必填；紧跟在 CA 类型下方 -->
                <el-form-item v-if="form.caType === 'intermediate'" label="根CA ID" prop="issuerId">
                    <el-input v-model="form.issuerId" placeholder="请输入上级根 CA 的 ID" style="max-width: 600px" />
                </el-form-item>

                <el-form-item label="证书 PEM" prop="certPem">
                    <el-input v-model="form.certPem" type="textarea" :rows="8" placeholder="-----BEGIN CERTIFICATE-----" style="max-width: 600px" />
                </el-form-item>

                <el-form-item label="私钥 PEM">
                    <el-input
                        v-model="form.keyPem"
                        type="textarea"
                        :rows="8"
                        placeholder="可选，PKCS#8。若导入后需要签发下级，则必须提供"
                        style="max-width: 600px" />
                </el-form-item>

                <el-form-item>
                    <el-button type="primary" :loading="submitting" @click="submit">导入</el-button>
                </el-form-item>
            </el-form>

            <el-alert v-if="result" type="success" :closable="false" style="margin-top: 12px; max-width: 840px">
                <template #title>
                    导入成功：{{ result }}
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
                    <p>证书显示名称<span class="req">必填</span>，仅用于列表识别，不写入证书。</p>
                </div>

                <div class="help-section">
                    <h4>CA 类型</h4>
                    <p>选择导入的是根 CA 还是中间 CA。选择中间 CA 时，必须填写上级根 CA 的 ID。</p>
                </div>

                <div class="help-section">
                    <h4>根CA ID</h4>
                    <p>仅中间 CA 需要<span class="req">必填</span>，填写签发该中间 CA 的上级根 CA 的 certId；导入根 CA 时不显示此字段。</p>
                </div>

                <div class="help-section">
                    <h4>证书 PEM</h4>
                    <p>
                        导入的 CA 证书内容<span class="req">必填</span>，需包含 <code>-----BEGIN CERTIFICATE-----</code> 与
                        <code>-----END CERTIFICATE-----</code>。
                    </p>
                </div>

                <div class="help-section">
                    <h4>私钥 PEM</h4>
                    <p>可选，PKCS#8 格式，需包含 <code>-----BEGIN PRIVATE KEY-----</code>。若导入后需要签发下级 CA 或末端证书，则必须提供。</p>
                </div>

                <div class="help-section">
                    <h4>导入说明</h4>
                    <p>
                        导入的证书需具备 CA 相关 KeyUsage（<code>keyCertSign</code> /
                        <code>crlSign</code>），否则无法用于签发下级证书。请妥善保管私钥，建议离线存储。
                    </p>
                </div>

                <el-alert type="info" :closable="false" show-icon style="margin-top: 4px"> 带 <span class="req">必填</span> 标记的为必填项。 </el-alert>
            </el-card>
        </aside>
    </div>
</template>

<script>
import { msg } from "../../utils/message.ts";
import { ImportCA } from "../../api/cacert.js";

export default {
    name: "CaImport",
    data() {
        return {
            submitting: false,
            result: "",

            form: {
                title: "",
                caType: "root",
                certPem: "",
                keyPem: "",
                issuerId: "",
            },
        };
    },
    computed: {
        rules() {
            const base = {
                title: [{ required: true, message: "名称必填", trigger: "blur" }],
                certPem: [{ required: true, message: "证书 PEM 必填", trigger: "blur" }],
            };
            if (this.form.caType === "intermediate") {
                base.issuerId = [{ required: true, message: "根CA ID 必填", trigger: "blur" }];
            }
            return base;
        },
    },
    methods: {
        onCaTypeChange(type) {
            if (type === "root") {
                this.form.issuerId = "";
            }
            this.$nextTick(() => this.$refs.formRef?.clearValidate?.("issuerId"));
        },
        async submit() {
            try {
                await this.$refs.formRef.validate();
            } catch {
                return;
            }
            this.submitting = true;
            try {
                const data = await ImportCA({ ...this.form });
                this.result = data?.certId || "";
                msg.success("导入成功");
            } catch (e) {
                msg.error(e.message || "导入失败");
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
