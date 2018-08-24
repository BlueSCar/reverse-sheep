<template>
    <b-container>
        <h3 class='justify-content-center'>
            {{username}}
            <small class="text-muted">User History</small>
        </h3>
        <b-tabs pills vertical @input="refreshData">
            <b-tab v-for="week in weeks" :title="getTitle(week)" :key="week">
                <div v-if='showHistory'>
                    <b-table :items='responses' :fields='fields'></b-table>
                </div>
                <div v-else>
                    <b-alert variant="info" show>No history yet for this week</b-alert>
                </div>
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
                responses: [],
                fields: ['challenge', 'response', 'correct']
            }
        },
        computed: {
            showHistory: function () {
                return this.responses && this.responses.length;
            }
        },
        created() {
            this.$http.get('/api/weeks').then((response) => {
                this.weeks = response.data.map(d => d.week);
            }).then(r => {
                this.$http.get('/api/responses', {
                    params: {
                        week: this.weeks[0]
                    }
                }).then((response) => {
                    this.username = response.data.username;
                    this.responses = response.data.responses;
                });
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

                    this.$http.get('/api/responses', {
                        params: {
                            week: week
                        }
                    }).then((response) => {
                        this.username = response.data.username;
                        this.responses = response.data.responses;
                    });
                }
            }
        }
    }
</script>

<style lang="scss">
</style>
