<template>
    <div>
        <autocomplete :items="[ 'Apple', 'Banana', 'Orange', 'Mango', 'Pear', 'Peach', 'Grape', 'Tangerine', 'Pineapple']" @selection="onItemChanged"></autocomplete>
    </div>
</template>

<script>
    import Autocomplete from './Autocomplete';

    export default {
        props: ['challenge'],
        data() {
            return {
            }
        },
        methods: {
            onItemChanged: function (item) {
                console.log(item);
            }
        },
        components: {
            'autocomplete': Autocomplete
        }
    }
</script>

<style lang="scss">
</style>