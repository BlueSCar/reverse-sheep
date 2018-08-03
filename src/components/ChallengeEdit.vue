<template>
    <div>
        <vue-simple-suggest :list="challenge.responses" v-model="challenge.userResponse" display-attribute="text"></vue-simple-suggest>
    </div>
</template>

<script>
    export default {
        props: ['challenge'],
        methods: {
            getLabel: function(item) {
                return item.text;
            }
        }
    }
</script>

<style lang="scss">
</style>