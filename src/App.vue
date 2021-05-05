<template>
  <div id="app">
   indexed DB
   <div v-for="(demo, name) in demos" :key="name">
     <button @click="demo">{{ name }}</button>
   </div>

  </div>
</template>

<script>
import {demos} from './demos.js';

export default {
  name: 'App',
  data() {
    return {
      demos
    }
  }
}
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
