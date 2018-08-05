<template>
    <b-container>
        <b-tabs pills vertical @input="refreshData">
            <b-tab v-for="week in weeks" :title="getTitle(week)" :key="week">
                <b-table :items="scoreboard"></b-table>
            </b-tab>
        </b-tabs>
    </b-container>
</template>

<script>
    export default {
        data() {
            return {
                weeks: [],
                scoreboard: []
            }
        },
        created() {
            this.$http.get('/api/weeks').then((response) => {
                this.weeks = response.data.map(d => d.week);
                this.weeks.unshift('Total');
            }).catch(err => {
                console.error(err);
            });
        },
        methods: {
            getTitle: function (week) {
                return week == 'Total' ? week : `Week ${week}`;
            },
            refreshData: function (index) {
                if (index != null) {
                    let week = this.weeks[index];

                    let params = week != 'Total' ? { week: week } : {};
                    this.$http.get('/api/scoreboard', params).then((response) => {
                        this.scoreboard = response.data.scoreboard;
                        let userRow = this.scoreboard.find(s => s.username == response.data.username);
                        if (userRow){
                            userRow._rowVariant = 'info';
                        }
                    });
                }
            }
        }
    }
</script>

<style lang="scss">
</style>