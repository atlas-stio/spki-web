// Core Vue framework API
import { createApp } from "vue";

import "element-plus/dist/index.css";
import "./styles/normalize.css";
import "./styles/index.less";

import router from "./router";

import App from "./App.vue";

// Permission utility for custom v-action directive
import { checkActionPerm } from "./utils/permission";

const app = createApp(App);

app.directive("action", {
    created(el) {
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
    },

    async mounted(el, binding) {
        const actionCode = binding.value;
        if (!actionCode) {
            el.remove();
            return;
        }

        const hasPermission = await checkActionPerm(actionCode);
        if (hasPermission) {
            el.style.opacity = "";
            el.style.pointerEvents = "";
        } else {
            el.remove();
        }
    },
});

app.use(router);
app.mount("#app");
