// Core Vue framework API
import { createApp } from "vue";
import vueCookies from "vue-cookies";

// Global static style files
import "element-plus/dist/index.css";
import "./styles/normalize.css";
import "./styles/index.less";

// Internal project modules & custom plugins
import router from "./router";
import EventBusPlugin from "./utils/event-bus.js";

// Root application component
import App from "./App.vue";

// Permission utility for custom v-action directive
import { checkActionPerm } from "./utils/permission";

const app = createApp(App);

// ------------- Global custom directive v-action for permission control -------------
app.directive("action", {
    // Created hook: Triggered as soon as element is initialized, hidden instantly (invisible to users)
    created(el) {
        // Use opacity + pointerEvents to retain original layout without flickering, preserve original styles
        el.style.opacity = "0";
        el.style.pointerEvents = "none";
    },

    async mounted(el, binding) {
        const actionCode = binding.value;
        if (!actionCode) {
            el.remove();
            return;
        }

        // Verify current user's operation permission
        const hasPermission = await checkActionPerm(actionCode);

        if (hasPermission) {
            // Restore element visibility if permission is granted
            el.style.opacity = "";
            el.style.pointerEvents = "";
        } else {
            // Remove element directly if no matching permission
            el.remove();
        }
    },
});

// Install third-party & custom plugins
app.use(router);
app.use(EventBusPlugin);
app.use(vueCookies);

// Mount root Vue instance to #app container
app.mount("#app");
