<template>
    <el-dialog v-model="visible" title="主题信息(Subject)" width="580px" append-to-body>
        <el-form ref="formRef" class="subject-form" :model="model" :rules="rules" label-width="120px">
            <el-form-item label="国家 (C)">
                <el-input v-model="model.names.C" placeholder="如 CN" class="field-input" />
            </el-form-item>
            <el-form-item label="省份 (ST)">
                <el-input v-model="model.names.ST" placeholder="如 Zhejiang" class="field-input" />
            </el-form-item>
            <el-form-item label="城市 (L)">
                <el-input v-model="model.names.L" placeholder="如 Hangzhou" class="field-input" />
            </el-form-item>
            <el-form-item label="组织 (O)">
                <el-input v-model="model.names.O" placeholder="如 PrivateSign" class="field-input" />
            </el-form-item>
            <el-form-item label="部门 (OU)">
                <el-input v-model="model.names.OU" placeholder="如 Web" class="field-input" />
            </el-form-item>
            <el-form-item label="通用名 (CN)" prop="names.CN">
                <el-input v-model="model.names.CN" placeholder="如 www.example.com" class="field-input" @input="clearFieldValidate('names.CN')" />
            </el-form-item>
        </el-form>
        <template #footer>
            <el-button @click="visible = false">取消</el-button>
            <el-button type="primary" @click="confirm">确定</el-button>
        </template>
    </el-dialog>
</template>

<script>
export default {
    name: "CertMoreSubjectDialog",
    props: {
        form: { type: Object, required: true },
    },
    // 把归一化后的 names 通过事件传出去，不在子组件里改 prop
    emits: ["confirm"],
    data() {
        return {
            visible: false,
        };
    },
    computed: {
        model() {
            return this.form;
        },
        rules() {
            return {
                "names.CN": [{ required: true, message: "CN 必填", trigger: "blur" }],
            };
        },
    },
    methods: {
        clearFieldValidate(field) {
            this.$refs.formRef?.clearValidate?.(field);
        },
        open() {
            this.visible = true;
            this.$nextTick(() => this.$refs.formRef?.clearValidate?.());
        },
        async confirm() {
            try {
                await this.$refs.formRef.validate();
            } catch {
                return;
            }

            // 除 CN 外全部可选：空串归一为 undefined，JSON 序列化时省略
            const names = {
                CN: String(this.model.names.CN ?? "").trim(),
                C: normalizeOptional(this.model.names.C),
                ST: normalizeOptional(this.model.names.ST),
                L: normalizeOptional(this.model.names.L),
                O: normalizeOptional(this.model.names.O),
                OU: normalizeOptional(this.model.names.OU),
            };

            this.$emit("confirm", names);
            this.visible = false;
        },
    },
};

function normalizeOptional(v) {
    const s = String(v ?? "").trim();
    return s === "" ? undefined : s;
}
</script>

<style scoped>
.subject-form {
    margin-right: 30px;
}

.field-input {
    width: 100%;
}
</style>
