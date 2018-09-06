<template>
    <b-container>
        <h3 class='justify-content-center'>
            Leaderboard
        </h3>
        <b-tabs pills vertical @input="refreshData">
            <b-tab v-for="week in weeks" :title="getTitle(week)" :key="week">
                <div v-if='showScoreboard' class='text-left'>
                    <b-table :items="scoreboard" :fields="fields"></b-table>
                </div>
                <div v-else>
                    <b-alert variant='info' show>No score data yet</b-alert>
                </div>
            </b-tab>
        </b-tabs>
    </b-container>
</template>

<script>
    export default {
        data() {
            return {
                weeks: [],
                scoreboard: [],
		fields: ['rank', 'username', 'points']
            }
        },
        computed: {
            showScoreboard: function () {
                return this.scoreboard && this.scoreboard.length > 0;
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

                    let params = week != 'Total' ? {
                        week: week
                    } : {};
                    this.$http.get('/api/scoreboard', {
                        params: params
                    }).then((response) => {
                        this.scoreboard = response.data.scoreboard;
                        let userRow = this.scoreboard.find(s => s.username == response.data.username);
                        if (userRow) {
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
