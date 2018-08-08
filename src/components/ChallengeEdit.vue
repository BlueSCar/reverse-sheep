<template>
    <b-row class='challenge-edit'>
        <b-col lg='8' md='12'>
            <p class='text-left'>{{challenge.text}}</p>
        </b-col>
        <b-col lg='4' md='12'>
            <autocomplete :initialSelected="challenge.userResponse.id" :initialDisplay="challenge.userResponse.text" :items="challenge.responses"
                displayProp="text" valueProp="id" @selection="onItemChanged" isRequired=true></autocomplete>
        </b-col>
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
    .challenge-edit {
        margin-top: 30px;
    }
</style>