<template>
    <div class="help-page">
        <!-- 左侧：文档目录 -->
        <aside class="help-sidebar">
            <div class="help-title">帮助文档</div>
            <el-menu :default-active="activeDoc" class="help-menu" @select="onSelect">
                <el-menu-item v-for="doc in docs" :key="doc.key" :index="doc.key">
                    <span>{{ doc.title }}</span>
                </el-menu-item>
            </el-menu>
        </aside>

        <!-- 右侧：文档内容 -->
        <section class="help-content">
            <component :is="currentDoc.component" />
        </section>
    </div>
</template>

<script>
import HelpCaInit from "./docs/HelpCaInit.vue";
import HelpCaIntermediate from "./docs/HelpCaIntermediate.vue";
import HelpCertIssue from "./docs/HelpCertIssue.vue";

export default {
    name: "HelpPage",
    components: { HelpCaInit, HelpCaIntermediate, HelpCertIssue },
    data() {
        return {
            docs: [
                { key: "ca-init", title: "初始化根 CA", component: "HelpCaInit" },
                { key: "ca-intermediate", title: "签发中间 CA", component: "HelpCaIntermediate" },
                { key: "cert-issue", title: "签发证书", component: "HelpCertIssue" },
            ],
            activeDoc: "ca-init",
        };
    },
    computed: {
        currentDoc() {
            return this.docs.find((d) => d.key === this.activeDoc) || this.docs[0];
        },
    },
    watch: {
        // 支持从其它页面带 ?doc=xxx 跳转
        "$route.query.doc": {
            immediate: true,
            handler(v) {
                if (v && this.docs.some((d) => d.key === v)) {
                    this.activeDoc = v;
                }
            },
        },
    },
    methods: {
        onSelect(key) {
            this.activeDoc = key;
            // 同步到 URL，便于分享/刷新保持
            this.$router.replace({ path: "/help", query: { doc: key } });
        },
    },
};
</script>

<style scoped>
.help-page {
    display: flex;
    height: 100%;
    gap: 16px;
    box-sizing: border-box;
}

.help-sidebar {
    width: 220px;
    flex: none;
    background: #fff;
    border-radius: 8px;
    border: 1px solid var(--el-border-color-lighter, #ebeef5);
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.help-title {
    padding: 14px 16px;
    font-weight: 600;
    color: #303133;
    border-bottom: 1px solid var(--el-border-color-lighter, #ebeef5);
}

.help-menu {
    border-right: none;
    flex: 1;
}

.help-content {
    flex: 1;
    min-width: 0;
    overflow: auto;
    background: #fff;
    border-radius: 8px;
    border: 1px solid var(--el-border-color-lighter, #ebeef5);
    padding: 16px 20px;
    box-sizing: border-box;
}
</style>
