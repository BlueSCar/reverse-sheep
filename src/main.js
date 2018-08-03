import Vue from 'vue';

import BootstrapVue from 'bootstrap-vue';
import "bootstrap/dist/css/bootstrap.min.css"
import "bootstrap-vue/dist/bootstrap-vue.css";

import axios from 'axios';
axios.defaults.baseURL = `${process.env.PROTOCOL}://${process.env.HOST}`;
Vue.prototype.$http = axios;

import App from './App.vue'
import {
    createRouter
} from './router/router.js'

Vue.use(BootstrapVue);

export function createApp() {
    const router = createRouter();

    const app = new Vue({
        router,
        render: h => h(App)
    });

    return {
        app,
        router
    };
}