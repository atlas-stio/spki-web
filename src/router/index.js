import { createRouter, createWebHashHistory } from "vue-router";

const NotFound = () => import("../views/404/index.vue");

const routes = [
    {
        path: "/",
        component: () => import("../views/layout/index.vue"),
        redirect: "/cert/list",
        children: [
            { path: "ca/list", component: () => import("../views/cert/CaList.vue"), meta: { title: "CA 列表" } },
            { path: "ca/detail/:id", component: () => import("../views/cert/CertDetail.vue"), meta: { title: "证书详情" }, props: true },
            { path: "ca/init", component: () => import("../views/cert/CaInit.vue"), meta: { title: "初始化根 CA" } },
            { path: "ca/intermediate", component: () => import("../views/cert/CaIntermediate.vue"), meta: { title: "签发中间 CA" } },
            { path: "ca/import", component: () => import("../views/cert/CaImport.vue"), meta: { title: "导入 CA" } },
            { path: "cert/issue", component: () => import("../views/cert/CertIssue.vue"), meta: { title: "签发末端证书" } },
            { path: "cert/list", component: () => import("../views/cert/CertList.vue"), meta: { title: "证书列表" } },
            { path: "cert/detail/:id", component: () => import("../views/cert/CertDetail.vue"), meta: { title: "证书详情" }, props: true },
            { path: "crl", component: () => import("../views/cert/Crl.vue"), meta: { title: "CRL 下载" } },
            { path: "/help", name: "HelpPage", component: () => import("../views/help/HelpPage.vue"), meta: { title: "帮助" } },
        ],
    },
    // 404 兜底：必须放最后
    { path: "/:pathMatch(.*)*", component: NotFound, meta: { title: "404 页面未找到" } },
];

const router = createRouter({
    history: createWebHashHistory("/spki/"),
    routes,
});

router.beforeEach((to, from, next) => {
    if (to.meta && to.meta.title) {
        document.title = to.meta.title;
    }
    next();
});

export default router;
