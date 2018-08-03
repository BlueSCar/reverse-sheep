// router.js
import Vue from 'vue';
import Router from 'vue-router';
import Home from '../components/Home.vue';
import History from '../components/History.vue';
import Leaderboard from '../components/Leaderboard.vue';

Vue.use(Router);

export function createRouter() {
  return new Router({
    mode: 'history',
    routes: [{
        path: '/',
        component: Home
      },
      {
        path: '/history',
        component: History
      },
      {
        path: '/leaderboard',
        component: Leaderboard
      }
    ]
  });
}