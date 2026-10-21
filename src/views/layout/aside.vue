<template>
    <el-aside class="aside" width="200px">
        <p style="text-align: center">PKI 证书管理</p>
        <el-scrollbar class="menu-wrap">
            <el-menu :default-active="activePath" unique-opened router>
                <!-- CA 管理 -->
                <el-sub-menu index="ca">
                    <template #title>
                        <el-icon><OfficeBuilding /></el-icon>
                        <span>CA 管理</span>
                    </template>
                    <el-menu-item index="/ca/list">CA 列表</el-menu-item>
                    <el-menu-item index="/ca/init">初始化根 CA</el-menu-item>
                    <el-menu-item index="/ca/intermediate">签发中间 CA</el-menu-item>
                    <el-menu-item index="/ca/import">导入 CA</el-menu-item>
                </el-sub-menu>

                <!-- 证书列表（首页） -->
                <el-menu-item index="/cert/list">
                    <el-icon><Document /></el-icon>
                    <template #title><span>证书列表</span></template>
                </el-menu-item>

                <!-- 签发末端证书 -->
                <el-menu-item index="/cert/issue">
                    <el-icon><CirclePlus /></el-icon>
                    <template #title><span>签发证书</span></template>
                </el-menu-item>

                <!-- CRL 下载 -->
                <el-menu-item index="/crl">
                    <el-icon><Download /></el-icon>
                    <template #title><span>CRL 下载</span></template>
                </el-menu-item>
            </el-menu>
        </el-scrollbar>
    </el-aside>
</template>

<script>
import { Document, CirclePlus, OfficeBuilding, Download } from "@element-plus/icons-vue";

export default {
    name: "AppAside",
    components: { Document, CirclePlus, OfficeBuilding, Download },
    data() {
        return {
            // 兼容老的 $globalBus 通知方式（可选）
            busActivePath: "",
        };
    },
    computed: {
        activePath() {
            const path = this.$route.path || this.busActivePath || "/cert/list";
            if (path.startsWith("/cert/detail")) return "/cert/list";
            return path;
        },
    },
    created() {
        // 保留旧的 globalBus 支持（页面若还在 emit，也能用）
        this.$globalBus?.on?.("updateActivePath", (data) => {
            this.busActivePath = data || "";
        });
    },
    beforeUnmount() {
        // 防止内存泄漏（如果 globalBus 提供 off）
        this.$globalBus?.off?.("updateActivePath");
    },
};
</script>
<style scoped>
.el-aside {
    /* 处理菜单右边的阴影 */
    background-color: #ffffff;
    .el-menu {
        border-right: none;
    }
}
</style>
