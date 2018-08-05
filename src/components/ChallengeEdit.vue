<template>
    <b-row>
        <b-col></b-col>
        <b-col>
            <h5>{{challenge.text}}</h5>
        </b-col>
        <b-col>
        <autocomplete :initialSelected="challenge.userResponse.id" :initialDisplay="challenge.userResponse.text" :items="challenge.responses"
            displayProp="text" valueProp="id" @selection="onItemChanged" isRequired=true></autocomplete>
        </b-col>
        <b-col class='col'></b-col>
    </b-row>
</template>

<script>
    import Autocomplete from './Autocomplete';

    export default {
        props: ['challenge'],
        data() {
            return {}
        },
        methods: {
            onItemChanged: function (item) {
                this.challenge.userResponse = item;
            }
        },
        components: {
            'autocomplete': Autocomplete
        }
    }
</script>

<style lang="scss">
</style>