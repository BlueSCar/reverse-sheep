<template>
    <b-container>
        <h3 class='justify-content-center'>
            Aces
        </h3>
        <div v-for="week in weeks" :key="week.week">
            <h5>Week {{week.week}}</h5>
            <div v-for="challenge in week.challenges" :key="challenge.challenge" class='text-left'>
                <h6>{{challenge.challenge}}</h6>
                <ul>
                    <li v-for="ace in challenge.aces" :key="ace.username">{{ace.username}} - {{ace.response}}</li>
                </ul>
            </div>
        </div>
    </b-container>
</template>

<script>
    export default {
        data() {
            return {
                weeks: []
            }
        },
        created() {
            this.$http.get('/api/aces').then((response) => {
                this.weeks = response.data;
            }).catch((err) => {
                console.error(err);
            });
        }
    }
</script>

<style lang="sass">

</style>