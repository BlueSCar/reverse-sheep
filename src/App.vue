<template>
  <div id="app">
    <navigation></navigation>
    <div id='page'>
      <router-view></router-view>
    </div>
  </div>
</template>
<script>
  import Navigation from "./components/Navigation.vue";
  export default {
    components: {
      Navigation
    }
  };
</script>
<style>
  html {
    height: 100%;
  }

  body {
    position: relative;
    display: table;
    width: 100%;
    height: 100%;
    background: url("./assets/bg_chess.jpg") no-repeat center center fixed;
    -moz-background-size: cover;
    -o-background-size: cover;
    background-size: cover;
  }

  #app {
    background: rgb(233, 236, 239);
    /* This is for ie8 and below */
    background: rgba(233, 236, 239, 0.9);
    height: 100%;
    width: 100%;
    display: table-cell;
    text-align: center;
  }

  #page {
    width: 100%;
    height: auto;
  }
</style>