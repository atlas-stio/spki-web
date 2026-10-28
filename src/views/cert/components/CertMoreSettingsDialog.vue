<template>
    <el-dialog v-model="visible" title="更多设置" width="760px" append-to-body @closed="onClosed">
        <el-form :model="model" label-width="120px">
            <el-form-item label="Email">
                <div style="display: flex; gap: 8px; align-items: center; width: 100%">
                    <el-input v-model="model.email" placeholder="逗号分隔，如 admin@example.com" style="flex: 1" />
                    <el-button :icon="FullScreen" title="放大编辑" @click="openExpand('email')" />
                </div>
            </el-form-item>

            <el-form-item label="URI">
                <div style="display: flex; gap: 8px; align-items: center; width: 100%">
                    <el-input v-model="model.uri" placeholder="逗号分隔，如 spiffe://example.org/workload" style="flex: 1" />
                    <el-button :icon="FullScreen" title="放大编辑" @click="openExpand('uri')" />
                </div>
            </el-form-item>

            <el-form-item label="CRL 分发点">
                <div style="display: flex; gap: 8px; align-items: center; width: 100%">
                    <el-input v-model="model.crl" placeholder="逗号分隔，如 http://crl.example.com/inter001.crl" style="flex: 1" />
                    <el-button :icon="FullScreen" title="放大编辑" @click="openExpand('crl')" />
                </div>
            </el-form-item>

            <el-form-item label="OCSP URL">
                <div style="display: flex; gap: 8px; align-items: center; width: 100%">
                    <el-input v-model="model.ocsp" placeholder="逗号分隔，如 http://ocsp.example.com" style="flex: 1" />
                    <el-button :icon="FullScreen" title="放大编辑" @click="openExpand('ocsp')" />
                </div>
            </el-form-item>

            <el-form-item label="签发者证书 URL">
                <div style="display: flex; gap: 8px; align-items: center; width: 100%">
                    <el-input v-model="model.issuingCertUrl" placeholder="逗号分隔，如 http://ca.example.com/inter001.crt" style="flex: 1" />
                    <el-button :icon="FullScreen" title="放大编辑" @click="openExpand('issuingCertUrl')" />
                </div>
            </el-form-item>
        </el-form>

        <template #footer>
            <el-button @click="visible = false">取消</el-button>
            <el-button type="primary" @click="confirm">确定</el-button>
        </template>

        <!-- 放大编辑弹窗 -->
        <el-dialog v-model="expandVisible" :title="expandTitle" width="640px" append-to-body>
            <el-input v-model="expandValue" type="textarea" :rows="10" :placeholder="expandPlaceholder" />
            <template #footer>
                <el-button @click="expandVisible = false">取消</el-button>
                <el-button type="primary" @click="confirmExpand">确定</el-button>
            </template>
        </el-dialog>
    </el-dialog>
</template>

<script>
import { markRaw } from "vue";
import { FullScreen } from "@element-plus/icons-vue";

const makeEmpty = () => ({
    email: "",
    uri: "",
    crl: "",
    ocsp: "",
    issuingCertUrl: "",
});

export default {
    name: "CertMoreSettingsDialog",
    props: {
        modelValue: {
            type: Object,
            default: () => makeEmpty(),
        },
    },
    emits: ["update:modelValue", "confirm"],
    data() {
        return {
            visible: false,
            model: makeEmpty(),
            expandVisible: false,
            expandField: "",
            expandValue: "",
            FullScreen: markRaw(FullScreen),
        };
    },
    computed: {
        expandTitle() {
            const map = {
                email: "编辑 Email",
                uri: "编辑 URI",
                crl: "编辑 CRL 分发点",
                ocsp: "编辑 OCSP URL",
                issuingCertUrl: "编辑签发者证书 URL",
            };
            return map[this.expandField] || "编辑";
        },
        expandPlaceholder() {
            if (this.expandField === "email") return "逗号或换行分隔，如 admin@example.com";
            if (this.expandField === "uri") return "逗号或换行分隔，如 spiffe://example.org/workload";
            if (this.expandField === "crl") return "逗号或换行分隔，如 http://crl.example.com/inter001.crl";
            if (this.expandField === "ocsp") return "逗号或换行分隔，如 http://ocsp.example.com";
            if (this.expandField === "issuingCertUrl") return "逗号或换行分隔，如 http://ca.example.com/inter001.crt";
            return "";
        },
    },
    methods: {
        open() {
            this.model = { ...makeEmpty(), ...this.modelValue };
            this.visible = true;
        },
        confirm() {
            this.$emit("update:modelValue", { ...this.model });
            this.$emit("confirm", { ...this.model });
            this.visible = false;
        },
        openExpand(field) {
            this.expandField = field;
            this.expandValue = this.model[field] || "";
            this.expandVisible = true;
        },
        confirmExpand() {
            const normalized = String(this.expandValue || "")
                .replace(/\r?\n/g, ",")
                .replace(/，/g, ",");
            this.model[this.expandField] = normalized;
            this.expandVisible = false;
        },
        onClosed() {
            this.expandVisible = false;
            this.expandField = "";
            this.expandValue = "";
        },
    },
};
</script>
