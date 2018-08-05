<template>
    <b-container>
        <b-tabs pills vertical @input="refreshData">
            <b-tab v-for="week in weeks" :title="getTitle(week)" :key="week">
                <b-table :items="responses"></b-table>
            </b-tab>
        </b-tabs>
    </b-container>
</template>

<script>
    export default {
        data() {
            return {
                username: "",
                weeks: [],
                responses: []
            }
        },
        created() {
            this.$http.get('/api/weeks').then((response) => {
                this.weeks = response.data.map(d => d.week);
            }).catch(err => {
                console.error(err);
            });
        },
        methods: {
            getTitle: function (week) {
                return `Week ${week}`;
            },
            refreshData: function (index) {
                if (index != null) {
                    let week = this.weeks[index];

                    this.$http.get('/api/scoreboard', {
                        week: week
                    }).then((response) => {
                        this.responses = response.data;
                    });
                }
            }
        }
    }
</script>

<style lang="scss">
</style>